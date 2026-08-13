"use client";

import * as React from "react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
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
  caseCreateSchema,
  caseUpdateSchema,
  type CaseCreateInput,
} from "@/lib/validations";
import { useStaff } from "@/hooks/use-staff";
import { staffDisplayName } from "@/lib/staff-display";
import { isProductionCategory } from "@/lib/case-types";
import { useCaseTaxonomy } from "@/hooks/use-case-taxonomy";
import { useCreateCase, useUpdateCase } from "@/hooks/use-cases";
import { WorkflowSelect } from "@/components/admin/workflow-select";
import { DoctorCombobox } from "@/components/admin/doctor-combobox";
import { useActiveDoctorOptions } from "@/hooks/use-doctors";
import { ConfirmActionDialog } from "@/components/admin/confirm-action-dialog";
import { useConfirmAction } from "@/hooks/use-confirm-action";
import { useLifecycleConfig } from "@/hooks/use-lifecycle";
import {
  getProductionCollection,
  localizedLabel,
} from "@/lib/production-templates";
import { useAdminI18n } from "@/components/i18n/admin-i18n";
import { TrackingIdCopy } from "@/components/case/tracking-id-copy";
import type { AdminCaseDTO } from "@/types/case";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing?: AdminCaseDTO | null;
  onSaved?: (id: string) => void;
}

export function CaseFormDialog({ open, onOpenChange, existing, onSaved }: Props) {
  const { t, locale } = useAdminI18n();
  const isEdit = !!existing;
  // Roster comes from StaffMember (src/lib/staff.ts), not a static const, so the
  // dropdown and the confirmation gate can never drift apart.
  const staff = useStaff();
  const confirmGate = useConfirmAction();
  const doctorOptions = useActiveDoctorOptions();
  const taxonomy = useCaseTaxonomy();
  const { data: config = [] } = useLifecycleConfig();
  const create = useCreateCase();
  const update = useUpdateCase(existing?.id ?? "");
  const pending = create.isPending || update.isPending;
  const [createdTrackingId, setCreatedTrackingId] = React.useState<string | null>(
    null,
  );
  // Est. completion time (HH:mm) is kept in local state and combined with the
  // date on submit. Empty string = no specific time (stored as 00:00 UTC).
  const [estTime, setEstTime] = React.useState("");

  // Edit validates against the UPDATE schema, which has no receivedBy. Using the
  // create schema here would make the required receivedBy block saving any other
  // field on a legacy case whose value is null. The cast is safe: CaseUpdateInput
  // is a partial of the same base, so it validates a strict subset of the fields
  // this form holds.
  const resolver = React.useMemo(
    () =>
      zodResolver(
        isEdit ? caseUpdateSchema : caseCreateSchema,
      ) as Resolver<CaseCreateInput>,
    [isEdit],
  );

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
    resolver,
    defaultValues: {
      category: "",
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
        doctorId: existing.doctorId,
        caseType: existing.caseType,
        category: existing.category,
        collectionId: existing.collectionId,
        // receivedBy is deliberately NOT hydrated as a form value — it is
        // write-once and rendered as read-only text below, never registered.
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
        doctorId: null,
        caseType: "",
        category: "",
        collectionId: null,
        receivedBy: undefined as unknown as CaseCreateInput["receivedBy"],
        estimatedCompletionDate: "",
        notes: "",
      });
      setEstTime("");
    }
  }, [open, existing, reset]);

  async function onSubmit(values: CaseCreateInput) {
    if (!taxonomy.data || taxonomy.isError) {
      toast.error(t("form.taxonomyUnavailable"));
      return;
    }
    // A workflow is required for new production cases and when an edit switches
    // into a production category. Unchanged legacy collection-less cases remain
    // grandfathered so unrelated edits are never blocked.
    if (
      isProductionCategory(values.category) &&
      !values.collectionId &&
      (!isEdit || values.category !== existing?.category)
    ) {
      setError("collectionId", { type: "manual", message: t("form.workflowRequired") });
      return;
    }
    clearErrors("collectionId");

    // Combine the date (yyyy-mm-dd) and time (HH:mm) as a UTC wall-clock so the
    // stored value renders identically for every viewer. No date => null.
    const datePart = values.estimatedCompletionDate?.slice(0, 10);
    const estimatedCompletionDate = datePart
      ? new Date(`${datePart}T${estTime || "00:00"}:00.000Z`).toISOString()
      : null;

    if (isEdit) {
      // receivedBy is write-once: strip it client-side so a PATCH body can
      // never carry it. The route 422s if it does; `rest` is CaseUpdateInput.
      const { receivedBy, ...rest } = values;
      void receivedBy;
      const patch = { ...rest, estimatedCompletionDate };

      // ENTRY POINT 6: changing the workflow from the EDIT dialog is a real
      // lifecycle transition (the server resets the stage), so it is gated —
      // while every other field on this form stays ungated.
      const collectionChanged =
        (values.collectionId ?? null) !== (existing?.collectionId ?? null);

      if (collectionChanged) {
        const target = getProductionCollection(config, values.collectionId);
        confirmGate.request(
          {
            summary: `${t("confirm.workflowTo")}: ${
              target ? localizedLabel(target, locale) : t("confirm.noStage")
            }`,
          },
          async (confirmation) => {
            const res = await update.mutateAsync({ ...patch, confirmation });
            toast.success(t("form.toastUpdated"));
            onOpenChange(false);
            onSaved?.(res.id);
          },
        );
        return;
      }

      try {
        const res = await update.mutateAsync(patch);
        toast.success(t("form.toastUpdated"));
        onOpenChange(false);
        onSaved?.(res.id);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t("form.toastError"));
      }
      return;
    }

    // ENTRY POINT 1: creation is ALWAYS gated.
    confirmGate.request(
      {
        summary: `${t("confirm.createCase")}: ${values.patientFirstName} ${values.patientLastName}`,
      },
      async (confirmation) => {
        const res = await create.mutateAsync({
          ...values,
          estimatedCompletionDate,
          confirmation,
        });
        toast.success(t("form.toastCreated"));
        onOpenChange(false);
        setCreatedTrackingId(res.trackingId);
        onSaved?.(res.id);
      },
    );
  }

  const category = watch("category");
  const collectionId = watch("collectionId");
  const caseType = watch("caseType");
  const receivedBy = watch("receivedBy");
  const doctorName = watch("doctorName");
  const doctorId = watch("doctorId");
  const categories = taxonomy.data?.categories ?? [];
  const selectedCategory = categories.find((item) => item.category === category);
  const availableCaseTypes = selectedCategory?.caseTypes.filter(
    (type) => type.isActive,
  ) ?? [];
  const currentInactiveType =
    isEdit &&
    existing?.category === category &&
    existing.caseType === caseType &&
    !availableCaseTypes.some((type) => type.name === existing.caseType)
      ? existing.caseType
      : null;

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
          <style jsx>{`
            form > :global(.grid) {
              grid-template-columns: minmax(0, 1fr) !important;
            }

            form > :global(.grid) > * {
              min-width: 0;
            }

            form :global(input[type=date]),
            form :global(input[type=time]) {
              min-width: 0;
              max-width: 100%;
            }

            @media (min-width: 800px) {
              form > :global(.grid) {
                grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
              }
            }
          `}</style>

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

          {/* CREATE: one control does both — pick a roster doctor (which also
              links the case) or type a one-off name. EDIT: the name stays a
              plain input so linking can never rewrite the stored snapshot;
              the link is a separate, explicit control below it. */}
          {isEdit ? (
            <>
              <Field label={t("form.doctorName")} error={errors.doctorName?.message}>
                <Input
                  {...register("doctorName")}
                  placeholder={t("form.doctorPlaceholder")}
                />
              </Field>
              <Field label={t("doctorPick.linkLabel")}>
                <Select
                  value={doctorId ?? "__none__"}
                  onValueChange={(v) =>
                    setValue("doctorId", v === "__none__" ? null : v, {
                      shouldDirty: true,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("doctorPick.linkPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      {t("doctorPick.notLinked")}
                    </SelectItem>
                    {(doctorOptions.data ?? []).map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t("doctorPick.linkHint")}
                </p>
              </Field>
            </>
          ) : (
            <Field label={t("form.doctorName")} error={errors.doctorName?.message}>
              <DoctorCombobox
                value={doctorName ?? ""}
                doctorId={doctorId ?? null}
                onChange={(name, id) => {
                  setValue("doctorName", name, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  setValue("doctorId", id, { shouldDirty: true });
                }}
                placeholder={t("form.doctorPlaceholder")}
              />
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("form.category")} error={errors.category?.message}>
              <Select
                value={category ?? ""}
                disabled={taxonomy.isLoading || taxonomy.isError}
                onValueChange={(v) => {
                  setValue("category", v, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  setValue("caseType", "", {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  setValue("collectionId", null, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      taxonomy.isLoading
                        ? t("form.loadingTaxonomy")
                        : taxonomy.isError
                          ? t("form.taxonomyUnavailable")
                          : t("form.selectCategory")
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((item) => (
                    <SelectItem key={item.category} value={item.category}>
                      {locale === "ar" ? item.labelAr : item.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label={t("form.caseType")} error={errors.caseType?.message}>
              <Select
                value={caseType || ""}
                disabled={!category || taxonomy.isLoading || taxonomy.isError}
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
                  {currentInactiveType && (
                    <SelectItem value={currentInactiveType}>
                      {currentInactiveType} ({t("caseTypes.inactive")})
                    </SelectItem>
                  )}
                  {availableCaseTypes.map((type) => (
                    <SelectItem key={type.id} value={type.name}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {taxonomy.isLoading && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("form.loadingTaxonomy")}
            </p>
          )}
          {taxonomy.isError && (
            <div className="flex flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">
                    {t("form.taxonomyUnavailable")}
                  </p>
                  <p className="break-words text-xs text-muted-foreground">
                    {taxonomy.error instanceof Error
                      ? taxonomy.error.message
                      : t("form.toastError")}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => taxonomy.refetch()}
                disabled={taxonomy.isFetching}
                className="shrink-0"
              >
                {taxonomy.isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {t("form.retryTaxonomy")}
              </Button>
            </div>
          )}

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

          {/* Received By — who logged the case in. Set ONCE at creation: in edit
              mode it is plain read-only text, never an input, and contributes
              nothing to the submitted payload. */}
          {isEdit ? (
            <div className="rounded-2xl border border-brand-100 bg-brand-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("form.receivedBy")}
              </p>
              <p className="mt-2 font-medium text-ink">
                {existing?.receivedBy || "—"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("form.receivedByLocked")}
              </p>
            </div>
          ) : (
            <Field label={t("form.receivedBy")} error={errors.receivedBy?.message}>
              <Select
                value={receivedBy ?? ""}
                onValueChange={(v) =>
                  setValue("receivedBy", v as CaseCreateInput["receivedBy"], {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("form.selectReceivedBy")} />
                </SelectTrigger>
                <SelectContent>
                  {/* VALUE is the raw s.name, never the localized label: this
                      selection is stored as PatientCase.receivedBy, a historical
                      snapshot that must not depend on the operator's language. */}
                  {(staff.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.name}>
                      {staffDisplayName(s, t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

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
            <Button
              type="submit"
              variant="gradient"
              disabled={pending || taxonomy.isLoading || taxonomy.isError}
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? t("form.saveChanges") : t("form.createCase")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    {/* Gate for entry points 1 (create) and 6 (edit's workflow change). */}
    <ConfirmActionDialog
      open={confirmGate.open}
      onOpenChange={confirmGate.setOpen}
      intent={confirmGate.intent}
      perform={confirmGate.perform}
    />
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
