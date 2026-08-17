"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/fetcher";
import type {
  AdminPasswordResetInput,
  OwnerPasswordChangeInput,
} from "@/lib/validations";

const ENDPOINT = "/api/admin/settings/admin-passwords";

export interface AdminAccountDTO {
  id: string;
  name: string | null;
  email: string;
  updatedAt: string;
}

export interface AdminAccountsDTO {
  admins: AdminAccountDTO[];
  /** RENDERING ONLY — the owner route re-derives this from the session. */
  viewerIsOwner: boolean;
  ownerEmail: string;
}

/** Confirmation only — the API never returns password material. */
export interface AdminPasswordResetResultDTO {
  email: string;
  name: string | null;
  changed: boolean;
}

export function useAdminAccounts(enabled = true) {
  return useQuery({
    queryKey: ["admin-accounts"],
    queryFn: () => apiFetch<AdminAccountsDTO>(ENDPOINT),
    enabled,
    staleTime: 0,
    refetchOnMount: "always",
  });
}

export function useResetAdminPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AdminPasswordResetInput) =>
      apiFetch<AdminPasswordResetResultDTO>(ENDPOINT, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    // Refresh updatedAt on the account list.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-accounts"] });
    },
  });
}

export function useChangeOwnerPassword() {
  return useMutation({
    mutationFn: (input: OwnerPasswordChangeInput) =>
      apiFetch<{ changed: boolean; sessionsRemainValid: boolean }>(
        `${ENDPOINT}/owner`,
        { method: "POST", body: JSON.stringify(input) },
      ),
  });
}
