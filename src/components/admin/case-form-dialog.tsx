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
  caseUpdateSchema,
  toothItemsSchema,
  type CaseCreateInput,
} from "@/lib/validations";
import { useSession } from "next-auth/react";
import { isProductionCategory } from "@/lib/case-types";
import { useCaseTaxonomy } from "@/hooks/use-case-taxonomy";
import { ToothChartSelector } from "@/components/admin/tooth-chart-selector";
import {
  ToothTreatmentEditor,
  mergeToothSelection,
  type ToothItemDraft,
} from "@/components/admin/tooth-treatment-editor";
import { deriveLegacyTaxonomy } from "@/lib/teeth";
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
  // Received By is the SIGNED-IN ADMIN, shown read-only. This is display only —
  // the server derives the stored value from the session itself and ignores
  // anything the client sends (src/app/api/admin/cases/route.ts), so editing
  // this in DevTools changes nothing. Mirrors the admin layout's fallback:
  // name, then email.
  const { data: session } = useSession();
  const adminDisplayName =
    session?.user?.name?.trim() || session?.user?.email?.trim() || "";
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
  /**
   * The per-tooth plan being edited. Local state rather than an RHF field —
   * see the resolver note above. Submitted as `toothItems`; the SERVER derives
   * the stored category/caseType from it and ignores anything else we send.
   */
  const [toothItems, setToothItems] = React.useState<ToothItemDraft[]>([]);
  const [toothSelectorOpen, setToothSelectorOpen] = React.useState(false);
  const [toothError, setToothError] = React.useState<string | null>(null);

  /**
   * Patient/doctor/date fields only. The TAXONOMY is deliberately not RHF's job
   * any more: it now lives in the tooth plan, whose failures are per-tooth and
   * need their own message rather than a nested `toothItems.0.entries.1.category`
   * error nobody can act on. validateToothPlan() below owns that, and the server
   * re-checks the same toothItemsSchema regardless.
   *
   * caseUpdateSchema (a partial of the shared base) is used for both modes: the
   * required patient fields still validate because the form always supplies
   * them, and receivedBy is on neither schema.
   */
  const resolver = React.useMemo(
    () => zodResolver(caseUpdateSchema) as Resolver<CaseCreateInput>,
    [],
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
    // NO category/caseType. They are no longer form fields — the server derives
    // them from the tooth plan — and seeding them as "" made the schema reject
    // the empty strings with an error that had no field left to render it,
    // silently blocking submit.
    defaultValues: {
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
        collectionId: existing.collectionId,
        // receivedBy is deliberately NOT hydrated as a form value — it is
        // write-once and rendered as read-only text below, never registered.
        estimatedCompletionDate: existing.estimatedCompletionDate
          ? existing.estimatedCompletionDate.slice(0, 10)
          : "",
        notes: existing.notes ?? "",
      });
      setEstTime(extractUtcTime(existing.estimatedCompletionDate));
      // Legacy cases hydrate to an EMPTY plan, not a fabricated one. Their
      // category/caseType is shown as a read-only notice instead, and stays
      // untouched unless the admin actually builds a plan.
      setToothItems(
        existing.toothItems.map((item) => ({
          toothNumber: item.toothNumber,
          entries: item.entries.map((entry) => ({
            category: entry.category,
            caseType: entry.caseType,
          })),
        })),
      );
      setToothError(null);
    } else if (open && !existing) {
      reset({
        patientFirstName: "",
        patientLastName: "",
        doctorName: "",
        doctorId: null,
        collectionId: null,
        estimatedCompletionDate: "",
        notes: "",
      });
      setEstTime("");
      setToothItems([]);
      setToothError(null);
    }
  }, [open, existing, reset]);

  /**
   * Every rule the tooth plan promises, with a message an admin can act on.
   * Returns the validated plan, or null when it should block the save.
   *
   * `null` is ALSO the legitimate answer for a legacy case the admin did not
   * convert — see the isLegacyUntouched branch.
   */
  function validateToothPlan(): { ok: boolean; items: ToothItemDraft[] | null } {
    const hadPlan = (existing?.toothItems.length ?? 0) > 0;
    // A legacy case being edited without touching the teeth: send no plan at
    // all, which the PATCH route reads as "leave it alone". Blocking here would
    // make every pre-existing case uneditable.
    if (toothItems.length === 0 && isEdit && !hadPlan) {
      return { ok: true, items: null };
    }
    if (toothItems.length === 0) {
      setToothError(t("tooth.selectAtLeastOneTooth"));
      return { ok: false, items: null };
    }
    const incomplete = toothItems.some(
      (item) =>
        item.entries.length === 0 ||
        item.entries.some((e) => !e.category || !e.caseType),
    );
    if (incomplete) {
      setToothError(t("tooth.eachToothNeedsCaseType"));
      return { ok: false, items: null };
    }
    // Backstop against anything the per-field checks above missed; the server
    // runs this exact schema again.
    if (!toothItemsSchema.safeParse(toothItems).success) {
      setToothError(t("tooth.eachToothNeedsCaseType"));
      return { ok: false, items: null };
    }
    setToothError(null);
    return { ok: true, items: toothItems };
  }

  async function onSubmit(values: CaseCreateInput) {
    if (!taxonomy.data || taxonomy.isError) {
      toast.error(t("form.taxonomyUnavailable"));
      return;
    }

    const plan = validateToothPlan();
    if (!plan.ok) return;
    // Same rule the server applies, so the workflow check below and the stored
    // row agree about which category this case is filed under.
    const derived = plan.items ? deriveLegacyTaxonomy(plan.items) : null;
    const effectiveCategory = derived?.category ?? existing?.category ?? "";
    // A workflow is required for new production cases and when an edit switches
    // into a production category. Unchanged legacy collection-less cases remain
    // grandfathered so unrelated edits are never blocked.
    if (
      isProductionCategory(effectiveCategory) &&
      !values.collectionId &&
      (!isEdit || effectiveCategory !== existing?.category)
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
      // No receivedBy to strip any more — it is on neither schema, so `values`
      // cannot carry it. The PATCH route still 422s on one, as a backstop
      // against a hand-crafted body.
      // category/caseType are stripped: when a plan is present the server
      // derives them, and sending our own would be a second source of truth.
      const { category: _c, caseType: _ct, ...rest } = values;
      const patch = {
        ...rest,
        estimatedCompletionDate,
        ...(plan.items ? { toothItems: plan.items } : {}),
      };

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
        const { category: _c, caseType: _ct, ...rest } = values;
        const res = await create.mutateAsync({
          ...rest,
          estimatedCompletionDate,
          ...(plan.items ? { toothItems: plan.items } : {}),
          confirmation,
        });
        toast.success(t("form.toastCreated"));
        onOpenChange(false);
        setCreatedTrackingId(res.trackingId);
        onSaved?.(res.id);
      },
    );
  }

  const collectionId = watch("collectionId");
  const doctorName = watch("doctorName");
  const doctorId = watch("doctorId");
  /**
   * Category the case is filed under, by the SAME rule the server uses. Drives
   * the workflow picker, which only applies to production categories.
   * Falls back to the stored value while a legacy case has no plan yet.
   */
  const derivedCategory =
    deriveLegacyTaxonomy(toothItems)?.category ?? existing?.category ?? "";
  // A pre-existing case that has no per-tooth plan. Its recorded category and
  // case type are shown read-only so an edit can never look like it erased them.
  const isLegacyCase = isEdit && (existing?.toothItems.length ?? 0) === 0;
  const categories = taxonomy.data?.categories ?? [];

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

          {/* TEETH + TREATMENTS — replaces the single Category/Case Type pair.
              The chart commits only on Confirm, so the cards below always
              reflect a deliberate selection. */}
          <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-3 sm:p-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">
                  {t("tooth.sectionTitle")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("tooth.sectionHint")}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="ms-auto shrink-0"
                disabled={taxonomy.isLoading || taxonomy.isError}
                onClick={() => setToothSelectorOpen(true)}
              >
                {toothItems.length > 0
                  ? t("tooth.editTeeth")
                  : t("tooth.selectTeeth")}
              </Button>
            </div>

            {isLegacyCase && (
              <div className="rounded-xl border border-dashed border-border bg-card p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("tooth.legacyTitle")}
                </p>
                <p className="mt-1 text-sm font-medium text-ink">
                  {t("tooth.legacyPair", {
                    category:
                      categories.find((c) => c.category === existing?.category)
                        ?.[locale === "ar" ? "labelAr" : "labelEn"] ??
                      existing?.category ??
                      "",
                    caseType: existing?.caseType ?? "",
                  })}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("tooth.legacyBody")}
                </p>
              </div>
            )}

            {toothItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("tooth.noneSelected")}
              </p>
            ) : (
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("tooth.selectedCount", { count: toothItems.length })}
              </p>
            )}

            <ToothTreatmentEditor
              items={toothItems}
              onChange={(next) => {
                setToothItems(next);
                setToothError(null);
              }}
              taxonomy={taxonomy.data}
              disabled={pending}
              error={toothError ?? undefined}
            />
            {toothItems.length === 0 && toothError && (
              <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {toothError}
              </p>
            )}
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
            category={derivedCategory}
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

          {/* Received By — who logged the case in. Never editable in either
              mode: on CREATE it is the signed-in admin (derived server-side, so
              this control is purely informational and is not registered with
              the form), and on EDIT it is the stored snapshot. Neither
              contributes anything to the submitted payload. */}
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
            <Field label={t("form.receivedBy")}>
              <Input
                value={adminDisplayName}
                readOnly
                disabled
                aria-readonly="true"
                // No name/register: this input is display-only and must never
                // appear in the form payload.
              />
              <p className="text-xs text-muted-foreground">
                {t("form.receivedByAuto")}
              </p>
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
    {/* Commits only on Confirm; Cancel and X discard. Teeth already on the
        form keep their entries on re-open — mergeToothSelection only adds and
        removes, it never rebuilds. */}
    <ToothChartSelector
      open={toothSelectorOpen}
      onOpenChange={setToothSelectorOpen}
      value={toothItems.map((item) => item.toothNumber)}
      onConfirm={(teeth) => {
        setToothItems((prev) => mergeToothSelection(prev, teeth));
        setToothError(null);
      }}
    />
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
