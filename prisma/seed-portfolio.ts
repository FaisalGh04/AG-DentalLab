// @ts-nocheck
// HISTORICAL (pre-Phase-C) — references the removed PortfolioFolder enum and the
// dropped portfolio_items.folder column. Kept as a migration record. DO NOT RE-RUN.
/**
 * One-time seed: migrate the original static "Our Work" gallery into the new
 * PortfolioItem / PortfolioImage tables, so nothing is lost when a later phase
 * switches the landing page off the hardcoded gallery.ts + work.cases JSON.
 *
 * The migration derives everything from the CURRENT source of truth in code —
 * it does not re-type the data:
 *   - photos, intrinsic sizes, folder grouping + order → src/lib/gallery.ts
 *     (GALLERY / WORK_FOLDERS)
 *   - bilingual title + description per case → work.cases in en.json / ar.json,
 *     matched by each image's caseIndex.
 *
 * Idempotent: if the portfolio tables already hold rows it does nothing
 * (re-running would duplicate, since ids are generated cuids).
 *
 * NOTE ON `key`: the seeded PortfolioImage.key is the original /public asset
 * path (e.g. "/images/gallery/case-4-...jpeg"), NOT an R2 object key — those
 * files still live in public/. A later phase (public serving path) decides
 * whether to upload them to R2 or serve the static path; until then the key
 * doubles as a directly-renderable path.
 *
 * Run once:  npx tsx prisma/seed-portfolio.ts   (or: npm run db:seed-portfolio)
 */
import { PrismaClient, PortfolioFolder } from "@prisma/client";
import { WORK_FOLDERS, type WorkFolderId } from "../src/lib/gallery";
import en from "../src/lib/i18n/locales/en.json";
import ar from "../src/lib/i18n/locales/ar.json";

const prisma = new PrismaClient();

// Frontend folder id → DB enum value. Every WorkFolderId must be covered.
const FOLDER_ENUM: Record<WorkFolderId, PortfolioFolder> = {
  "zirconia-crowns": PortfolioFolder.ZIRCONIA_CROWNS,
  "zirconia-bridges": PortfolioFolder.ZIRCONIA_BRIDGES,
  veneers: PortfolioFolder.VENEERS,
  pfm: PortfolioFolder.PFM,
  inlay: PortfolioFolder.INLAY,
  onlay: PortfolioFolder.ONLAY,
  pmma: PortfolioFolder.PMMA,
  "implant-solutions": PortfolioFolder.IMPLANT_SOLUTIONS,
};

interface CaseText {
  title: string;
  description: string;
}
const EN_CASES = (en as unknown as { work: { cases: CaseText[] } }).work.cases;
const AR_CASES = (ar as unknown as { work: { cases: CaseText[] } }).work.cases;

async function main() {
  const existing = await prisma.portfolioItem.count();
  if (existing > 0) {
    console.log(`✔ Portfolio already seeded (${existing} items) — skipping.`);
    return;
  }

  let created = 0;
  for (const folder of WORK_FOLDERS) {
    // Empty folders (no photos yet) contribute no items.
    for (let order = 0; order < folder.images.length; order++) {
      const img = folder.images[order]!;
      const enText = EN_CASES[img.caseIndex];
      const arText = AR_CASES[img.caseIndex];
      if (!enText || !arText) {
        throw new Error(
          `Missing caption for caseIndex ${img.caseIndex} (${img.src})`,
        );
      }
      await prisma.portfolioItem.create({
        data: {
          folder: FOLDER_ENUM[folder.id],
          titleEn: enText.title,
          titleAr: arText.title,
          descriptionEn: enText.description,
          descriptionAr: arText.description,
          order,
          images: {
            create: [{ key: img.src, width: img.w, height: img.h, order: 0 }],
          },
        },
      });
      created++;
    }
  }
  console.log(`✔ Seeded ${created} portfolio items from the static gallery.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
