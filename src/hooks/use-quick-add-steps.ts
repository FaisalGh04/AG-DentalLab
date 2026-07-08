"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/fetcher";
import type {
  QuickAddStepCreateInput,
  QuickAddStepUpdateInput,
} from "@/lib/validations";
import type { QuickAddStepDTO } from "@/types/case";

const KEY = "quick-add-steps";

/** All Quick-Add chips for a collection; the ProgressManager filters by stage. */
export function useQuickAddSteps(collectionId: string | null) {
  return useQuery({
    queryKey: [KEY, collectionId],
    queryFn: () =>
      apiFetch<QuickAddStepDTO[]>(
        `/api/admin/quick-add-steps?collectionId=${encodeURIComponent(
          collectionId ?? "",
        )}`,
      ),
    enabled: !!collectionId,
  });
}

export function useAddQuickAddStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: QuickAddStepCreateInput) =>
      apiFetch<QuickAddStepDTO>("/api/admin/quick-add-steps", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useUpdateQuickAddStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: QuickAddStepUpdateInput;
    }) =>
      apiFetch<QuickAddStepDTO>(`/api/admin/quick-add-steps/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}

export function useDeleteQuickAddStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string }>(`/api/admin/quick-add-steps/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  });
}
