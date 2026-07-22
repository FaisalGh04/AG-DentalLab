import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { apiError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { createDownloadUrl } from "@/lib/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// Portfolio images are PUBLIC marketing assets, so — unlike /api/images/[id] —
// this route has no auth and no tracking-id check, and its responses are
// cacheable. Sign for a bit longer than we cache so the redirect target never
// expires before the cache entry does.
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour
const CACHE_SECONDS = 60 * 55; // 55 minutes

/**
 * GET /api/portfolio/images/[id] — resolve a portfolio image to a servable URL
 * and 302-redirect. Static assets (seed /images or dev /uploads paths) redirect
 * to themselves; R2 objects redirect to a short-lived signed GET URL.
 */
export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params;
    const image = await prisma.portfolioImage.findUnique({
      where: { id },
      select: { key: true },
    });
    if (!image) return apiError("Image not found", 404);

    // Static /public asset — redirect to the same-origin path.
    if (image.key.startsWith("/")) {
      const res = NextResponse.redirect(
        new URL(image.key, req.nextUrl.origin),
        302,
      );
      res.headers.set("Cache-Control", `public, max-age=${CACHE_SECONDS}`);
      return res;
    }

    // R2/S3 object — sign a short-lived GET.
    const url = await createDownloadUrl(image.key, SIGNED_URL_TTL_SECONDS);
    const res = NextResponse.redirect(url, 302);
    res.headers.set("Cache-Control", `public, max-age=${CACHE_SECONDS}`);
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
