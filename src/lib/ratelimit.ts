import { Ratelimit } from "@upstash/ratelimit";
import * as Sentry from "@sentry/nextjs";
import { redis } from "./redis";

/**
 * Sliding-window limiters. When Redis is unconfigured we return `null`
 * and the API routes treat that as "allow" (dev fallback).
 */
export const searchRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "1 m"),
      analytics: true,
      prefix: "rl:search",
    })
  : null;

export const authRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "5 m"),
      analytics: true,
      prefix: "rl:auth",
    })
  : null;

export const adminMutationRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, "1 m"),
      analytics: true,
      prefix: "rl:admin",
    })
  : null;

/**
 * Two-factor confirmation attempts (case creation + stage transitions).
 * Deliberately far stricter than adminMutationRatelimit's 60/min: the secrets
 * behind it are short, so throttling — not hash cost — is the real control.
 * Keyed on `staffId + IP` by the caller (src/lib/staff-auth.ts).
 */
export const confirmationRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "15 m"),
      analytics: true,
      prefix: "rl:confirm",
    })
  : null;

/**
 * PUBLIC doctor portal — normal browsing (search, archive toggle). Parity with
 * the single-case tracker.
 */
export const doctorPortalRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "1 m"),
      analytics: true,
      prefix: "rl:docportal",
    })
  : null;

/**
 * FAILED doctor-code lookups only — far stricter, because this is the
 * enumeration signal.
 *
 * A doctor code exposes EVERY case that doctor has, not one, so guessing must
 * cost more than guessing a tracking ID. Charging only MISSES means an attacker
 * sweeping the keyspace is throttled almost immediately, while a real doctor —
 * whose lookups succeed — never touches this budget. A flat limit would have
 * punished both equally.
 */
export const doctorCodeMissRatelimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "15 m"),
      analytics: true,
      prefix: "rl:doccode-miss",
    })
  : null;

// --- Login brute-force protection ----------------------------------

const AUTH_MAX_ATTEMPTS = 5;
const AUTH_WINDOW_MS = 5 * 60 * 1000;

/**
 * Per-process fixed-window fallback. Used ONLY in non-production when Upstash
 * isn't configured, so local/dev still has real login throttling (and it's
 * testable). It is NOT valid across serverless instances, which is exactly why
 * production without Upstash fails closed instead of relying on this.
 */
// Pinned to globalThis so the counter survives dev HMR/module reloads (same
// reason prisma.ts pins its client). In production this path isn't used.
const globalForAuth = globalThis as unknown as {
  __authMemoryHits?: Map<string, { count: number; resetAt: number }>;
};
const memoryHits =
  globalForAuth.__authMemoryHits ??
  new Map<string, { count: number; resetAt: number }>();
if (!globalForAuth.__authMemoryHits) globalForAuth.__authMemoryHits = memoryHits;

function memoryAllow(identifier: string): boolean {
  const now = Date.now();
  const entry = memoryHits.get(identifier);
  if (!entry || entry.resetAt <= now) {
    memoryHits.set(identifier, { count: 1, resetAt: now + AUTH_WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= AUTH_MAX_ATTEMPTS;
}

export type AuthGate = { allowed: boolean; reason?: "throttled" | "unavailable" };

/**
 * Brute-force gate for the login flow. Consumes one attempt for EACH identifier
 * (typically IP + email) and blocks if any is exhausted — so one IP can't spray
 * many accounts and one account can't be hammered across IPs.
 *
 * Fail policy when the distributed limiter is unavailable:
 *   - production  -> FAIL CLOSED (deny). An in-memory limiter is meaningless
 *                    across serverless instances, so we never silently disable
 *                    brute-force protection on the app's most sensitive endpoint.
 *   - development -> per-process in-memory fallback (real throttling locally).
 * A runtime limiter error fails closed in production and warns+allows in dev.
 */
export async function checkAuthRateLimit(
  identifiers: string[],
): Promise<AuthGate> {
  const isProd = process.env.NODE_ENV === "production";

  if (authRatelimit) {
    try {
      for (const id of identifiers) {
        const { success } = await authRatelimit.limit(id);
        if (!success) return { allowed: false, reason: "throttled" };
      }
      return { allowed: true };
    } catch (err) {
      console.error("[auth] login rate limiter error:", err);
      if (isProd) return { allowed: false, reason: "unavailable" };
      console.warn("[auth] allowing login despite limiter error (dev only)");
      return { allowed: true };
    }
  }

  if (isProd) {
    console.error(
      "[auth] Upstash not configured — refusing logins (fail-closed). Set " +
        "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to enable login.",
    );
    return { allowed: false, reason: "unavailable" };
  }

  console.warn(
    "[auth] Upstash not configured — using in-memory login throttle (dev only).",
  );
  for (const id of identifiers) {
    if (!memoryAllow(id)) return { allowed: false, reason: "throttled" };
  }
  return { allowed: true };
}

/**
 * Resolve the client IP from proxy headers.
 *
 * ORDER MATTERS — it is a trust ordering, not a preference.
 *
 * `x-forwarded-for` is APPENDED to, never replaced, by the proxy chain. A
 * client that sends `X-Forwarded-For: 1.2.3.4` reaches the origin as
 * `1.2.3.4, <real client ip>`, so taking `split(",")[0]` returns a value the
 * CLIENT chose. Every caller uses the result as a rate-limit key or as the `ip`
 * recorded on a CaseActionLog, so a spoofable value means both the limiters and
 * the audit trail can be steered by an attacker: rotating one header yields
 * unlimited tracking-ID guesses and unlimited admin login attempts.
 *
 * `cf-connecting-ip` is SET by Cloudflare from the real TCP peer and overwrites
 * anything the client sent, so it cannot be forged through the edge. Production
 * is Railway behind Cloudflare (see docs/deploy.md), so in production this
 * header is always present and always authoritative.
 *
 * The x-forwarded-for / x-real-ip fallbacks remain for local dev and any path
 * that is not proxied by Cloudflare — identical behaviour to before when
 * cf-connecting-ip is absent, so this is strictly additive.
 *
 * CAVEAT: this only holds for traffic that actually passes THROUGH Cloudflare.
 * A request sent straight to the Railway origin host has no cf-connecting-ip
 * and falls back to the spoofable header, so the origin should not be publicly
 * reachable outside the Cloudflare edge.
 */
export function getClientIp(headers: Headers): string {
  return (
    headers.get("cf-connecting-ip")?.trim() ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

/**
 * Enforce a limiter. Returns `{ success, remaining, reset }`.
 *
 * Fail policy when the distributed limiter is unavailable (Redis not configured,
 * or a runtime error talking to Upstash) — same posture as checkAuthRateLimit:
 *   - production  -> FAIL CLOSED (success:false). A rate limit that silently
 *                    disables itself in prod is worse than a brief outage, so we
 *                    deny rather than let unbounded traffic through unthrottled.
 *   - development -> FAIL OPEN (success:true), so local dev works without Upstash.
 * Callers treat success:false as a 429 (see `rateLimited`).
 */
export async function limit(
  limiter: Ratelimit | null,
  identifier: string,
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const isProd = process.env.NODE_ENV === "production";
  // Back off ~60s on the fail-closed path so clients don't hammer every second.
  const denied = { success: false, remaining: 0, reset: Date.now() + 60_000 };
  const allowed = { success: true, remaining: 999, reset: 0 };

  if (!limiter) {
    if (isProd) {
      const msg =
        "[ratelimit] Upstash not configured — denying request (fail-closed). " +
        "Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.";
      console.error(msg);
      // Alert: fail-closed means /track and the admin panel are down until fixed.
      Sentry.captureMessage(msg, "error");
      return denied;
    }
    return allowed;
  }

  try {
    const { success, remaining, reset } = await limiter.limit(identifier);
    return { success, remaining, reset };
  } catch (err) {
    console.error("[ratelimit] limiter error:", err);
    if (isProd) {
      // Alert: same fail-closed outage, but from a live Upstash error mid-flight.
      Sentry.captureException(err, { tags: { area: "ratelimit", failClosed: "true" } });
      return denied;
    }
    console.warn("[ratelimit] allowing request despite limiter error (dev only)");
    return allowed;
  }
}
