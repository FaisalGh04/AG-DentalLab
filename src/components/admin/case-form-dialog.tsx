"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
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
import { caseCreateSchema, type CaseCreateInput } from "@/lib/validations";
import { CASE_CATEGORY_ORDER } from "@/lib/constants";
import { getCaseTypesForCategory, isProductionCategory } from "@/lib/case-types";
import { useCreateCase, useUpdateCase } from "@/hooks/use-cases";
import { WorkflowSelect } from "@/components/admin/workflow-select";
import { useAdminI18n } from "@/components/i18n/admin-i18n";
import { TrackingIdCopy } from "@/components/case/tracking-id-copy";
import type { AdminCaseDTO } from "@/types/case";
import type { CaseCategory } from "@prisma/client";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing?: AdminCaseDTO | null;
  onSaved?: (id: string) => void;
}

export function CaseFormDialog({ open, onOpenChange, existing, onSaved }: Props) {
  const { t } = useAdminI18n();
  const isEdit = !!existing;
  const create = useCreateCase();
  const update = useUpdateCase(existing?.id ?? "");
  const pending = create.isPending || update.isPending;
  const [createdTrackingId, setCreatedTrackingId] = React.useState<string | null>(
    null,
  );
  // Est. completion time (HH:mm) is kept in local state and combined with the
  // date on submit. Empty string = no specific time (stored as 00:00 UTC).
  const [estTime, setEstTime] = React.useState("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<CaseCreateInput>({
    resolver: zodResolver(caseCreateSchema),
    defaultValues: {
      category: undefined as unknown as CaseCategory,
      collectionId: null,
    },
  });

  // Hydrate the form when opening in edit mode.
  React.useEffect(() => {
    if (open && existing) {
      reset({
        patientFirstName: existing.patientFirstName,
        patientLastName: existing.patientLastName,
        doctorName: existing.doctorName,
        caseType: existing.caseType,
        category: existing.category,
        collectionId: existing.collectionId,
        estimatedCompletionDate: existing.estimatedCompletionDate
          ? existing.estimatedCompletionDate.slice(0, 10)
          : "",
        notes: existing.notes ?? "",
      });
      setEstTime(extractUtcTime(existing.estimatedCompletionDate));
    } else if (open && !existing) {
      reset({
        patientFirstName: "",
        patientLastName: "",
        doctorName: "",
        caseType: "",
        category: undefined as unknown as CaseCategory,
        collectionId: null,
        estimatedCompletionDate: "",
        notes: "",
      });
      setEstTime("");
    }
  }, [open, existing, reset]);

  async function onSubmit(values: CaseCreateInput) {
    // A workflow is REQUIRED for production categories on NEW cases. On edit we
    // grandfather existing collection-less cases (no hard block).
    if (!isEdit && isProductionCategory(values.category) && !values.collectionId) {
      setError("collectionId", { type: "manual", message: t("form.workflowRequired") });
      return;
    }
    clearErrors("collectionId");

    // Combine the date (yyyy-mm-dd) and time (HH:mm) as a UTC wall-clock so the
    // stored value renders identically for every viewer. No date => null.
    const datePart = values.estimatedCompletionDate?.slice(0, 10);
    const payload = {
      ...values,
      estimatedCompletionDate: datePart
        ? new Date(`${datePart}T${estTime || "00:00"}:00.000Z`).toISOString()
        : null,
    };

    try {
      if (isEdit) {
        const res = await update.mutateAsync(payload);
        toast.success(t("form.toastUpdated"));
        onOpenChange(false);
        onSaved?.(res.id);
        return;
      }

      const res = await create.mutateAsync(payload);
      toast.success(t("form.toastCreated"));
      onOpenChange(false);
      setCreatedTrackingId(res.trackingId);
      onSaved?.(res.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("form.toastError"));
    }
  }

  const category = watch("category");
  const collectionId = watch("collectionId");
  const caseType = watch("caseType");
  const availableCaseTypes = getCaseTypesForCategory(category);

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("form.editTitle") : t("form.newTitle")}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? t("form.editDesc") : t("form.newDesc")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {existing && (
            <div className="rounded-2xl border border-brand-100 bg-brand-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("form.trackingId")}
              </p>
              <TrackingIdCopy trackingId={existing.trackingId} className="mt-2" />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("form.firstName")} error={errors.patientFirstName?.message}>
              <Input {...register("patientFirstName")} placeholder={t("form.firstNamePlaceholder")} />
            </Field>
            <Field label={t("form.lastName")} error={errors.patientLastName?.message}>
              <Input {...register("patientLastName")} placeholder={t("form.lastNamePlaceholder")} />
            </Field>
          </div>

          <Field label={t("form.doctorName")} error={errors.doctorName?.message}>
            <Input {...register("doctorName")} placeholder={t("form.doctorPlaceholder")} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("form.category")} error={errors.category?.message}>
              <Select
                value={category ?? ""}
                onValueChange={(v) => {
                  setValue("category", v as CaseCategory, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  setValue("caseType", "", {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("form.selectCategory")} />
                </SelectTrigger>
                <SelectContent>
                  {CASE_CATEGORY_ORDER.map((c) => (
                    <SelectItem key={c} value={c}>
                      {t(`category.${c}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label={t("form.caseType")} error={errors.caseType?.message}>
              <Select
                value={caseType || ""}
                disabled={!category}
                onValueChange={(v) =>
                  setValue("caseType", v, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      category
                        ? t("form.selectCaseType")
                        : t("form.selectCategoryFirst")
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableCaseTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <WorkflowSelect
            category={category}
            value={collectionId ?? null}
            onChange={(id) =>
              setValue("collectionId", id, { shouldDirty: true, shouldValidate: true })
            }
            error={errors.collectionId?.message}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t("form.estDate")}
              error={errors.estimatedCompletionDate?.message}
            >
              <Input type="date" {...register("estimatedCompletionDate")} />
            </Field>
            <Field label={t("form.estTime")}>
              <Input
                type="time"
                value={estTime}
                onChange={(e) => setEstTime(e.target.value)}
              />
            </Field>
          </div>

          <Field label={t("form.notes")} error={errors.notes?.message}>
            <Textarea
              {...register("notes")}
              placeholder={t("form.notesPlaceholder")}
              rows={3}
            />
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              {t("form.cancel")}
            </Button>
            <Button type="submit" variant="gradient" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? t("form.saveChanges") : t("form.createCase")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <Dialog
      open={!!createdTrackingId}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setCreatedTrackingId(null);
      }}
    >
      <DialogContent className="max-w-md text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <DialogHeader>
          <DialogTitle>{t("form.createdTitle")}</DialogTitle>
          <DialogDescription>{t("form.createdDesc")}</DialogDescription>
        </DialogHeader>
        {createdTrackingId && (
          <div className="rounded-2xl border border-brand-100 bg-brand-50/70 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("form.trackingId")}
            </p>
            <TrackingIdCopy
              trackingId={createdTrackingId}
              className="mt-3 text-sm"
            />
          </div>
        )}
        <DialogFooter>
          <Button type="button" onClick={() => setCreatedTrackingId(null)}>
            {t("form.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

/** Pull the "HH:mm" (UTC) out of a stored ISO date; "" when unset/midnight. */
function extractUtcTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return hh === "00" && mm === "00" ? "" : `${hh}:${mm}`;
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
