import type { NextRequest } from "next/server";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { portfolioImageMetaSchema } from "@/lib/validations";
import {
  putPortfolioObject,
  sniffImageType,
  isAllowedSniffedType,
  portfolioImageUrl,
} from "@/lib/portfolio-storage";
import { MAX_IMAGE_BYTES, ALLOWED_IMAGE_LABEL } from "@/lib/upload-constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/portfolio/[id]/images — multipart upload of one photo.
 * Fields: `file` (the image), `width`, `height` (client-measured, layout only).
 * The bytes are validated server-side (size + magic-byte type sniff) before
 * being stored (R2 in prod, public/uploads in dev).
 */
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const { id: itemId } = await params;
    const item = await prisma.portfolioItem.findUnique({
      where: { id: itemId },
      select: { id: true },
    });
    if (!item) return apiError("Portfolio item not found", 404);

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return apiError("No file uploaded", 400);

    const { width, height } = portfolioImageMetaSchema.parse({
      width: form.get("width"),
      height: form.get("height"),
    });

    if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
      return apiError(`Image must be under ${MAX_IMAGE_BYTES / (1024 * 1024)}MB.`, 422);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const sniffed = sniffImageType(buffer);
    if (!isAllowedSniffedType(sniffed)) {
      return apiError(`File must be a ${ALLOWED_IMAGE_LABEL} image.`, 415);
    }

    const { key } = await putPortfolioObject({
      buffer,
      contentType: sniffed,
      fileName: file.name || "image",
    });

    // Append to the end of the item's images.
    const order = await prisma.portfolioImage.count({ where: { itemId } });
    const image = await prisma.portfolioImage.create({
      data: { itemId, key, width, height, order },
    });

    return apiOk(
      {
        id: image.id,
        url: portfolioImageUrl(image),
        width: image.width,
        height: image.height,
        order: image.order,
      },
      201,
    );
  } catch (err) {
    return handleApiError(err);
  }
}
