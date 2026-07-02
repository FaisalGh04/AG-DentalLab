import type { NextRequest } from "next/server";
import { apiOk, apiError, handleApiError, rateLimited } from "@/lib/api";
import { getClientIp, limit, searchRatelimit } from "@/lib/ratelimit";
import { searchByPatientName } from "@/lib/case-service";
import { searchSchema } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PUBLIC case tracking. Doctors search by patient full name only.
 * Rate limited per IP. Returns a sanitized DTO with no internal ids.
 */
export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const { success, reset } = await limit(searchRatelimit, `search:${ip}`);
    if (!success) return rateLimited(reset);

    const raw = req.nextUrl.searchParams.get("patientName") ?? "";
    const parsed = searchSchema.safeParse({ patientName: raw });
    if (!parsed.success) {
      return apiError("Enter a valid patient name (min 2 characters)", 422);
    }

    const result = await searchByPatientName(parsed.data.patientName);
    if (!result) {
      return apiError(
        "No case found for that patient name. Please check the spelling or contact the lab.",
        404,
      );
    }

    return apiOk(result);
  } catch (err) {
    return handleApiError(err);
  }
}
