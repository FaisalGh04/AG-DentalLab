import type { CaseCategory } from "@prisma/client";

/**
 * Categories that represent in-house restorative production and therefore
 * require a workflow on new cases. This is business behavior, not editable
 * display taxonomy. Category labels and case-type choices live in the database.
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
