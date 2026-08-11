"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/fetcher";
import type {
  ManagerSecretChangeInput,
  StaffCreateInput,
  StaffManagementUnlockInput,
  StaffUpdateInput,
} from "@/lib/validations";
import type {
  ManagedStaffDTO,
  StaffManagementDTO,
  StaffManagementSessionDTO,
} from "@/types/staff-management";

const SESSION_KEY = ["staff-management-session"];
const MANAGEMENT_KEY = ["staff-management"];

export function useStaffManagementSession() {
  return useQuery({
    queryKey: SESSION_KEY,
    queryFn: () =>
      apiFetch<StaffManagementSessionDTO>(
        "/api/admin/staff-management/session",
      ),
    staleTime: 0,
    refetchOnMount: "always",
  });
}

export function useUnlockStaffManagement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: StaffManagementUnlockInput) =>
      apiFetch<StaffManagementSessionDTO>(
        "/api/admin/staff-management/session",
        { method: "POST", body: JSON.stringify(input) },
      ),
    onSuccess: (data) => {
      qc.setQueryData(SESSION_KEY, data);
      qc.invalidateQueries({ queryKey: MANAGEMENT_KEY });
    },
  });
}

export function useLockStaffManagement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<StaffManagementSessionDTO>(
        "/api/admin/staff-management/session",
        { method: "DELETE" },
      ),
    onSuccess: (data) => {
      qc.setQueryData(SESSION_KEY, data);
      qc.removeQueries({ queryKey: MANAGEMENT_KEY });
    },
  });
}

export function useStaffManagement(enabled: boolean) {
  return useQuery({
    queryKey: MANAGEMENT_KEY,
    queryFn: () =>
      apiFetch<StaffManagementDTO>("/api/admin/staff-management"),
    enabled,
  });
}

export function useCreateManagedStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: StaffCreateInput) =>
      apiFetch<ManagedStaffDTO>("/api/admin/staff-management", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MANAGEMENT_KEY });
      qc.invalidateQueries({ queryKey: ["staff"] });
    },
  });
}

export function useUpdateManagedStaff(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: StaffUpdateInput) =>
      apiFetch<ManagedStaffDTO>(`/api/admin/staff-management/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MANAGEMENT_KEY });
      qc.invalidateQueries({ queryKey: ["staff"] });
    },
  });
}

export function useChangeManagerSecret() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ManagerSecretChangeInput) =>
      apiFetch<{ updated: true }>(
        "/api/admin/staff-management/manager-secret",
        { method: "PATCH", body: JSON.stringify(input) },
      ),
    onSuccess: () => {
      qc.setQueryData(SESSION_KEY, { unlocked: false, expiresAt: null });
      qc.removeQueries({ queryKey: MANAGEMENT_KEY });
    },
  });
}
