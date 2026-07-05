import type { NextRequest } from "next/server";
import { apiOk, apiError, handleApiError, rateLimited } from "@/lib/api";
import { getClientIp, limit, searchRatelimit } from "@/lib/ratelimit";
import { searchByTrackingId } from "@/lib/case-service";
import { searchSchema } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PUBLIC case tracking. Doctors search by tracking ID only.
 * Rate limited per IP. Returns a sanitized DTO with no internal ids.
 */
export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const { success, reset } = await limit(searchRatelimit, `search:${ip}`);
    if (!success) return rateLimited(reset);

    const raw = req.nextUrl.searchParams.get("trackingId") ?? "";
    const parsed = searchSchema.safeParse({ trackingId: raw });
    if (!parsed.success) {
      return apiError("Enter a valid tracking ID, for example AG-8F3K2A", 422);
    }

    const result = await searchByTrackingId(parsed.data.trackingId);
    if (!result) {
      return apiError(
        "No case found for that tracking ID. Please check the ID or contact the lab.",
        404,
      );
    }

    return apiOk(result);
  } catch (err) {
    return handleApiError(err);
  }
}
