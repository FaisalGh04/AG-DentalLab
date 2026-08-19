import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { ToothItemInput } from "@/lib/validations";

/**
 * SERVER-SIDE rules for the per-tooth treatment plan.
 *
 * Shape rules (1-32, no duplicates, 1-4 entries) are already enforced by
 * toothItemsSchema in src/lib/validations.ts. What lives here is everything
 * that needs the DATABASE: taxonomy membership, the legacy snapshot, and the
 * write itself.
 */

// The rule itself lives in the dependency-free teeth module so the form can
// apply it too; re-exported here because this is where server callers look.
export { deriveLegacyTaxonomy } from "@/lib/teeth";

/** Every distinct category+caseType pair in the plan, deduplicated. */
function distinctPairs(
  toothItems: readonly ToothItemInput[],
): { category: string; caseType: string }[] {
  const seen = new Map<string, { category: string; caseType: string }>();
  for (const item of toothItems) {
    for (const entry of item.entries) {
      seen.set(`${entry.category}::${entry.caseType}`, {
        category: entry.category,
        caseType: entry.caseType,
      });
    }
  }
  return [...seen.values()];
}

/**
 * Check every pair against the ACTIVE taxonomy in ONE query.
 *
 * Deliberately not a loop over isActiveCaseType(): a 32-tooth case can hold 128
 * entries, and per-entry round trips would put the whole plan's latency on the
 * request path for no benefit.
 *
 * Returns the first offending pair, or null when everything is valid.
 */
export async function findInvalidToothEntry(
  toothItems: readonly ToothItemInput[],
): Promise<{ category: string; caseType: string } | null> {
  const pairs = distinctPairs(toothItems);
  if (pairs.length === 0) return null;

  const active = await prisma.caseTypeOption.findMany({
    where: {
      isActive: true,
      OR: pairs.map((p) => ({ category: p.category, name: p.caseType })),
    },
    select: { category: true, name: true },
  });
  const allowed = new Set(active.map((o) => `${o.category}::${o.name}`));
  return pairs.find((p) => !allowed.has(`${p.category}::${p.caseType}`)) ?? null;
}

/**
 * Nested-create payload for `patientCase.create`.
 *
 * Written as a nested create rather than a follow-up insert so the teeth land
 * in the SAME transaction as the case row — a case must never exist for even an
 * instant with a treatment plan that failed to save.
 *
 * `order` is the caller's array order (the sequence the admin built), which is
 * independent of toothNumber and is what the tooth cards render by.
 */
export function toothItemsCreateInput(
  toothItems: readonly ToothItemInput[],
): Prisma.CaseToothItemCreateWithoutCaseInput[] {
  return toothItems.map((item, index) => ({
    toothNumber: item.toothNumber,
    order: index,
    entries: {
      create: item.entries.map((entry, entryIndex) => ({
        category: entry.category,
        caseType: entry.caseType,
        order: entryIndex,
      })),
    },
  }));
}

/**
 * REPLACE a case's whole plan inside an existing transaction.
 *
 * Delete-then-recreate, not a diff. The plan is small (at most 32 rows plus
 * their entries), it is edited as one unit in the dialog, and a diff would have
 * to reconcile reordered entries, moved teeth, and the [caseId, toothNumber]
 * unique constraint — far more code and far more ways to corrupt the plan than
 * this. Entries disappear with their tooth via ON DELETE CASCADE.
 *
 * The caller MUST pass its transaction client so this can never half-apply.
 */
export async function replaceToothItems(
  tx: Prisma.TransactionClient,
  caseId: string,
  toothItems: readonly ToothItemInput[],
): Promise<void> {
  await tx.caseToothItem.deleteMany({ where: { caseId } });
  for (const [index, item] of toothItems.entries()) {
    await tx.caseToothItem.create({
      data: {
        caseId,
        toothNumber: item.toothNumber,
        order: index,
        entries: {
          create: item.entries.map((entry, entryIndex) => ({
            category: entry.category,
            caseType: entry.caseType,
            order: entryIndex,
          })),
        },
      },
    });
  }
}

/** Ordering shared by every read, so the UI order is stable across pages. */
export const TOOTH_ITEM_INCLUDE = {
  orderBy: [{ order: "asc" }, { toothNumber: "asc" }],
  include: {
    entries: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
  },
} satisfies Prisma.PatientCase$toothItemsArgs;
