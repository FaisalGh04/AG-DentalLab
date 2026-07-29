"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/fetcher";
import type { StaffOption } from "@/lib/staff";

/**
 * Active staff roster — the single source for both the "Received By" dropdown
 * and the confirmation dialog's staff picker, so the two can never drift.
 *
 * Cached for the session: the roster changes rarely, and both consumers are
 * admin-only screens.
 */
export function useStaff() {
  return useQuery({
    queryKey: ["staff"],
    queryFn: () => apiFetch<StaffOption[]>("/api/admin/staff"),
    staleTime: 5 * 60 * 1000,
  });
}
