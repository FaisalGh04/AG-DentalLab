// Storage for the PUBLIC "Our Work" portfolio images. Deliberately separate
// from the private patient-image pipeline (src/lib/s3.ts + /api/images/[id]):
// portfolio photos are public marketing assets, so they are served openly and
// cached, never signed-per-request behind auth.
//
// Two backends, chosen automatically:
//   - PRODUCTION (S3/R2 configured): upload bytes to the bucket under a
//     `portfolio/` prefix; the object is served via the public
//     /api/portfolio/images/[id] route (short-lived signed GET, cacheable).
//   - DEV (no S3 configured): write bytes to public/uploads/portfolio/ and
//     return a directly-servable /public path. Lets the whole flow be tested
//     locally with no object storage.
//
// The stored `key` therefore has three shapes, all handled by the helpers here:
//   - "/images/gallery/..."   → committed seed asset (never uploaded/deleted)
//   - "/uploads/portfolio/..." → dev filesystem upload (served statically)
//   - "portfolio/<uuid>-..."   → R2/S3 object key (served + signed via the route)

import crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3, STORAGE_ENABLED, deleteObject as deleteS3Object } from "@/lib/s3";
import {
  ALLOWED_IMAGE_TYPES,
  type AllowedImageType,
} from "@/lib/upload-constants";

const PUBLIC_DIR = path.join(process.cwd(), "public");
// Relative to public/ (dev) and used as the R2 key prefix (prod).
const PORTFOLIO_SUBDIR = "uploads/portfolio";
const R2_PREFIX = "portfolio";

function safeName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
}

/**
 * Sniff the real image type from the file's magic bytes — never trust the
 * client-declared content type. Returns null for anything not on the raster
 * allowlist (SVG and non-images are rejected, same policy as patient images).
 */
export function sniffImageType(buf: Buffer): AllowedImageType | null {
  if (buf.length < 12) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)
    return "image/png";
  const ascii = (start: number, end: number) => buf.toString("ascii", start, end);
  // WebP: "RIFF"...."WEBP"
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  // AVIF: ISO-BMFF "ftyp" box with an AVIF brand
  if (ascii(4, 8) === "ftyp") {
    const brand = ascii(8, 12);
    if (brand === "avif" || brand === "avis") return "image/avif";
  }
  return null;
}

export function isAllowedSniffedType(
  type: string | null,
): type is AllowedImageType {
  return (
    type !== null && (ALLOWED_IMAGE_TYPES as readonly string[]).includes(type)
  );
}

/**
 * Persist a portfolio image's bytes and return its storage key.
 *   - prod: PUT to R2 under `portfolio/<uuid>-<name>`; key = that object key.
 *   - dev:  write to public/uploads/portfolio/<uuid>-<name>; key = the /public
 *           path ("/uploads/portfolio/<uuid>-<name>").
 */
export async function putPortfolioObject(params: {
  buffer: Buffer;
  contentType: string;
  fileName: string;
}): Promise<{ key: string }> {
  const name = `${crypto.randomUUID()}-${safeName(params.fileName)}`;

  if (STORAGE_ENABLED && s3) {
    const key = `${R2_PREFIX}/${name}`;
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: params.buffer,
        ContentType: params.contentType,
      }),
    );
    return { key };
  }

  // Dev filesystem fallback — served statically by Next from /public.
  const dir = path.join(PUBLIC_DIR, PORTFOLIO_SUBDIR);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), params.buffer);
  return { key: `/${PORTFOLIO_SUBDIR}/${name}` };
}

/**
 * Remove a portfolio image's stored bytes. Seed assets under /images are
 * committed to the repo and left untouched; dev uploads under /uploads are
 * unlinked; R2 object keys are deleted from the bucket. Best-effort — a missing
 * object never throws (the DB row is the source of truth for existence).
 */
export async function deletePortfolioObject(key: string): Promise<void> {
  if (key.startsWith("/images/")) return; // committed seed asset — keep it
  if (key.startsWith("/")) {
    // Dev filesystem upload under public/.
    await fs.unlink(path.join(PUBLIC_DIR, key)).catch(() => {});
    return;
  }
  // R2/S3 object key.
  await deleteS3Object(key).catch(() => {});
}

/**
 * Same-origin URL a client renders for a portfolio image.
 *   - static assets (/images seed or /uploads dev) are directly servable → the
 *     key itself is the URL.
 *   - R2 objects go through the public, cacheable serving route which signs a
 *     short-lived GET.
 */
export function portfolioImageUrl(image: { id: string; key: string }): string {
  if (image.key.startsWith("/")) return image.key;
  return `/api/portfolio/images/${image.id}`;
}
