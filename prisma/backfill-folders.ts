// @ts-nocheck
// HISTORICAL (pre-Phase-C) — references the removed PortfolioFolder enum and the
// dropped portfolio_items.folder column. Kept as a migration record. DO NOT RE-RUN.
/**
 * Phase A backfill: seed the 8 portfolio_folders rows from the current enum +
 * i18n labels, then set folder_id on every existing PortfolioItem by matching
 * its enum value. Run ONCE after the additive migration `20260721150000_add_folder_model`.
 *
 * Everything is derived from the existing sources of truth — nothing is re-typed:
 *   - folder set + display order → PORTFOLIO_FOLDER_ORDER
 *   - enum → label i18n key      → PORTFOLIO_FOLDER_LABEL_KEY
 *   - EN/AR label text           → work.folders.* / services.implant.title in
 *                                  en.json / ar.json (seed defaults only; the DB
 *                                  becomes the source of truth afterwards)
 *
 * Idempotent:
 *   - a folder is created only if no row with the same EN+AR label exists yet
 *   - items are updated only where folder_id IS NULL
 * Re-running is a no-op once complete.
 *
 * Does NOT touch the enum column, make folder_id required, or delete anything.
 *
 * Run once:  npx tsx prisma/backfill-folders.ts   (or: npm run db:backfill-folders)
 */
import { PrismaClient, type PortfolioFolder } from "@prisma/client";
import {
  PORTFOLIO_FOLDER_ORDER,
  PORTFOLIO_FOLDER_LABEL_KEY,
} from "../src/lib/portfolio-folders";
import en from "../src/lib/i18n/locales/en.json";
import ar from "../src/lib/i18n/locales/ar.json";

const prisma = new PrismaClient();

/** Resolve a dotted i18n key (e.g. "work.folders.veneers") to its string value. */
function resolve(dict: unknown, dottedKey: string): string | undefined {
  const val = dottedKey
    .split(".")
    .reduce<unknown>(
      (o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined),
      dict,
    );
  return typeof val === "string" ? val : undefined;
}

async function main() {
  // 1. Ensure the 8 folder rows exist, in PORTFOLIO_FOLDER_ORDER, and remember
  //    which folder id each enum value maps to (for the item backfill).
  const enumToFolderId = new Map<PortfolioFolder, string>();

  for (let i = 0; i < PORTFOLIO_FOLDER_ORDER.length; i++) {
    const enumValue = PORTFOLIO_FOLDER_ORDER[i]!;
    const key = PORTFOLIO_FOLDER_LABEL_KEY[enumValue];
    const labelEn = resolve(en, key);
    const labelAr = resolve(ar, key);
    if (!labelEn || !labelAr) {
      throw new Error(`Missing i18n label for ${enumValue} (key: ${key})`);
    }

    let folder = await prisma.folder.findFirst({ where: { labelEn, labelAr } });
    if (!folder) {
      folder = await prisma.folder.create({
        data: { labelEn, labelAr, order: i },
      });
      console.log(`  + folder[${i}] "${labelEn}" / "${labelAr}"  (${folder.id})`);
    } else {
      console.log(`  = folder[${i}] "${labelEn}" already exists (${folder.id})`);
    }
    enumToFolderId.set(enumValue, folder.id);
  }

  // 2. Backfill folder_id on every item, matched by its enum value. Only rows
  //    with folder_id still NULL are touched, so this is safe to re-run.
  let backfilled = 0;
  for (const [enumValue, folderId] of enumToFolderId) {
    const res = await prisma.portfolioItem.updateMany({
      where: { folder: enumValue, folderId: null },
      data: { folderId },
    });
    if (res.count > 0) console.log(`  → ${enumValue}: linked ${res.count} item(s)`);
    backfilled += res.count;
  }

  // 3. Report any items still unlinked (should be zero).
  const stillNull = await prisma.portfolioItem.count({ where: { folderId: null } });

  console.log(
    `\n✔ Folders ensured: ${enumToFolderId.size}. Items backfilled this run: ${backfilled}. Items still unlinked: ${stillNull}.`,
  );
  if (stillNull > 0) {
    throw new Error(
      `${stillNull} portfolio item(s) have no folder_id after backfill — investigate before proceeding.`,
    );
  }
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
