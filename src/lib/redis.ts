import { Redis } from "@upstash/redis";

function isConfiguredUpstashUrl(value: string | undefined) {
  if (!value) return false;
  if (value.includes("[") || value.includes("]")) return false;

  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && !!parsed.hostname;
  } catch {
    return false;
  }
}

function isConfiguredUpstashToken(value: string | undefined) {
  if (!value) return false;
  if (value.includes("[") || value.includes("]")) return false;
  return true;
}

/**
 * Upstash Redis client. If env vars are missing (e.g. local dev without
 * Redis) we fall back to `null` and callers degrade gracefully.
 */
export const redis =
  isConfiguredUpstashUrl(process.env.UPSTASH_REDIS_REST_URL) &&
  isConfiguredUpstashToken(process.env.UPSTASH_REDIS_REST_TOKEN)
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

/**
 * Cache helper with graceful degradation. Reads through to `loader`
 * on miss (or when Redis is unavailable) and writes back with a TTL.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  if (!redis) return loader();

  try {
    const hit = await redis.get<T>(key);
    if (hit !== null && hit !== undefined) return hit;
  } catch {
    // Redis hiccup — never block the request path.
    return loader();
  }

  const value = await loader();
  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch {
    /* ignore write failures */
  }
  return value;
}

/** Invalidate one or more cache keys (best effort). */
export async function invalidate(...keys: string[]) {
  if (!redis || keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch {
    /* ignore */
  }
}
