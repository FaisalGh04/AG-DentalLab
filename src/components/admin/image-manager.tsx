"use client";

import * as React from "react";
import Image from "next/image";
import { Upload, Trash2, Loader2, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useUploadImage, useDeleteImage } from "@/hooks/use-progress";
import { getStage } from "@/lib/production-templates";
import type { ImageDTO } from "@/types/case";
import {
  MAX_IMAGE_BYTES,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_IMAGE_LABEL,
} from "@/lib/upload-constants";

// Client-side pre-check only (fast feedback); the server enforces the real
// limits at presign + confirm (S-M6).
const MAX_BYTES = MAX_IMAGE_BYTES;
const ACCEPTED = ALLOWED_IMAGE_TYPES as readonly string[];

export function ImageManager({
  caseId,
  images,
  collectionId,
  currentStageId,
}: {
  caseId: string;
  images: ImageDTO[];
  collectionId: string | null;
  currentStageId: string | null;
}) {
  // Uploads are tagged with the case's current stage (null → "General").
  const upload = useUploadImage(caseId, currentStageId);
  const remove = useDeleteImage(caseId);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const currentStageLabel =
    getStage(collectionId, currentStageId)?.stage.en ?? "General";
  const labelForStage = (stageId: string | null) =>
    getStage(collectionId, stageId)?.stage.en ?? "General";

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      if (!ACCEPTED.includes(file.type)) {
        toast.error(`${file.name}: unsupported format (use ${ALLOWED_IMAGE_LABEL})`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name}: exceeds 15MB`);
        continue;
      }
      try {
        await upload.mutateAsync(file);
        toast.success(`${file.name} uploaded`);
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : `Failed to upload ${file.name}`,
        );
      }
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  async function del(id: string) {
    try {
      await remove.mutateAsync(id);
      toast.success("Image removed");
    } catch {
      toast.error("Failed to remove image");
    }
  }

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold text-ink">
            Case Images
          </h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            PNG, JPG, WebP or AVIF - up to 15MB each. New uploads are tagged to
            the current stage:{" "}
            <span className="font-semibold text-brand-700">
              {currentStageLabel}
            </span>
            .
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Button
          variant="default"
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending}
        >
          {upload.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Upload
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.length === 0 && !upload.isPending && (
          <button
            onClick={() => inputRef.current?.click()}
            className="col-span-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-200 bg-brand-50/35 py-12 text-muted-foreground transition-colors hover:border-brand-300 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <ImagePlus className="h-8 w-8" />
            <span className="text-sm font-medium">Click to add images</span>
          </button>
        )}

        {images.map((img) => (
          <div
            key={img.id}
            className="group relative aspect-square overflow-hidden rounded-xl border border-border shadow-inner-glow"
          >
            <Image
              src={img.imageUrl}
              alt={img.caption ?? "Case image"}
              fill
              sizes="(max-width: 640px) 50vw, 200px"
              className="object-cover"
              // Served via the auth'd /api/images proxy → signed URL (S-M3);
              // bypass the Next optimizer so the browser hits the proxy
              // directly (carries the admin cookie, keeps per-IP rate limiting).
              unoptimized
            />
            <div className="absolute inset-0 bg-ink/0 transition-colors group-hover:bg-ink/40" />
            <span className="absolute bottom-2 left-2 rounded-md bg-ink/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
              {labelForStage(img.stageId)}
            </span>
            <Button
              variant="destructive"
              size="icon"
              onClick={() => del(img.id)}
              className="absolute right-2 top-2 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {upload.isPending && (
          <div className="flex aspect-square items-center justify-center rounded-xl border border-brand-200 bg-brand-50/50">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
          </div>
        )}
      </div>
    </Card>
  );
}
