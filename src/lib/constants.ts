import type { CaseStatus } from "@prisma/client";
export { CATEGORY_META, CASE_CATEGORY_ORDER } from "@/lib/case-types";

export const SITE = {
  name: "AG Dental Lab",
  tagline: "Your Partner in Perfect Smiles",
  descriptor: "Digital Dental Laboratory • Established 1994",
  founder: "Abdullatif Ghatasheh",
  phone: "+962 77 788 9946",
  phoneHref: "tel:+962777889946",
  location: "Al-Rabiah, Amman, Jordan",
  instagram: "ag.dentallab",
  instagramHref: "https://instagram.com/ag.dentallab",
  description:
    "AG Dental Lab — a digital dental laboratory delivering precise, reliable zirconia, CAD/CAM restorations, implant solutions and 3D printing since 1994.",
} as const;

export const STATUS_META: Record<
  CaseStatus,
  { label: string; description: string; step: number; color: string }
> = {
  RECEIVED: {
    label: "Received",
    description: "Case reached the lab",
    step: 1,
    color: "#64748b",
  },
  IN_PROGRESS: {
    label: "In Progress",
    description: "Lab started working",
    step: 2,
    color: "#0ea5e9",
  },
  PRODUCTION: {
    label: "Production",
    description: "Production steps underway",
    step: 3,
    color: "#0D9488",
  },
  COMPLETED: {
    label: "Completed",
    description: "Case finished",
    step: 4,
    color: "#16a34a",
  },
};

export const STATUS_ORDER: CaseStatus[] = [
  "RECEIVED",
  "IN_PROGRESS",
  "PRODUCTION",
  "COMPLETED",
];

/** Suggested production steps the admin can one-click add. */
export const SUGGESTED_STEPS = [
  "Digital Scan Completed",
  "Design Started",
  "Design Approved",
  "Milling Started",
  "Zirconia Production",
  "Ceramic Layering",
  "Quality Check",
  "Final Polishing",
] as const;
