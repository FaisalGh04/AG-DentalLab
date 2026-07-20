// Single source of truth for the landing "Our Work" portfolio photos.
//
// The array order is a deliberate reorder of the original case identities and
// is kept in lockstep with the localized `work.cases` arrays in
// en.json/ar.json — `caseIndex` pairs each photo with cases[caseIndex], so the
// captions must stay in this order or images and captions desync.
//
// `tags` maps each photo to the Fixed-Restoration service tags it belongs to,
// keyed by STABLE English ids (FixedTagId) — never the translated labels — so
// the mapping is locale-independent. Implant/other cases carry no fixed tag
// (empty array) and are grouped into folders separately (see WORK_FOLDER_DEFS).

export type FixedTagId =
  | "zirconia-crowns"
  | "zirconia-bridges"
  | "veneers"
  | "pfm"
  | "inlay"
  | "onlay"
  | "pmma";

// Order MUST match the `services.fixed.items` arrays in en.json/ar.json so the
// chip rendered at position i resolves to FIXED_TAG_IDS[i].
export const FIXED_TAG_IDS: readonly FixedTagId[] = [
  "zirconia-crowns",
  "zirconia-bridges",
  "veneers",
  "pfm",
  "inlay",
  "onlay",
  "pmma",
];

export interface GalleryImage {
  src: string;
  // Intrinsic pixel size — lets next/image reserve the box and render the true
  // aspect ratio in the lightbox (the photos aren't all 4:3).
  w: number;
  h: number;
  // Position in the localized `work.cases` caption arrays (index ↔ cases[i]).
  caseIndex: number;
  // Fixed-Restoration tags this photo belongs to (stable ids, not labels).
  tags: FixedTagId[];
}

export const GALLERY: GalleryImage[] = [
  { src: "/images/gallery/case-4-full-arch-implant-prosthesis.jpeg", w: 1447, h: 1087, caseIndex: 0, tags: [] },
  { src: "/images/gallery/case-5-implant-anterior-bridge-gingival-ceramic.jpeg", w: 1280, h: 960, caseIndex: 1, tags: [] },
  { src: "/images/gallery/case-8-anterior-restoration-bisque-stage.jpeg", w: 1280, h: 960, caseIndex: 2, tags: ["zirconia-crowns"] },
  { src: "/images/gallery/case-9-final-clinical-result.jpeg", w: 1280, h: 960, caseIndex: 3, tags: ["zirconia-crowns"] },
  { src: "/images/gallery/case-10-anterior-veneers-final-result.jpeg", w: 1600, h: 970, caseIndex: 4, tags: ["veneers"] },
  { src: "/images/gallery/case-6-anterior-crowns-veneers-master-model.jpeg", w: 1280, h: 960, caseIndex: 5, tags: ["veneers"] },
  { src: "/images/gallery/case-7-full-arch-implant-bridge-side-view.jpeg", w: 1280, h: 960, caseIndex: 6, tags: [] },
  { src: "/images/gallery/case-3-anterior-zirconia-bridge-detail.jpeg", w: 1600, h: 1200, caseIndex: 7, tags: ["zirconia-bridges"] },
  { src: "/images/gallery/case-1-lower-anterior-zirconia-bridge.jpeg", w: 1600, h: 1200, caseIndex: 8, tags: ["zirconia-bridges"] },
  { src: "/images/gallery/case-2-posterior-pfm-crowns.jpeg", w: 1600, h: 1200, caseIndex: 9, tags: ["pfm"] },
];

// Photos tagged with the given Fixed-Restoration tag, in gallery order.
export function imagesForTag(tag: FixedTagId): GalleryImage[] {
  return GALLERY.filter((img) => img.tags.includes(tag));
}

// ---------------------------------------------------------------------------
// Work-section folders
// ---------------------------------------------------------------------------
// The "Our Work" section groups the portfolio into folders. A folder is either
// a Fixed-Restoration tag or the Implant-Solutions group (whose photos carry no
// fixed tag). Folder ids are stable; display names resolve from i18n via
// `labelKey`, so the folders stay fully bilingual.

export type WorkFolderId = FixedTagId | "implant-solutions";

// Case indexes of the Implant-Solutions photos — they have no Fixed-Restoration
// tag (tags: []), so this folder groups them explicitly by index.
// (Gallery order: caseIndex 0 = case-4, 1 = case-5, 6 = case-7.)
const IMPLANT_CASE_INDEXES = [0, 1, 6];

// Localized display-name key per Fixed-Restoration folder.
const FIXED_FOLDER_LABEL_KEYS: Record<FixedTagId, string> = {
  "zirconia-crowns": "work.folders.zirconiaCrowns",
  "zirconia-bridges": "work.folders.zirconiaBridges",
  veneers: "work.folders.veneers",
  pfm: "work.folders.pfm",
  inlay: "work.folders.inlay",
  onlay: "work.folders.onlay",
  pmma: "work.folders.pmma",
};

export interface WorkFolder {
  id: WorkFolderId;
  labelKey: string;
  images: GalleryImage[];
}

// All Work-section folders, in display order: every Fixed-Restoration tag (in
// services.fixed.items order via FIXED_TAG_IDS) followed by Implant Solutions.
// Folders with no photos yet (Inlay, Onlay, PMMA) are INCLUDED — they
// render as empty folders that open an empty-state modal, not hidden. Locale-
// independent (labelKey resolves at render), so it's computed once at load.
export const WORK_FOLDERS: WorkFolder[] = [
  ...FIXED_TAG_IDS.map((id) => ({
    id,
    labelKey: FIXED_FOLDER_LABEL_KEYS[id],
    images: imagesForTag(id),
  })),
  {
    id: "implant-solutions" as const,
    labelKey: "services.implant.title",
    images: GALLERY.filter((img) => IMPLANT_CASE_INDEXES.includes(img.caseIndex)),
  },
];
