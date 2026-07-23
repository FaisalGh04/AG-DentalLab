"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/fetcher";
import type { CaseGroupTree } from "@/types/case-groups";
import type {
  CaseGroupCreateInput,
  CaseGroupUpdateInput,
  StageSetCreateInput,
  StageSetUpdateInput,
  CaseStageCreateInput,
  CaseStageUpdateInput,
} from "@/lib/validations";

const TREE_KEY = ["case-groups"];
const LIFECYCLE_KEY = ["lifecycle-config"];

export function useCaseGroupsTree() {
  return useQuery({
    queryKey: TREE_KEY,
    queryFn: () => apiFetch<CaseGroupTree>("/api/admin/case-groups"),
  });
}

// Group/stage edits change the lifecycle config the case forms read, so every
// mutation invalidates both the management tree and the lifecycle config.
function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: TREE_KEY });
  qc.invalidateQueries({ queryKey: LIFECYCLE_KEY });
}

// --- Groups ----------------------------------------------------------
export function useCreateCaseGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CaseGroupCreateInput) =>
      apiFetch("/api/admin/case-groups", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => invalidate(qc),
  });
}
export function useUpdateCaseGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CaseGroupUpdateInput }) =>
      apiFetch(`/api/admin/case-groups/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
    onSuccess: () => invalidate(qc),
  });
}
export function useDeleteCaseGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/admin/case-groups/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidate(qc),
  });
}

// --- Stage-sets ------------------------------------------------------
export function useCreateStageSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, input }: { groupId: string; input: StageSetCreateInput }) =>
      apiFetch(`/api/admin/case-groups/${groupId}/stage-sets`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidate(qc),
  });
}
export function useUpdateStageSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: StageSetUpdateInput }) =>
      apiFetch(`/api/admin/stage-sets/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
    onSuccess: () => invalidate(qc),
  });
}
export function useDeleteStageSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/admin/stage-sets/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidate(qc),
  });
}

// --- Stages ----------------------------------------------------------
export function useCreateStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ stageSetId, input }: { stageSetId: string; input: CaseStageCreateInput }) =>
      apiFetch(`/api/admin/stage-sets/${stageSetId}/stages`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidate(qc),
  });
}
export function useUpdateStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CaseStageUpdateInput }) =>
      apiFetch(`/api/admin/stages/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
    onSuccess: () => invalidate(qc),
  });
}
export function useDeleteStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/admin/stages/${id}`, { method: "DELETE" }),
    onSuccess: () => invalidate(qc),
  });
}
