import type { NextRequest } from "next/server";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { portfolioItemUpdateSchema } from "@/lib/validations";
import { portfolioItemInclude, toPortfolioItemDTO } from "@/lib/portfolio-service";
import { deletePortfolioObject } from "@/lib/portfolio-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/admin/portfolio/[id] — edit folder / copy / order. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const { id } = await params;
    const existing = await prisma.portfolioItem.findUnique({ where: { id } });
    if (!existing) return apiError("Portfolio item not found", 404);

    const input = portfolioItemUpdateSchema.parse(await req.json());

    // If the folder changed, validate the target exists for a clean 400.
    if (input.folderId) {
      const folder = await prisma.portfolioFolder.findUnique({
        where: { id: input.folderId },
        select: { id: true },
      });
      if (!folder) return apiError("Folder not found", 400);
    }

    const updated = await prisma.portfolioItem.update({
      where: { id },
      data: input,
      include: portfolioItemInclude,
    });

    return apiOk(toPortfolioItemDTO(updated));
  } catch (err) {
    return handleApiError(err);
  }
}

/** DELETE /api/admin/portfolio/[id] — remove the item, its image rows, and any
 *  uploaded object bytes (seed assets under /images are left in place). */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const { id } = await params;
    const item = await prisma.portfolioItem.findUnique({
      where: { id },
      include: { images: { select: { key: true } } },
    });
    if (!item) return apiError("Portfolio item not found", 404);

    // Best-effort delete of the stored bytes before the DB rows go away.
    await Promise.all(item.images.map((img) => deletePortfolioObject(img.key)));

    // Cascade removes the PortfolioImage rows.
    await prisma.portfolioItem.delete({ where: { id } });

    return apiOk({ id });
  } catch (err) {
    return handleApiError(err);
  }
}
