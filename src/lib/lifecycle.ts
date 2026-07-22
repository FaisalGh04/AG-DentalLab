// Server-side loader for the case lifecycle config (Phase 2 of the case-groups
// migration). Reads the admin-managed CaseStageSet/CaseStage tables and shapes
// them into the exact ProductionCollection[] structure the pure helpers in
// production-templates.ts consume — so the app reads DB-backed groups/stages
// while the helpers stay synchronous.
//
// Ordering is byte-identical to the legacy static config: collections are emitted
// in COLLECTION_ORDER (the group-based reorder is deferred to Phase 4). Falls back
// to the static PRODUCTION_COLLECTIONS when the DB is empty or unreachable, so the
// doctor-facing tracker can never blank out on a DB hiccup.

import { cache } from "react";
import { prisma } from "@/lib/prisma";
import {
  PRODUCTION_COLLECTIONS,
  COLLECTION_ORDER,
  type ProductionCollection,
} from "@/lib/production-templates";

// Stable fallback copy (the static config is deeply readonly `as const`).
const STATIC_FALLBACK: ProductionCollection[] = PRODUCTION_COLLECTIONS.map((c) => ({
  id: c.id,
  en: c.en,
  ar: c.ar,
  stages: c.stages.map((s) => ({ id: s.id, en: s.en, ar: s.ar, steps: [...s.steps] })),
}));

/** Sort key = position in the canonical static order; unknown ids sort last. */
function orderIndex(id: string): number {
  const i = (COLLECTION_ORDER as readonly string[]).indexOf(id);
  return i === -1 ? Number.MAX_SAFE_INTEGER : i;
}

/**
 * The lifecycle config, DB-backed with a static fallback. Wrapped in React
 * `cache()` so a single server render/request loads it once. Per-stage `steps`
 * are intentionally empty — quick-add chips are served separately from
 * StageQuickAddStep; nothing reads `stage.steps` at runtime.
 */
export const getLifecycleConfig = cache(
  async (): Promise<ProductionCollection[]> => {
    try {
      const sets = await prisma.caseStageSet.findMany({
        include: { stages: { orderBy: { order: "asc" } } },
      });
      if (sets.length === 0) return STATIC_FALLBACK;

      const collections: ProductionCollection[] = sets.map((set) => ({
        id: set.id,
        en: set.labelEn,
        ar: set.labelAr,
        stages: set.stages.map((st) => ({
          id: st.stageKey,
          en: st.labelEn,
          ar: st.labelAr,
          steps: [],
        })),
      }));

      collections.sort((a, b) => orderIndex(a.id) - orderIndex(b.id));
      return collections;
    } catch (err) {
      console.error("[lifecycle] DB load failed; using static fallback:", err);
      return STATIC_FALLBACK;
    }
  },
);
