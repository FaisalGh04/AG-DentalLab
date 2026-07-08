import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { apiError, handleApiError, rateLimited } from "@/lib/api";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getClientIp, limit, searchRatelimit } from "@/lib/ratelimit";
import { createDownloadUrl } from "@/lib/s3";
import { formatTrackingId } from "@/lib/tracking-id-format";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// Signed URLs live just long enough to render the image, then expire (S-M3).
const SIGNED_URL_TTL_SECONDS = 60 * 10; // 10 minutes

/**
 * GET /api/images/[id] — authorize, then 302-redirect to a short-lived signed
 * URL for the underlying private object. The bucket is NOT public.
 *
 * Two authorization modes:
 *   - PUBLIC (?t=<trackingId>): the tracking id must match THIS image's case —
 *     not merely be valid for some case — so a tracking id for one case can't
 *     read another case's images by guessing image ids.
 *   - ADMIN (no ?t): an authenticated admin session.
 *
 * Rate limited per IP with the SAME limiter as /api/track (20/min), because a
 * public image endpoint is a fresh surface for enumerating image / tracking ids.
 */
export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const ip = getClientIp(req.headers);
    const { success, reset } = await limit(searchRatelimit, `img:${ip}`);
    if (!success) return rateLimited(reset);

    const { id } = await params;
    const image = await prisma.caseImage.findUnique({
      where: { id },
      select: { key: true, case: { select: { trackingId: true } } },
    });
    // Uniform 404 so a caller can't tell "no such image" from "wrong tracking
    // id" — denies an enumeration oracle.
    if (!image) return apiError("Image not found", 404);

    const t = req.nextUrl.searchParams.get("t");
    if (t !== null) {
      // Public path: verify the tracking id belongs to this exact image's case.
      if (formatTrackingId(t) !== image.case.trackingId) {
        return apiError("Image not found", 404);
      }
    } else {
      // Admin path: require an authenticated admin session.
      const session = await auth();
      if (!session?.user || session.user.role !== "admin") {
        return apiError("Unauthorized", 401);
      }
    }

    const url = await createDownloadUrl(image.key, SIGNED_URL_TTL_SECONDS);
    const res = NextResponse.redirect(url, 302);
    // Never let a browser / CDN cache the signed URL past its short lifetime.
    res.headers.set("Cache-Control", "private, no-store");
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
