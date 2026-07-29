"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/fetcher";
import type { DoctorDTO } from "@/types/doctor";
import type { DoctorCreateInput, DoctorUpdateInput } from "@/lib/validations";

const KEY = ["doctors"];

export function useDoctors() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => apiFetch<DoctorDTO[]>("/api/admin/doctors"),
  });
}

/**
 * Active doctors as {id, name} only, for the case-form picker.
 *
 * Derived from the same cached roster query (no extra request), but narrowed so
 * the picker never holds portal codes it has no reason to see.
 */
export function useActiveDoctorOptions() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => apiFetch<DoctorDTO[]>("/api/admin/doctors"),
    select: (rows) =>
      rows.filter((d) => d.isActive).map((d) => ({ id: d.id, name: d.name })),
  });
}

export function useCreateDoctor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DoctorCreateInput) =>
      apiFetch<DoctorDTO>("/api/admin/doctors", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateDoctor(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DoctorUpdateInput) =>
      apiFetch<DoctorDTO>(`/api/admin/doctors/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Reissues the code. The old one stops working immediately. */
export function useRotateDoctorCode(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<DoctorDTO>(`/api/admin/doctors/${id}/rotate`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteDoctor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string; unlinkedCases: number }>(`/api/admin/doctors/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["cases"] });
    },
  });
}
