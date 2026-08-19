/**
 * TOOTH NUMBERING + ANATOMY — pure data, no imports.
 *
 * Universal Numbering System (the ADA standard used in the US and by this lab):
 * a single run of 1-32 starting at the patient's upper-right third molar,
 * sweeping across the upper arch to the upper-left third molar (16), dropping
 * to the lower-LEFT third molar (17) and sweeping back to the lower-right
 * third molar (32).
 *
 * Deliberately dependency-free so both the server (validation, DTO ordering)
 * and the client (chart rendering) use the SAME definition of what a tooth is.
 * A second, drifting copy of this mapping is exactly the bug this file exists
 * to prevent.
 */

export const FIRST_TOOTH = 1;
export const LAST_TOOTH = 32;

/** Max category+case-type entries allowed on a single tooth. */
export const MAX_ENTRIES_PER_TOOTH = 4;
/** Min entries — a selected tooth with no treatment is meaningless. */
export const MIN_ENTRIES_PER_TOOTH = 1;

export type ToothKind = "molar" | "premolar" | "canine" | "incisor";
export type ArchName = "upper" | "lower";

/** Upper arch, viewer's left to right: 1 → 16. */
export const UPPER_TEETH: readonly number[] = Array.from(
  { length: 16 },
  (_, i) => i + 1,
);

/**
 * Lower arch, viewer's left to right: 32 → 17.
 *
 * REVERSED on purpose. Numbering runs right-to-left along the bottom, so
 * listing 17→32 would mirror the arch and put the lower-left molar underneath
 * the upper-RIGHT one. With this order each column is a true vertical pair:
 * 1 sits above 32, 16 above 17.
 */
export const LOWER_TEETH: readonly number[] = Array.from(
  { length: 16 },
  (_, i) => 32 - i,
);

export function isValidToothNumber(n: number): boolean {
  return Number.isInteger(n) && n >= FIRST_TOOTH && n <= LAST_TOOTH;
}

export function archOf(tooth: number): ArchName {
  return tooth <= 16 ? "upper" : "lower";
}

/**
 * Distance from the midline, 1 (central incisor) to 8 (third molar).
 *
 * Each arch is symmetric about the midline, so folding both halves onto one
 * 1-8 scale gives the tooth's anatomy from its number alone — no 32-entry
 * lookup table to get wrong.
 */
export function positionFromMidline(tooth: number): number {
  if (tooth <= 16) {
    // Upper: 1 and 16 are the third molars, 8 and 9 the central incisors.
    return tooth <= 8 ? 9 - tooth : tooth - 8;
  }
  // Lower: 17 and 32 are the third molars, 24 and 25 the central incisors.
  // Numbering runs right-to-left along this arch, which is why the low half
  // counts DOWN from 24 rather than up from 17.
  return tooth <= 24 ? 25 - tooth : tooth - 24;
}

export function toothKind(tooth: number): ToothKind {
  const p = positionFromMidline(tooth);
  if (p <= 2) return "incisor";
  if (p === 3) return "canine";
  if (p <= 5) return "premolar";
  return "molar";
}

/** Relative crown width by kind — drives both the chart and its hit area. */
export const TOOTH_WIDTH: Record<ToothKind, number> = {
  incisor: 0.84,
  canine: 0.86,
  premolar: 0.92,
  molar: 1.12,
};

/** Relative crown height by kind. Molars are chunky, incisors are tall+thin. */
export const TOOTH_HEIGHT: Record<ToothKind, number> = {
  incisor: 1.0,
  canine: 1.08,
  premolar: 0.94,
  molar: 1.0,
};

/**
 * Sort key putting teeth in anatomical order (1→32) regardless of the order
 * they were clicked in. Used for the summary and the tooth cards so two cases
 * with the same teeth always read the same way.
 */
export function compareTeeth(a: number, b: number): number {
  return a - b;
}

/** Minimal structural shape — avoids dragging the zod types into client code. */
export interface ToothPlanLike {
  toothNumber: number;
  entries: readonly { category: string; caseType: string }[];
}

/**
 * THE legacy snapshot rule, in one place.
 *
 * PatientCase.category / caseType stay a single pair so every existing reader
 * keeps working: the All Cases table, the public tracker, doctor portal cards,
 * and the taxonomy usage counts that gate deleting a case type all read those
 * two columns and know nothing about teeth.
 *
 * The pair is taken from the FIRST entry of the LOWEST-NUMBERED tooth. Lowest
 * rather than first-clicked, so the snapshot is a property of the case and not
 * of the order the admin happened to tap teeth in — re-saving an unchanged plan
 * can therefore never silently change what the All Cases table shows.
 *
 * Lives here, in a dependency-free module, so the server (which is the only
 * authority on the stored value) and the form (which needs the category to know
 * whether a workflow is required) apply the SAME rule.
 */
export function deriveLegacyTaxonomy(
  toothItems: readonly ToothPlanLike[],
): { category: string; caseType: string } | null {
  const ordered = [...toothItems].sort((a, b) =>
    compareTeeth(a.toothNumber, b.toothNumber),
  );
  const first = ordered[0]?.entries[0];
  if (!first || !first.category || !first.caseType) return null;
  return { category: first.category, caseType: first.caseType };
}
