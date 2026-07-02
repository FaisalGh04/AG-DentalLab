import type { NextRequest } from "next/server";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { uploadRequestSchema } from "@/lib/validations";
import {
  STORAGE_ENABLED,
  buildObjectKey,
  createUploadUrl,
  publicUrlForKey,
} from "@/lib/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/upload — returns a presigned URL so the browser can
 * PUT the image directly to R2/S3, plus the eventual public URL + key.
 */
export async function POST(req: NextRequest) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    if (!STORAGE_ENABLED) {
      return apiError(
        "Object storage is not configured. Set S3_* env variables.",
        503,
      );
    }

    const input = uploadRequestSchema.parse(await req.json());
    const kase = await prisma.patientCase.findUnique({
      where: { id: input.caseId },
      select: { id: true },
    });
    if (!kase) return apiError("Case not found", 404);

    const key = buildObjectKey(input.caseId, input.fileName);
    const uploadUrl = await createUploadUrl({
      key,
      contentType: input.contentType,
    });

    return apiOk({
      uploadUrl,
      key,
      publicUrl: publicUrlForKey(key),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
