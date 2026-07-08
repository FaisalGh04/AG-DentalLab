import { Ratelimit } from "@upstash/ratelimit";
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

/** Resolve the client IP from proxy headers (Vercel / Cloudflare). */
export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

/**
 * Enforce a limiter. Returns `{ success, remaining, reset }`.
 * Fails open when the limiter is null (Redis not configured).
 */
export async function limit(
  limiter: Ratelimit | null,
  identifier: string,
): Promise<{ success: boolean; remaining: number; reset: number }> {
  if (!limiter) return { success: true, remaining: 999, reset: 0 };
  const { success, remaining, reset } = await limiter.limit(identifier);
  return { success, remaining, reset };
}
