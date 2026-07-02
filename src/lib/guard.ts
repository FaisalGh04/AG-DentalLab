import { auth } from "@/auth";
import { apiError } from "./api";
import {
  adminMutationRatelimit,
  getClientIp,
  limit,
} from "./ratelimit";
import { rateLimited } from "./api";

/**
 * Guard an admin API route: requires an authenticated admin session and
 * applies a mutation rate limit. Returns a NextResponse on failure, or
 * `null` when the caller may proceed.
 */
export async function requireAdmin(headers: Headers) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return apiError("Unauthorized", 401);
  }

  const ip = getClientIp(headers);
  const { success, reset } = await limit(adminMutationRatelimit, `admin:${ip}`);
  if (!success) return rateLimited(reset);

  return null;
}
