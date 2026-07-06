"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/fetcher";
import type { ProgressCreateInput, ProgressUpdateInput } from "@/lib/validations";
import type { ImageDTO } from "@/types/case";
import type { CaseStatus } from "@prisma/client";

export function useAddProgress(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProgressCreateInput) =>
      apiFetch<{ id: string }>(`/api/admin/cases/${caseId}/progress`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["case", caseId] }),
  });
}

export function useUpdateProgress(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      progressId,
      input,
    }: {
      progressId: string;
      input: ProgressUpdateInput;
    }) =>
      apiFetch<{ id: string }>(
        `/api/admin/cases/${caseId}/progress/${progressId}`,
        { method: "PATCH", body: JSON.stringify(input) },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["case", caseId] }),
  });
}

export function useDeleteProgress(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (progressId: string) =>
      apiFetch<{ id: string }>(
        `/api/admin/cases/${caseId}/progress/${progressId}`,
        { method: "DELETE" },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["case", caseId] }),
  });
}

export function useDeleteImage(caseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (imageId: string) =>
      apiFetch<{ id: string }>(
        `/api/admin/cases/${caseId}/images/${imageId}`,
        { method: "DELETE" },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["case", caseId] }),
  });
}

/**
 * Full image upload flow: request a presigned URL, PUT the file to storage,
 * then attach the resulting URL to the case, tagged with the given lifecycle
 * stage (defaults server-side to the case's current status).
 */
export function useUploadImage(caseId: string, stage?: CaseStatus) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File): Promise<ImageDTO> => {
      const { uploadUrl, key, publicUrl } = await apiFetch<{
        uploadUrl: string;
        key: string;
        publicUrl: string;
      }>("/api/admin/upload", {
        method: "POST",
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          caseId,
        }),
      });

      const put = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) throw new Error("Upload to storage failed");

      return apiFetch<ImageDTO>(`/api/admin/cases/${caseId}/images`, {
        method: "POST",
        body: JSON.stringify({ imageUrl: publicUrl, key, stage }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["case", caseId] }),
  });
}
