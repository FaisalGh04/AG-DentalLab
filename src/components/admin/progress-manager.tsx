"use client";

import * as React from "react";
import {
  Check,
  Circle,
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  Layers,
  Pencil,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useAdminI18n } from "@/components/i18n/admin-i18n";
import {
  useAddProgress,
  useUpdateProgress,
  useDeleteProgress,
} from "@/hooks/use-progress";
import {
  useQuickAddSteps,
  useAddQuickAddStep,
  useUpdateQuickAddStep,
  useDeleteQuickAddStep,
} from "@/hooks/use-quick-add-steps";
import {
  getStage,
  getVisibleStages,
  bilingualLabel,
  localizedLabel,
} from "@/lib/production-templates";
import { useLifecycleConfig } from "@/hooks/use-lifecycle";
import { formatDateTime, cn } from "@/lib/utils";
import type { ProgressDTO, QuickAddStepDTO } from "@/types/case";

// Sentinel Select value for the unscoped "General" bucket (Radix Select can't use
// an empty string as an item value).
const GENERAL = "__general__";

export function ProgressManager({
  caseId,
  steps,
  collectionId,
  currentStageId,
  hiddenStageIds,
}: {
  caseId: string;
  steps: ProgressDTO[];
  collectionId: string | null;
  currentStageId: string | null;
  hiddenStageIds: string[];
}) {
  const { t, locale } = useAdminI18n();
  const { data: config = [] } = useLifecycleConfig();
  const add = useAddProgress(caseId);
  const update = useUpdateProgress(caseId);
  const remove = useDeleteProgress(caseId);
  const { data: quickSteps } = useQuickAddSteps(collectionId);
  const addChip = useAddQuickAddStep();
  const updateChip = useUpdateQuickAddStep();
  const deleteChip = useDeleteQuickAddStep();

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");

  // Chip being edited / deleted (drives the edit dialog + delete confirm).
  const [editing, setEditing] = React.useState<QuickAddStepDTO | null>(null);
  const [editEn, setEditEn] = React.useState("");
  const [editAr, setEditAr] = React.useState("");
  const [deleting, setDeleting] = React.useState<QuickAddStepDTO | null>(null);

  const visibleStages = getVisibleStages(config, collectionId, hiddenStageIds);
  // Offer a "General" bucket only when the case actually has unscoped steps
  // (e.g. pre-existing test rows), so they stay reachable without cluttering the
  // picker for normal cases.
  const hasGeneralSteps = steps.some((s) => !s.stageId);

  // Which stage the admin is currently VIEWING / adding steps under. Independent
  // of the case's persisted currentStageId, so steps can be logged for any stage
  // without moving the case. Defaults to the current stage.
  const [selected, setSelected] = React.useState<string>(
    currentStageId ?? visibleStages[0]?.id ?? GENERAL,
  );
  React.useEffect(() => {
    setSelected(currentStageId ?? GENERAL);
    // Reset only when the case's collection/current stage actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStageId, collectionId]);

  const activeStageId = selected === GENERAL ? null : selected;
  const stage = getStage(config, collectionId, activeStageId)?.stage;

  const stageOptions = [
    ...visibleStages.map((s) => ({ value: s.id, label: localizedLabel(s, locale) })),
    ...(hasGeneralSteps ? [{ value: GENERAL, label: t("progress.general") }] : []),
  ];

  // Steps shown are ONLY those tagged with the stage being viewed (null = General).
  const stageSteps = steps.filter((s) => (s.stageId ?? null) === activeStageId);
  const existingTitles = new Set(stageSteps.map((s) => s.stepTitle));

  // Quick-add chips for the viewed stage come entirely from the DB now (built-in
  // + custom are the same kind of row). Only a real stage offers quick-add.
  const stageChips = stage
    ? (quickSteps ?? []).filter((q) => q.stageId === activeStageId)
    : [];

  async function addStep(stepTitle: string, desc?: string, completed = false) {
    if (stepTitle.trim().length < 2) {
      toast.error(t("progress.toastShort"));
      return;
    }
    await add.mutateAsync({
      stepTitle: stepTitle.trim(),
      description: desc?.trim() || null,
      completed,
      // Tag the step with the stage being viewed in the picker.
      stageId: activeStageId,
    });
  }

  // Chip click → log that step on the case (using its bilingual label).
  async function addFromChip(chip: QuickAddStepDTO) {
    try {
      await addStep(bilingualLabel({ en: chip.labelEn, ar: chip.labelAr }));
      toast.success(t("progress.toastStepAdded"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("progress.toastAddFailed"));
    }
  }

  // Custom form → create a reusable chip AND log the step, so custom entries are
  // first-class editable/deletable chips like any built-in one.
  async function addCustom() {
    const trimmed = title.trim();
    if (trimmed.length < 2) {
      toast.error(t("progress.toastShort"));
      return;
    }
    if (!collectionId || !activeStageId) return;
    try {
      // Create the chip first (idempotent server-side); never block the step on it.
      await addChip
        .mutateAsync({
          collectionId,
          stageId: activeStageId,
          labelEn: trimmed,
          labelAr: trimmed,
        })
        .catch(() => {});
      await addStep(trimmed, description);
      setTitle("");
      setDescription("");
      toast.success(t("progress.toastStepAdded"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("progress.toastAddFailed"));
    }
  }

  function openEdit(chip: QuickAddStepDTO) {
    setEditing(chip);
    setEditEn(chip.labelEn);
    setEditAr(chip.labelAr);
  }

  async function saveEdit() {
    if (!editing) return;
    const en = editEn.trim();
    const ar = editAr.trim();
    if (!en || !ar) {
      toast.error(t("progress.toastLabelsRequired"));
      return;
    }
    try {
      await updateChip.mutateAsync({
        id: editing.id,
        input: { labelEn: en, labelAr: ar },
      });
      toast.success(t("progress.toastChipUpdated"));
      setEditing(null);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : t("progress.toastChipUpdateFailed"),
      );
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteChip.mutateAsync(deleting.id);
      toast.success(t("progress.toastChipRemoved"));
      setDeleting(null);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : t("progress.toastChipRemoveFailed"),
      );
    }
  }

  async function toggle(step: ProgressDTO) {
    try {
      await update.mutateAsync({
        progressId: step.id,
        input: { completed: !step.completed },
      });
    } catch {
      toast.error(t("progress.toastStepUpdateFailed"));
    }
  }

  async function del(id: string) {
    try {
      await remove.mutateAsync(id);
      toast.success(t("progress.toastStepRemoved"));
    } catch {
      toast.error(t("progress.toastStepRemoveFailed"));
    }
  }

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold text-ink">
            {t("progress.title")}
          </h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {t("progress.desc")}
          </p>
        </div>
        {stageOptions.length > 0 && (
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Layers className="h-3.5 w-3.5" /> {t("progress.stage")}
            </label>
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder={t("progress.selectStage")} />
              </SelectTrigger>
              <SelectContent>
                {stageOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Quick add: DB-backed chips for the viewed stage, each editable/deletable. */}
      <div className="mt-6 rounded-xl border border-border/80 bg-brand-50/40 p-4">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" /> {t("progress.quickAdd")}
          {stage && (
            <span className="font-medium normal-case tracking-normal text-brand-700">
              — {localizedLabel(stage, locale)}
            </span>
          )}
        </p>
        {stage ? (
          stageChips.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {stageChips.map((chip) => {
                const label = bilingualLabel({
                  en: chip.labelEn,
                  ar: chip.labelAr,
                });
                const added = existingTitles.has(label);
                return (
                  <span
                    key={chip.id}
                    className="group inline-flex items-center rounded-full border border-brand-200 bg-brand-50 py-1 pe-1 ps-3 text-xs shadow-inner-glow"
                  >
                    <button
                      onClick={() => addFromChip(chip)}
                      disabled={added || add.isPending}
                      title={
                        added
                          ? t("progress.alreadyAdded")
                          : t("progress.addThisStep")
                      }
                      className={cn(
                        "font-medium text-brand-700 transition-colors hover:text-brand-900 disabled:cursor-not-allowed",
                        added && "line-through opacity-50",
                      )}
                    >
                      + {label}
                    </button>
                    <button
                      onClick={() => openEdit(chip)}
                      aria-label={t("progress.editChipAria", { label: chip.labelEn })}
                      className="ms-1.5 rounded-full p-1 text-brand-400 transition-colors hover:bg-brand-100 hover:text-brand-700"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => setDeleting(chip)}
                      aria-label={t("progress.deleteChipAria", { label: chip.labelEn })}
                      className="rounded-full p-1 text-brand-400 transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{t("progress.noChips")}</p>
          )
        ) : (
          <p className="text-xs text-muted-foreground">
            {t("progress.chooseStageChips")}
          </p>
        )}
      </div>

      {/* Existing steps for the viewed stage */}
      <ul className="mt-6 space-y-2">
        {stageSteps.length === 0 && (
          <li className="rounded-xl border border-dashed border-brand-200 bg-brand-50/40 p-5 text-sm text-muted-foreground">
            {stage
              ? t("progress.noStepsStage")
              : activeStageId === null && stageOptions.length > 0
                ? t("progress.noGeneralSteps")
                : t("progress.chooseStageSteps")}
          </li>
        )}
        {stageSteps.map((step) => (
          <li
            key={step.id}
            className="flex items-start gap-3 rounded-xl border border-border/80 bg-white/[0.62] p-3 shadow-inner-glow transition-colors hover:border-brand-200"
          >
            <button
              onClick={() => toggle(step)}
              className={cn(
                "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                step.completed
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-border text-muted-foreground hover:border-brand-400",
              )}
              aria-label={
                step.completed
                  ? t("progress.markIncomplete")
                  : t("progress.markComplete")
              }
            >
              {step.completed ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Circle className="h-2 w-2 fill-current" />
              )}
            </button>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "font-medium",
                  step.completed ? "text-ink" : "text-muted-foreground",
                )}
              >
                {step.stepTitle}
              </p>
              {step.description && (
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              )}
              <p className="mt-0.5 text-xs text-muted-foreground/70">
                {formatDateTime(step.createdAt)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => del(step.id)}
              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              aria-label={t("progress.deleteStepAria", { title: step.stepTitle })}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>

      {/* Custom step form — only enabled when a real stage is being viewed, so
          every new step is stage-tagged (and becomes a reusable chip). */}
      {stage ? (
        <div className="mt-6 space-y-3 rounded-xl border border-border/80 bg-white/[0.62] p-4 shadow-inner-glow">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("progress.customPlaceholder")}
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("progress.descPlaceholder")}
            rows={2}
          />
          <Button
            variant="default"
            onClick={addCustom}
            disabled={add.isPending || addChip.isPending}
          >
            {add.isPending || addChip.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {t("progress.addStep")}
          </Button>
        </div>
      ) : (
        <p className="mt-6 rounded-xl border border-dashed border-border/80 bg-white/[0.4] p-4 text-xs text-muted-foreground">
          {t("progress.chooseStageAdd")}
        </p>
      )}

      {/* Edit-chip dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("progress.editChipTitle")}</DialogTitle>
            <DialogDescription>{t("progress.editChipDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t("progress.englishLabel")}</Label>
              <Input value={editEn} onChange={(e) => setEditEn(e.target.value)} dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label>{t("progress.arabicLabel")}</Label>
              <Input
                value={editAr}
                onChange={(e) => setEditAr(e.target.value)}
                dir="rtl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              {t("progress.cancel")}
            </Button>
            <Button onClick={saveEdit} disabled={updateChip.isPending}>
              {updateChip.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("progress.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete-chip confirm */}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t("progress.removeChipTitle")}
        description={t("progress.removeChipDesc")}
        confirmLabel={t("progress.remove")}
        destructive
        loading={deleteChip.isPending}
        onConfirm={confirmDelete}
      />
    </Card>
  );
}
