// Static fallback for the public "Our Work" section. Used ONLY when the
// database is unreachable (outage, missing table) so the landing page never
// renders a blank/zero-work portfolio. A reachable-but-empty database does NOT
// use this — that shows the honest empty state instead (see getPortfolioFolders).
//
// The data is derived from the SAME source of truth the one-time seed used
// (src/lib/gallery.ts + the work.cases arrays in en.json/ar.json), reshaped into
// the exact PortfolioFolderView[] the DB path returns — so the renderer can't
// tell the difference between live and fallback content.

import { WORK_FOLDERS, type WorkFolderId } from "@/lib/gallery";
import {
  PORTFOLIO_FOLDER_ORDER,
  PORTFOLIO_FOLDER_LABEL_KEY,
  type LegacyFolderKey,
} from "@/lib/portfolio-folders";
import type { PortfolioFolderView, PortfolioItemDTO } from "@/types/portfolio";
import en from "@/lib/i18n/locales/en.json";
import ar from "@/lib/i18n/locales/ar.json";

interface CaseText {
  title: string;
  description: string;
}
const EN_CASES = (en as unknown as { work: { cases: CaseText[] } }).work.cases;
const AR_CASES = (ar as unknown as { work: { cases: CaseText[] } }).work.cases;

/** Resolve a dotted i18n key (e.g. "work.folders.veneers") to its string value. */
function resolveLabel(dict: unknown, dottedKey: string): string {
  const val = dottedKey
    .split(".")
    .reduce<unknown>(
      (o, k) =>
        o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined,
      dict,
    );
  return typeof val === "string" ? val : "";
}

// Frontend folder id → stable legacy folder key (used as the fallback's folder id).
const FOLDER_ENUM: Record<WorkFolderId, LegacyFolderKey> = {
  "zirconia-crowns": "ZIRCONIA_CROWNS",
  "zirconia-bridges": "ZIRCONIA_BRIDGES",
  veneers: "VENEERS",
  pfm: "PFM",
  inlay: "INLAY",
  onlay: "ONLAY",
  pmma: "PMMA",
  "implant-solutions": "IMPLANT_SOLUTIONS",
};

// createdAt is required by the DTO but unused by the Work UI — a fixed sentinel
// keeps the fallback deterministic (no clock read).
const SENTINEL_CREATED_AT = "1970-01-01T00:00:00.000Z";

/**
 * The static gallery reshaped into the public folder view. Every folder is
 * represented (empty ones included), in PORTFOLIO_FOLDER_ORDER. Folder `id` is
 * the stable enum string (this is the outage fallback, not real Folder rows);
 * labels resolve from the same i18n keys the DB folders were seeded from. Image
 * `url` is the committed /public asset path — identical to what portfolioImageUrl()
 * yields for a seeded key, so it renders the same as the live DB path.
 */
export function staticPortfolioFolders(): PortfolioFolderView[] {
  const byFolder = new Map<LegacyFolderKey, PortfolioItemDTO[]>();

  for (const f of WORK_FOLDERS) {
    const enumFolder = FOLDER_ENUM[f.id];
    const items: PortfolioItemDTO[] = f.images.map((img, order) => {
      const enText = EN_CASES[img.caseIndex];
      const arText = AR_CASES[img.caseIndex];
      return {
        id: `static-${enumFolder}-${order}`,
        folderId: enumFolder, // synthetic; the fallback keys folders by legacy string
        titleEn: enText?.title ?? "",
        titleAr: arText?.title ?? "",
        descriptionEn: enText?.description ?? "",
        descriptionAr: arText?.description ?? "",
        order,
        createdAt: SENTINEL_CREATED_AT,
        images: [
          {
            id: `static-${enumFolder}-${order}-img`,
            url: img.src,
            width: img.w,
            height: img.h,
            order: 0,
          },
        ],
      };
    });
    byFolder.set(enumFolder, items);
  }

  return PORTFOLIO_FOLDER_ORDER.map((folder) => ({
    id: folder, // stable enum string as the folder id (fallback only)
    labelEn: resolveLabel(en, PORTFOLIO_FOLDER_LABEL_KEY[folder]),
    labelAr: resolveLabel(ar, PORTFOLIO_FOLDER_LABEL_KEY[folder]),
    items: byFolder.get(folder) ?? [],
  }));
}
