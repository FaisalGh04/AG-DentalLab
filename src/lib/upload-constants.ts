// Shared upload policy — single source of truth for the size cap and the image
// content-type allowlist (S-M6). Safe to import from both server (presign +
// confirm) and client (the ImageManager pre-check); intentionally NO aws-sdk or
// other server-only imports here.

/** Max accepted image size: 15MB. */
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

/**
 * Allowed image content types. Raster formats only — SVG is deliberately
 * excluded (inline-script XSS risk), as is every non-image type.
 */
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export function isAllowedImageType(type: string): type is AllowedImageType {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(type);
}

/** Human-readable list for error messages, e.g. "JPEG, PNG, WebP, AVIF". */
export const ALLOWED_IMAGE_LABEL = "JPEG, PNG, WebP, or AVIF";
