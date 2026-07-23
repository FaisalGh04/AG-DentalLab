import type { CaseCategory } from "@prisma/client";

export const CASE_TYPE_GROUPS = [
  {
    category: "IMPLANT",
    label: "Implant",
    caseTypes: [
      "Ivoclar Prime ZSR",
      "Ivoclar Prime ZCR",
      "Ivoclar Prime FZSR",
      "Ivoclar Prime FZCR",
      "Ivoclar Prime PZSR",
      "Ivoclar Prime PZCR",
      "Laser NF SR",
      "Laser NF CR",
      "Laser NF FSR",
      "Laser NF FCR",
      "PMMA SR/CR",
      "PMMA FSR/FCR",
      "G-CAM SR/CR",
      "G-CAM FSR/FCR",
      "Titanium Bar System",
      "Resin Try In SR",
      "Resin Try In CR",
      "Resin Bar SR",
      "ZSR",
      "ZCR",
      "ZIR/CH/SR",
      "ZIR/CH/CR",
      "Custom Abutment",
      "Ni Free Bar",
      "Acrylic NG",
      "Surgical Guides",
      "Zir",
    ],
  },
  {
    category: "C_AND_B",
    label: "C&B",
    caseTypes: [
      "Ivoclar Prime ZiR",
      "Ivoclar Prime PZIR",
      "Laser NF",
      "Acrylic Temporary",
      "Printed Resin",
      "PMMA Milled",
      "G-CAM",
      "Maryland Zirkon Bridge",
      "Maryland Bridge Laser NF W/Cer",
      "ZIR Post Core",
      "Metal Post Core",
      "Metal Try In",
      "Resin Try In",
      "Temp. Printed Resin",
      "ZIR/CH",
      "Laser NICr",
    ],
  },
  {
    category: "PRESSABLE_CERAMIC",
    label: "Pressable Ceramic",
    caseTypes: ["E-max Onlay", "E-max Inlay", "E-max Veneer", "E-max Crown"],
  },
  {
    category: "VACUUM_FORMER",
    label: "Vacuum Former",
    caseTypes: [
      "Night Guard 2mm",
      "Night Guard 1.5mm",
      "Retainer Crystal Plate 1mm",
      "Retainer Crystal Plate 1.5mm",
      "Mouth Guard 3.5mm",
      "Sport Guard 5mm",
      "Bleaching Tray",
      "Hard NG 2mm",
    ],
  },
  {
    category: "SPECIAL_TRAY",
    label: "Special Tray",
    caseTypes: ["Light Cure Plate"],
  },
  {
    category: "RESIN_MODEL",
    label: "Resin Model",
    caseTypes: [
      "1/4 Arch Model",
      "1/2 Arch Model",
      "Full Arch Model",
      "Special Tray",
      "Full Arch Jig Trial",
    ],
  },
  {
    category: "EXTERNAL_LABORATORY_SERVICES",
    label: "External Laboratory Services",
    caseTypes: [
      "Laser NF C&B",
      "Laser NF / Implant",
      "Zirkon Milled",
      "Zirkon C&B",
      "Titanium Bar System",
      "PMMA Temp C&B",
    ],
  },
  {
    category: "DENTAL_EQUIPMENT",
    label: "Dental Equipment",
    caseTypes: [
      "Ivoclar Programat P310 Furnace",
      "Ivoclar Programat EP 3010 Press Furnace",
      "Optical 3D Scanner Vinyl",
      "ASIGA MAX UV 3D Printer",
      "Renfert Tripla Electric Welding Machine",
    ],
  },
  {
    category: "GYPSUM_MODEL",
    label: "Gypsum Model",
    caseTypes: ["Study with Base", "Study without Base"],
  },
  {
    category: "FLEX_DENTURE",
    label: "Flex. Denture",
    caseTypes: ["Full Denture U OR L", "Partial Denture"],
  },
] as const satisfies ReadonlyArray<{
  category: CaseCategory;
  label: string;
  caseTypes: readonly string[];
}>;

export const CASE_CATEGORY_ORDER = CASE_TYPE_GROUPS.map(
  (group) => group.category,
) as CaseCategory[];

export const CATEGORY_META = Object.fromEntries(
  CASE_TYPE_GROUPS.map((group) => [group.category, { label: group.label }]),
) as Record<CaseCategory, { label: string }>;

export const CASE_TYPES_BY_CATEGORY = CASE_TYPE_GROUPS.reduce(
  (acc, group) => {
    acc[group.category] = group.caseTypes;
    return acc;
  },
  {} as Record<CaseCategory, readonly string[]>,
);

export function getCaseTypesForCategory(
  category: CaseCategory | "" | null | undefined,
) {
  return category ? CASE_TYPES_BY_CATEGORY[category] ?? [] : [];
}

export function isValidCaseTypeForCategory(
  category: CaseCategory,
  caseType: string,
) {
  return getCaseTypesForCategory(category).includes(caseType);
}

/**
 * Categories that represent in-house restorative production and therefore REQUIRE
 * a workflow (stage-set) on new cases. The rest are non-production (outsourced
 * services, equipment, study models) — the workflow field is hidden for them.
 * SPECIAL_TRAY / FLEX_DENTURE are fabricated but have no matching workflow group
 * yet; move them here once such groups exist.
 */
export const PRODUCTION_CATEGORIES: readonly CaseCategory[] = [
  "IMPLANT",
  "C_AND_B",
  "PRESSABLE_CERAMIC",
  "VACUUM_FORMER",
];

export function isProductionCategory(
  category: CaseCategory | "" | null | undefined,
): boolean {
  return !!category && PRODUCTION_CATEGORIES.includes(category as CaseCategory);
}
