"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/fetcher";
import type { CaseCategory } from "@prisma/client";
import type { CaseTaxonomyDTO } from "@/types/case-taxonomy";
import type {
  CaseCategoryConfigUpdateInput,
  CaseTypeCreateInput,
  CaseTypeUpdateInput,
} from "@/lib/validations";

const KEY = ["case-taxonomy"];

export function useCaseTaxonomy() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => apiFetch<CaseTaxonomyDTO>("/api/admin/case-taxonomy"),
    // A missing migration or wrong DATABASE_URL will not heal by retrying the
    // same request. Surface the first real API error so the admin can retry
    // deliberately after the local/server configuration is corrected.
    retry: false,
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: KEY });
}

export function useUpdateCaseCategoryConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ category, input }: {
      category: CaseCategory;
      input: CaseCategoryConfigUpdateInput;
    }) => apiFetch(`/api/admin/case-taxonomy/categories/${category}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
    onSuccess: () => invalidate(qc),
  });
}

export function useCreateCaseType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ category, input }: {
      category: CaseCategory;
      input: CaseTypeCreateInput;
    }) => apiFetch(`/api/admin/case-taxonomy/categories/${category}/case-types`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateCaseType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CaseTypeUpdateInput }) =>
      apiFetch(`/api/admin/case-taxonomy/case-types/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteCaseType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/admin/case-taxonomy/case-types/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => invalidate(qc),
  });
}
