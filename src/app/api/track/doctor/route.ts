import type { NextRequest } from "next/server";
import { apiOk, apiError, handleApiError, rateLimited } from "@/lib/api";
import {
  getClientIp,
  limit,
  doctorPortalRatelimit,
  doctorCodeMissRatelimit,
} from "@/lib/ratelimit";
import { getDoctorPortal } from "@/lib/doctor-portal-service";
import { doctorCodeSchema } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** One message for every failure mode — see the note below. */
const NOT_FOUND =
  "No doctor found for that code. Please check the code or contact the lab.";

/**
 * PUBLIC doctor portal. Returns every case linked to one doctor.
 *
 * SEPARATE ROUTE from /api/track by design: the single-case tracker is
 * untouched by this feature and cannot regress through shared code.
 *
 * Two rate-limit tiers:
 *   1. doctorPortalRatelimit — every request (browsing, searching, archive
 *      toggling), at parity with the tracker.
 *   2. doctorCodeMissRatelimit — charged ONLY when a lookup fails. Enumeration
 *      produces misses, so this is what actually throttles an attacker, while a
 *      real doctor's successful lookups never consume it.
 *
 * A malformed code, an unknown code, and a DEACTIVATED doctor all return the
 * SAME 404 message. Distinguishing them would confirm which codes exist, which
 * is exactly what an enumerating attacker wants.
 */
export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);

    const browse = await limit(doctorPortalRatelimit, `docportal:${ip}`);
    if (!browse.success) return rateLimited(browse.reset);

    const raw = req.nextUrl.searchParams.get("code") ?? "";
    const parsed = doctorCodeSchema.safeParse({ code: raw });

    // A shape failure is still a miss: it costs miss budget and returns the
    // same message, so probing with junk is not cheaper than probing with
    // well-formed guesses.
    if (!parsed.success) {
      const miss = await limit(doctorCodeMissRatelimit, `doccode-miss:${ip}`);
      if (!miss.success) return rateLimited(miss.reset);
      return apiError(NOT_FOUND, 404);
    }

    const sp = req.nextUrl.searchParams;
    const result = await getDoctorPortal(parsed.data.code, {
      archived: sp.get("archived") === "true",
      q: sp.get("q") ?? undefined,
    });

    if (!result) {
      const miss = await limit(doctorCodeMissRatelimit, `doccode-miss:${ip}`);
      if (!miss.success) return rateLimited(miss.reset);
      return apiError(NOT_FOUND, 404);
    }

    return apiOk(result);
  } catch (err) {
    return handleApiError(err);
  }
}
