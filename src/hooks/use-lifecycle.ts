"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/fetcher";
import {
  PRODUCTION_COLLECTIONS,
  type ProductionCollection,
} from "@/lib/production-templates";

// Static placeholder = the legacy config. In Phase 2 it's byte-identical to the DB
// config, so admin views render seamlessly while the real config loads (and it's a
// safe stand-in if the request is briefly in flight).
const PLACEHOLDER: ProductionCollection[] = PRODUCTION_COLLECTIONS.map((c) => ({
  id: c.id,
  en: c.en,
  ar: c.ar,
  stages: c.stages.map((s) => ({ id: s.id, en: s.en, ar: s.ar, steps: [...s.steps] })),
}));

/**
 * The DB-backed lifecycle config (collections + stages) for admin client views.
 * Cached with a long staleTime — it only changes when an admin edits groups/stages
 * (Phase 3+), which will invalidate this key.
 */
export function useLifecycleConfig() {
  return useQuery({
    queryKey: ["lifecycle-config"],
    queryFn: () => apiFetch<ProductionCollection[]>("/api/admin/lifecycle"),
    placeholderData: PLACEHOLDER,
    staleTime: 5 * 60 * 1000,
  });
}
