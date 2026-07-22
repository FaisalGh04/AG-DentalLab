"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, ApiError } from "@/lib/fetcher";
import type {
  PortfolioImageDTO,
  PortfolioItemDTO,
  PortfolioListResponse,
  FolderDTO,
  FolderListResponse,
} from "@/types/portfolio";
import type {
  PortfolioItemCreateInput,
  PortfolioItemUpdateInput,
  FolderCreateInput,
  FolderUpdateInput,
} from "@/lib/validations";

const KEY = ["portfolio"];
const FOLDERS_KEY = ["portfolio-folders"];

export function usePortfolioList() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => apiFetch<PortfolioListResponse>("/api/admin/portfolio"),
  });
}

/** The DB-backed folder list (id + bilingual labels), in display order. */
export function useFolders() {
  return useQuery({
    queryKey: FOLDERS_KEY,
    queryFn: () => apiFetch<FolderListResponse>("/api/admin/folders"),
  });
}

// Folder labels appear in item grouping too, so folder mutations invalidate both
// the folder list and the portfolio item list.
function invalidateFolders(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: FOLDERS_KEY });
  qc.invalidateQueries({ queryKey: KEY });
}

export function useCreateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: FolderCreateInput) =>
      apiFetch<FolderDTO>("/api/admin/folders", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateFolders(qc),
  });
}

export function useUpdateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: FolderUpdateInput }) =>
      apiFetch<FolderDTO>(`/api/admin/folders/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateFolders(qc),
  });
}

export function useDeleteFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string }>(`/api/admin/folders/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => invalidateFolders(qc),
  });
}

export function useCreatePortfolioItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PortfolioItemCreateInput) =>
      apiFetch<PortfolioItemDTO>("/api/admin/portfolio", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdatePortfolioItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: PortfolioItemUpdateInput;
    }) =>
      apiFetch<PortfolioItemDTO>(`/api/admin/portfolio/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeletePortfolioItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string }>(`/api/admin/portfolio/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/**
 * Upload one image to an item. Uses multipart/form-data (not the JSON apiFetch)
 * so the raw file bytes go up; width/height are client-measured for layout.
 */
export function useUploadPortfolioImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      itemId,
      file,
      width,
      height,
    }: {
      itemId: string;
      file: File;
      width: number;
      height: number;
    }): Promise<PortfolioImageDTO> => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("width", String(width));
      fd.append("height", String(height));

      const res = await fetch(`/api/admin/portfolio/${itemId}/images`, {
        method: "POST",
        body: fd,
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) {
        throw new ApiError(
          body?.error ?? `Upload failed (${res.status})`,
          res.status,
          body?.details,
        );
      }
      return body.data as PortfolioImageDTO;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeletePortfolioImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, imageId }: { itemId: string; imageId: string }) =>
      apiFetch<{ id: string }>(
        `/api/admin/portfolio/${itemId}/images/${imageId}`,
        { method: "DELETE" },
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
