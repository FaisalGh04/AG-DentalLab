export { CATEGORY_META, CASE_CATEGORY_ORDER } from "@/lib/case-types";

/**
 * Staff who can be recorded as having logged a case into the system, at intake.
 * NOT who handled production steps — that lives in CaseProgress.
 *
 * Deliberately a plain string column + this list rather than a Postgres enum:
 * these are people, so the set changes with staffing and shouldn't cost a
 * migration. Same shape as caseType (a String validated against case-types.ts).
 * Names are content, not UI chrome — they are NOT translated, so they stay here
 * rather than in the admin locale files.
 */
export const RECEIVED_BY_OPTIONS = [
  "روان",
  "حسام",
  "معتصم",
  "ابو عمر",
  "عبدالله",
] as const;

export type ReceivedBy = (typeof RECEIVED_BY_OPTIONS)[number];

export const SITE = {
  name: "AG Dental Lab",
  tagline: "Your Partner in Perfect Smiles",
  descriptor: "Dental Laboratory • Established 1994",
  founder: "Abdullatif Ghatasheh",
  phone: "+962 77 749 3919",
  phoneHref: "tel:+962777493919",
  location: "Al-Rabiah, Amman, Jordan",
  instagram: "ag.dentallab",
  instagramHref: "https://instagram.com/ag.dentallab",
  description:
    "AG Dental Lab — a dental laboratory combining traditional craftsmanship with digital technology, delivering precise, reliable zirconia, CAD/CAM restorations, implant solutions and 3D printing since 1994.",
} as const;
