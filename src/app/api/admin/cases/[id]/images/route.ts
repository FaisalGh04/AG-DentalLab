import type { NextRequest } from "next/server";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { deleteObject, headObject, imageProxyPath } from "@/lib/s3";
import { imageAttachSchema } from "@/lib/validations";
import {
  MAX_IMAGE_BYTES,
  ALLOWED_IMAGE_LABEL,
  isAllowedImageType,
} from "@/lib/upload-constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** POST — persist an uploaded image's URL against the case. */
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const { id: caseId } = await params;
    const kase = await prisma.patientCase.findUnique({ where: { id: caseId } });
    if (!kase) return apiError("Case not found", 404);

    const body = await req.json();
    const input = imageAttachSchema.parse({ ...body, caseId });

    // Verify the ACTUAL uploaded object against the size/type policy — the
    // presign check only saw client-declared values, so a client that lied at
    // presign is caught here. On any violation, delete the object and reject
    // before writing the DB row (S-M6).
    let meta: { contentType?: string; contentLength?: number };
    try {
      meta = await headObject(input.key);
    } catch {
      return apiError("Uploaded file was not found in storage.", 400);
    }
    const size = meta.contentLength ?? 0;
    const type = meta.contentType ?? "";
    if (size <= 0 || size > MAX_IMAGE_BYTES || !isAllowedImageType(type)) {
      await deleteObject(input.key).catch(() => {});
      return apiError(
        `Uploaded file failed validation — must be a ${ALLOWED_IMAGE_LABEL} image under 15MB.`,
        422,
      );
    }

    const image = await prisma.caseImage.create({
      data: {
        caseId,
        key: input.key,
        caption: input.caption ?? null,
        // Tag with the requested stage, or the case's current stage by default
        // (null when no collection/stage is chosen yet → shown as "General").
        stageId: input.stageId ?? kase.currentStageId,
      },
    });

    return apiOk(
      {
        id: image.id,
        // Admin proxy path (authorized by session) (S-M3).
        imageUrl: imageProxyPath(image.id),
        caption: image.caption,
        stageId: image.stageId,
        createdAt: image.createdAt.toISOString(),
      },
      201,
    );
  } catch (err) {
    return handleApiError(err);
  }
}
