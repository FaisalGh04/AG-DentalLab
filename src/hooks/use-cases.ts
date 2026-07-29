"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { apiFetch } from "@/lib/fetcher";
import type {
  AdminCaseListResponse,
  AdminCaseDTO,
} from "@/types/case";
import type {
  CaseCreateInput,
  CaseUpdateInput,
  ConfirmationInputDTO,
} from "@/lib/validations";

export interface CaseListQuery {
  q?: string;
  category?: string;
  archived?: boolean;
  page?: number;
  pageSize?: number;
}

function toParams(query: CaseListQuery): string {
  const sp = new URLSearchParams();
  if (query.q) sp.set("q", query.q);
  if (query.category && query.category !== "ALL")
    sp.set("category", query.category);
  if (query.archived) sp.set("archived", "true");
  if (query.page) sp.set("page", String(query.page));
  if (query.pageSize) sp.set("pageSize", String(query.pageSize));
  return sp.toString();
}

export function useCaseList(query: CaseListQuery) {
  return useQuery({
    queryKey: ["cases", query],
    queryFn: () =>
      apiFetch<AdminCaseListResponse>(`/api/admin/cases?${toParams(query)}`),
    placeholderData: keepPreviousData,
  });
}

export function useCase(id: string | null) {
  return useQuery({
    queryKey: ["case", id],
    queryFn: () => apiFetch<AdminCaseDTO>(`/api/admin/cases/${id}`),
    enabled: !!id,
  });
}

/**
 * Case creation is ALWAYS gated, so the confirmation payload is required here —
 * the type makes it impossible to call this without one.
 */
export function useCreateCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CaseCreateInput & { confirmation: ConfirmationInputDTO }) =>
      apiFetch<{ id: string; trackingId: string }>("/api/admin/cases", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cases"] }),
  });
}

/**
 * Updates are gated only when they change the lifecycle (the server decides, by
 * diffing). `confirmation` is therefore OPTIONAL: plain field edits omit it and
 * pass through ungated, exactly as before.
 */
export function useUpdateCase(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      input: CaseUpdateInput & { confirmation?: ConfirmationInputDTO },
    ) =>
      apiFetch<{ id: string }>(`/api/admin/cases/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cases"] });
      qc.invalidateQueries({ queryKey: ["case", id] });
    },
  });
}

export function useDeleteCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string }>(`/api/admin/cases/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cases"] }),
  });
}
