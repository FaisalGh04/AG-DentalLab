// Static definition of the ORIGINAL 8 portfolio folders (was the PortfolioFolder
// enum, dropped in Phase C). Retained only for the static outage fallback
// (portfolio-fallback.ts) and the historical one-time migration scripts — the
// live folder set is now the admin-managed portfolio_folders table.

// Stable string key per original folder (formerly the enum values).
export type LegacyFolderKey =
  | "ZIRCONIA_CROWNS"
  | "ZIRCONIA_BRIDGES"
  | "VENEERS"
  | "PFM"
  | "INLAY"
  | "ONLAY"
  | "PMMA"
  | "IMPLANT_SOLUTIONS";

// Display order of the original folders — the seven Fixed-Restoration types in
// services.fixed.items order, then Implant Solutions.
export const PORTFOLIO_FOLDER_ORDER: readonly LegacyFolderKey[] = [
  "ZIRCONIA_CROWNS",
  "ZIRCONIA_BRIDGES",
  "VENEERS",
  "PFM",
  "INLAY",
  "ONLAY",
  "PMMA",
  "IMPLANT_SOLUTIONS",
];

// i18n key per folder for its localized display name. The Fixed types reuse the
// public work.folders.* labels; Implant Solutions reuses services.implant.title.
export const PORTFOLIO_FOLDER_LABEL_KEY: Record<LegacyFolderKey, string> = {
  ZIRCONIA_CROWNS: "work.folders.zirconiaCrowns",
  ZIRCONIA_BRIDGES: "work.folders.zirconiaBridges",
  VENEERS: "work.folders.veneers",
  PFM: "work.folders.pfm",
  INLAY: "work.folders.inlay",
  ONLAY: "work.folders.onlay",
  PMMA: "work.folders.pmma",
  IMPLANT_SOLUTIONS: "services.implant.title",
};
