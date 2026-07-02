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
