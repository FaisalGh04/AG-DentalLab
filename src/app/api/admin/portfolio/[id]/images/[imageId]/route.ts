import type { NextRequest } from "next/server";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { deletePortfolioObject } from "@/lib/portfolio-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; imageId: string }> };

/** DELETE /api/admin/portfolio/[id]/images/[imageId] — remove one photo from an
 *  item, deleting its stored bytes (seed assets under /images are left alone). */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const { id: itemId, imageId } = await params;
    const image = await prisma.portfolioImage.findUnique({
      where: { id: imageId },
      select: { id: true, itemId: true, key: true },
    });
    // 404 unless the image exists AND belongs to the item in the path.
    if (!image || image.itemId !== itemId) {
      return apiError("Image not found", 404);
    }

    await deletePortfolioObject(image.key);
    await prisma.portfolioImage.delete({ where: { id: imageId } });

    return apiOk({ id: imageId });
  } catch (err) {
    return handleApiError(err);
  }
}
