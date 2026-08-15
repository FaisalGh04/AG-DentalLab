import { promises as fs } from "fs";
import path from "path";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { apiError, handleApiError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { sniffImageType } from "@/lib/portfolio-storage";
import { s3 } from "@/lib/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// Portfolio images are PUBLIC marketing assets, so — unlike /api/images/[id] —
// this route has no auth and no tracking-id check. The DB lookup remains the
// allowlist: callers can fetch only objects attached to PortfolioImage rows.
const CACHE_SECONDS = 60 * 60;
const PUBLIC_DIR = path.resolve(process.cwd(), "public");

function imageResponse(
  body: Uint8Array,
  contentType: string,
  metadata?: { etag?: string; lastModified?: Date },
): Response {
  const headers = new Headers({
    "Cache-Control": `public, max-age=${CACHE_SECONDS}, stale-while-revalidate=86400`,
    "Content-Type": contentType,
    "Content-Length": String(body.byteLength),
  });
  if (metadata?.etag) headers.set("ETag", metadata.etag);
  if (metadata?.lastModified) {
    headers.set("Last-Modified", metadata.lastModified.toUTCString());
  }
  return new Response(Uint8Array.from(body).buffer, { status: 200, headers });
}

/**
 * GET /api/portfolio/images/[id] — return portfolio image bytes with their
 * actual media type. Both committed/dev files and R2/S3 objects stay behind
 * this stable, DB-allowlisted URL when it is requested directly.
 */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const image = await prisma.portfolioImage.findUnique({
      where: { id },
      select: { key: true },
    });
    if (!image) return apiError("Image not found", 404);

    if (image.key.startsWith("/")) {
      const filePath = path.resolve(PUBLIC_DIR, image.key.slice(1));
      if (!filePath.startsWith(`${PUBLIC_DIR}${path.sep}`)) {
        return apiError("Image not found", 404);
      }
      try {
        const body = await fs.readFile(filePath);
        return imageResponse(
          body,
          sniffImageType(body) ?? "application/octet-stream",
        );
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") {
          return apiError("Image not found", 404);
        }
        throw err;
      }
    }

    if (!s3) return apiError("Portfolio storage is not configured", 503);

    try {
      const object = await s3.send(
        new GetObjectCommand({
          Bucket: process.env.S3_BUCKET,
          Key: image.key,
        }),
      );
      if (!object.Body) return apiError("Image not found", 404);

      const body = await object.Body.transformToByteArray();
      return imageResponse(
        body,
        object.ContentType ?? "application/octet-stream",
        { etag: object.ETag, lastModified: object.LastModified },
      );
    } catch (err) {
      const status =
        typeof err === "object" && err !== null && "$metadata" in err
          ? (err as { $metadata?: { httpStatusCode?: number } }).$metadata
              ?.httpStatusCode
          : undefined;
      if (status === 404) return apiError("Image not found", 404);
      throw err;
    }
  } catch (err) {
    return handleApiError(err);
  }
}
