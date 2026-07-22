import type { NextRequest } from "next/server";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { portfolioItemCreateSchema } from "@/lib/validations";
import { portfolioItemInclude, toPortfolioItemDTO } from "@/lib/portfolio-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/portfolio — every portfolio item, folder+order sorted. */
export async function GET(req: NextRequest) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const items = await prisma.portfolioItem.findMany({
      orderBy: [{ folderId: "asc" }, { order: "asc" }, { createdAt: "asc" }],
      include: portfolioItemInclude,
    });

    return apiOk({ items: items.map(toPortfolioItemDTO) });
  } catch (err) {
    return handleApiError(err);
  }
}

/** POST /api/admin/portfolio — create an item (images are added separately). */
export async function POST(req: NextRequest) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const input = portfolioItemCreateSchema.parse(await req.json());

    // Validate the folder exists for a clean 400 (the FK would otherwise 500).
    const folder = await prisma.portfolioFolder.findUnique({
      where: { id: input.folderId },
      select: { id: true },
    });
    if (!folder) return apiError("Folder not found", 400);

    // Append to the end of its folder unless an explicit order was given.
    const order =
      input.order ??
      (await prisma.portfolioItem.count({ where: { folderId: folder.id } }));

    const created = await prisma.portfolioItem.create({
      data: {
        folderId: folder.id,
        titleEn: input.titleEn,
        titleAr: input.titleAr,
        descriptionEn: input.descriptionEn,
        descriptionAr: input.descriptionAr,
        order,
      },
      include: portfolioItemInclude,
    });

    return apiOk(toPortfolioItemDTO(created), 201);
  } catch (err) {
    return handleApiError(err);
  }
}
