"use client";

import * as React from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Trash2, ImagePlus, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  portfolioItemCreateSchema,
  type PortfolioItemCreateInput,
} from "@/lib/validations";
import {
  useCreatePortfolioItem,
  useUpdatePortfolioItem,
  useUploadPortfolioImage,
  useDeletePortfolioImage,
  useFolders,
} from "@/hooks/use-portfolio";
import { useAdminI18n } from "@/components/i18n/admin-i18n";
import {
  MAX_IMAGE_BYTES,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_IMAGE_LABEL,
} from "@/lib/upload-constants";
import type { PortfolioItemDTO } from "@/types/portfolio";

const ACCEPTED = ALLOWED_IMAGE_TYPES as readonly string[];

interface PendingImage {
  localId: string;
  file: File;
  width: number;
  height: number;
  previewUrl: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing?: PortfolioItemDTO | null;
}

/** Read an image file's intrinsic pixel size in the browser (layout only). */
function readImageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

export function PortfolioFormDialog({ open, onOpenChange, existing }: Props) {
  const { t, locale } = useAdminI18n();
  const { data: foldersData } = useFolders();
  const folders = foldersData?.folders ?? [];
  const isEdit = !!existing;

  const create = useCreatePortfolioItem();
  const update = useUpdatePortfolioItem();
  const uploadImage = useUploadPortfolioImage();
  const deleteImage = useDeletePortfolioImage();

  const [pending, setPending] = React.useState<PendingImage[]>([]);
  const [busy, setBusy] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PortfolioItemCreateInput>({
    resolver: zodResolver(portfolioItemCreateSchema),
    defaultValues: {
      folderId: "",
      titleEn: "",
      titleAr: "",
      descriptionEn: "",
      descriptionAr: "",
    },
  });

  // Hydrate on open; clear any leftover pending previews.
  React.useEffect(() => {
    if (!open) return;
    setPending((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      return [];
    });
    if (existing) {
      reset({
        folderId: existing.folderId ?? "",
        titleEn: existing.titleEn,
        titleAr: existing.titleAr,
        descriptionEn: existing.descriptionEn,
        descriptionAr: existing.descriptionAr,
      });
    } else {
      reset({
        folderId: "",
        titleEn: "",
        titleAr: "",
        descriptionEn: "",
        descriptionAr: "",
      });
    }
  }, [open, existing, reset]);

  async function addFiles(files: FileList | null) {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (!ACCEPTED.includes(file.type)) {
        toast.error(t("portfolio.toastUnsupported", { name: file.name }));
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error(t("portfolio.toastTooLarge", { name: file.name }));
        continue;
      }
      try {
        const { width, height } = await readImageSize(file);
        setPending((prev) => [
          ...prev,
          {
            localId: crypto.randomUUID(),
            file,
            width,
            height,
            previewUrl: URL.createObjectURL(file),
          },
        ]);
      } catch {
        toast.error(t("portfolio.toastUnsupported", { name: file.name }));
      }
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  function removePending(localId: string) {
    setPending((prev) => {
      const hit = prev.find((p) => p.localId === localId);
      if (hit) URL.revokeObjectURL(hit.previewUrl);
      return prev.filter((p) => p.localId !== localId);
    });
  }

  async function deleteExistingImage(imageId: string) {
    if (!existing) return;
    try {
      await deleteImage.mutateAsync({ itemId: existing.id, imageId });
      toast.success(t("portfolio.toastImageRemoved"));
    } catch {
      toast.error(t("portfolio.toastError"));
    }
  }

  async function onSubmit(values: PortfolioItemCreateInput) {
    setBusy(true);
    try {
      // Save the item first, then upload any queued images to it.
      const itemId = isEdit
        ? (await update.mutateAsync({ id: existing!.id, input: values })).id
        : (await create.mutateAsync(values)).id;

      for (const p of pending) {
        await uploadImage.mutateAsync({
          itemId,
          file: p.file,
          width: p.width,
          height: p.height,
        });
      }

      toast.success(isEdit ? t("portfolio.toastUpdated") : t("portfolio.toastCreated"));
      pending.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("portfolio.toastError"));
    } finally {
      setBusy(false);
    }
  }

  const folderId = watch("folderId");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("portfolio.editTitle") : t("portfolio.newTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? t("portfolio.editDesc") : t("portfolio.newDesc")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label={t("portfolio.folder")} error={errors.folderId?.message}>
            <Select
              value={folderId ?? ""}
              onValueChange={(v) =>
                setValue("folderId", v, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("portfolio.selectFolder")} />
              </SelectTrigger>
              <SelectContent>
                {folders.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {locale === "ar" ? f.labelAr : f.labelEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("portfolio.titleEn")} error={errors.titleEn?.message}>
              <Input {...register("titleEn")} dir="ltr" />
            </Field>
            <Field label={t("portfolio.titleAr")} error={errors.titleAr?.message}>
              <Input {...register("titleAr")} dir="rtl" />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t("portfolio.descriptionEn")}
              error={errors.descriptionEn?.message}
            >
              <Textarea {...register("descriptionEn")} dir="ltr" rows={4} />
            </Field>
            <Field
              label={t("portfolio.descriptionAr")}
              error={errors.descriptionAr?.message}
            >
              <Textarea {...register("descriptionAr")} dir="rtl" rows={4} />
            </Field>
          </div>

          {/* Images */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("portfolio.images")}</Label>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED.join(",")}
                multiple
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
              >
                <ImagePlus className="h-4 w-4" />
                {t("portfolio.addImage")}
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {existing?.images.map((img) => (
                <Thumb key={img.id} src={img.url} onRemove={() => deleteExistingImage(img.id)} />
              ))}
              {pending.map((p) => (
                <Thumb
                  key={p.localId}
                  src={p.previewUrl}
                  pendingLabel={t("portfolio.pending")}
                  onRemove={() => removePending(p.localId)}
                />
              ))}
              {!existing?.images.length && !pending.length && (
                <p className="col-span-full rounded-xl border border-dashed border-brand-200 bg-brand-50/40 py-6 text-center text-sm text-muted-foreground">
                  {t("portfolio.noImages", { formats: ALLOWED_IMAGE_LABEL })}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t("portfolio.cancel")}
            </Button>
            <Button type="submit" variant="gradient" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {isEdit ? t("portfolio.save") : t("portfolio.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Thumb({
  src,
  onRemove,
  pendingLabel,
}: {
  src: string;
  onRemove: () => void;
  pendingLabel?: string;
}) {
  return (
    <div className="group relative aspect-square overflow-hidden rounded-xl border border-border shadow-inner-glow">
      <Image
        src={src}
        alt=""
        fill
        sizes="120px"
        className="object-cover"
        // Admin previews: static /public paths, the same-origin serve route, or
        // blob: URLs — all rendered directly without the Next optimizer.
        unoptimized
      />
      {pendingLabel && (
        <span className="absolute bottom-1 start-1 rounded bg-brand-600/80 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
          {pendingLabel}
        </span>
      )}
      <Button
        type="button"
        variant="destructive"
        size="icon"
        onClick={onRemove}
        className="absolute end-1 top-1 h-7 w-7 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
