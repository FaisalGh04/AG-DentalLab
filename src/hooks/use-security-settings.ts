"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/fetcher";
import type { SecuritySettingUpdateInput } from "@/lib/validations";

export interface SecuritySettingsDTO {
  staffConfirmationEnabled: boolean;
  updatedAt: string | null;
}

export function useSecuritySettings() {
  return useQuery({
    queryKey: ["security-settings"],
    queryFn: () =>
      apiFetch<SecuritySettingsDTO>("/api/admin/settings/security"),
    staleTime: 0,
    refetchOnMount: "always",
  });
}

export function useUpdateSecuritySettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SecuritySettingUpdateInput) =>
      apiFetch<SecuritySettingsDTO>("/api/admin/settings/security", {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["security-settings"], data);
    },
  });
}
