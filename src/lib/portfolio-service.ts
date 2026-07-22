import type { PortfolioImage, PortfolioItem } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { portfolioImageUrl } from "@/lib/portfolio-storage";
import { staticPortfolioFolders } from "@/lib/portfolio-fallback";
import type { PortfolioFolderView, PortfolioItemDTO } from "@/types/portfolio";

type ItemWithImages = PortfolioItem & { images: PortfolioImage[] };

// Prisma include/order shared by every route that returns a portfolio item, so
// images always come back sorted the same way.
export const portfolioItemInclude = {
  images: { orderBy: { order: "asc" as const } },
} as const;

/** Serialize a DB portfolio item (with images) to the client DTO. */
export function toPortfolioItemDTO(item: ItemWithImages): PortfolioItemDTO {
  return {
    id: item.id,
    folderId: item.folderId,
    titleEn: item.titleEn,
    titleAr: item.titleAr,
    descriptionEn: item.descriptionEn,
    descriptionAr: item.descriptionAr,
    order: item.order,
    createdAt: item.createdAt.toISOString(),
    images: item.images.map((img) => ({
      id: img.id,
      url: portfolioImageUrl(img),
      width: img.width,
      height: img.height,
      order: img.order,
    })),
  };
}

/**
 * Server-side data source for the public "Our Work" section. Reads the DB-backed
 * Folder model — every folder (empty ones included) in its `order`, each with
 * its items (items sorted by their own order, then createdAt).
 *
 * Fallback policy (approved):
 *   - DB reachable, has folders → live data.
 *   - DB reachable, zero folders → empty list (section renders nothing extra).
 *   - DB unreachable / query throws → static gallery fallback, so an outage
 *     never renders a blank/zero-work portfolio.
 *
 * Only items that have at least one image are surfaced — an admin-created item
 * with no photo yet isn't a showable case and would render a broken tile.
 */
export async function getPortfolioFolders(): Promise<PortfolioFolderView[]> {
  try {
    const folders = await prisma.portfolioFolder.findMany({
      orderBy: { order: "asc" },
      include: {
        items: {
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
          include: portfolioItemInclude,
        },
      },
    });

    return folders.map((folder) => ({
      id: folder.id,
      labelEn: folder.labelEn,
      labelAr: folder.labelAr,
      items: folder.items
        .map(toPortfolioItemDTO)
        .filter((it) => it.images.length > 0),
    }));
  } catch (err) {
    // Unreachable / missing table → never show a blank section.
    console.error(
      "[portfolio] DB fetch failed; falling back to static gallery:",
      err,
    );
    return staticPortfolioFolders();
  }
}
