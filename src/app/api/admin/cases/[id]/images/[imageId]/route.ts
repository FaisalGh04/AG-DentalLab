import type { NextRequest } from "next/server";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { deleteObject } from "@/lib/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; imageId: string }> };

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const { id: caseId, imageId } = await params;
    const image = await prisma.caseImage.findFirst({
      where: { id: imageId, caseId },
    });
    if (!image) return apiError("Image not found", 404);

    if (image.key) {
      await deleteObject(image.key).catch(() => {});
    }
    await prisma.caseImage.delete({ where: { id: imageId } });

    return apiOk({ id: imageId });
  } catch (err) {
    return handleApiError(err);
  }
}
