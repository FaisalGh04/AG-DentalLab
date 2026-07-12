"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  CalendarClock,
  Stethoscope,
  Package,
  Tag,
  Hash,
  Eye,
  EyeOff,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StageStepper } from "@/components/case/stage-stepper";
import { CaseStateBadge } from "@/components/case/case-state-badge";
import { TrackingIdCopy } from "@/components/case/tracking-id-copy";
import { CaseFormDialog } from "@/components/admin/case-form-dialog";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { ProgressManager } from "@/components/admin/progress-manager";
import { ImageManager } from "@/components/admin/image-manager";
import { useAdminI18n } from "@/components/i18n/admin-i18n";
import { useCase, useDeleteCase, useUpdateCase } from "@/hooks/use-cases";
import {
  PRODUCTION_COLLECTIONS,
  getProductionCollection,
  getVisibleStages,
  firstStageId,
  localizedLabel,
} from "@/lib/production-templates";
import { formatDate, formatEstCompletion, cn } from "@/lib/utils";

export function CaseDetailClient({ id }: { id: string }) {
  const { t, locale } = useAdminI18n();
  const router = useRouter();
  const params = useSearchParams();
  const { data: kase, isLoading } = useCase(id);
  const update = useUpdateCase(id);
  const del = useDeleteCase();

  const [editOpen, setEditOpen] = React.useState(params.get("edit") === "true");
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const badgeLabels = {
    completed: t("state.completed"),
    noCollection: t("state.noCollection"),
  };

  async function changeCollection(collectionId: string) {
    try {
      // Switching collection resets the current stage (to the new first stage)
      // and clears hidden stages — stage ids don't carry across collections.
      await update.mutateAsync({
        collectionId,
        currentStageId: firstStageId(collectionId),
        hiddenStageIds: [],
      });
      toast.success(t("detail.toastCollectionUpdated"));
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : t("detail.toastCollectionFailed"),
      );
    }
  }

  async function changeStage(currentStageId: string) {
    try {
      await update.mutateAsync({ currentStageId });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("detail.toastStageFailed"));
    }
  }

  async function toggleHidden(stageId: string, hidden: string[]) {
    const next = hidden.includes(stageId)
      ? hidden.filter((s) => s !== stageId)
      : [...hidden, stageId];
    try {
      await update.mutateAsync({ hiddenStageIds: next });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("detail.toastStagesFailed"));
    }
  }

  async function confirmDelete() {
    try {
      await del.mutateAsync(id);
      toast.success(t("detail.toastDeleted"));
      router.push("/admin/cases");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("detail.toastDeleteFailed"));
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!kase) {
    return (
      <div className="mx-auto max-w-5xl">
        <Card className="p-10 text-center">
          <p className="text-muted-foreground">{t("detail.caseNotFound")}</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/admin/cases">{t("detail.backToCases")}</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const collection = getProductionCollection(kase.collectionId);
  const visibleStages = getVisibleStages(kase.collectionId, kase.hiddenStageIds);
  const stepperStages = visibleStages.map((s) => ({
    id: s.id,
    label: localizedLabel(s, locale),
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/admin/cases"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" /> {t("detail.allCases")}
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" /> {t("detail.edit")}
          </Button>
          <Button
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" /> {t("detail.delete")}
          </Button>
        </div>
      </div>

      {/* Header card */}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-border/80 bg-brand-50/60 p-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("detail.patient")}
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold text-ink">
              {kase.patientFirstName} {kase.patientLastName}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {t("detail.created", { date: formatDate(kase.createdAt) })}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <TrackingIdCopy trackingId={kase.trackingId} />
              <CaseStateBadge
                collectionId={kase.collectionId}
                currentStageId={kase.currentStageId}
                isCompleted={kase.isCompleted}
                locale={locale}
                labels={badgeLabels}
              />
            </div>
          </div>

          {/* Collection + Stage pickers */}
          <div className="grid w-full max-w-md gap-3 sm:grid-cols-2 lg:w-auto">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("detail.collection")}
              </label>
              <Select
                value={kase.collectionId ?? ""}
                onValueChange={changeCollection}
              >
                <SelectTrigger className="w-full sm:w-52">
                  <SelectValue placeholder={t("detail.selectCollection")} />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCTION_COLLECTIONS.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {localizedLabel(c, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("detail.stage")}
              </label>
              <Select
                value={kase.currentStageId ?? ""}
                disabled={!collection}
                onValueChange={changeStage}
              >
                <SelectTrigger className="w-full sm:w-52">
                  <SelectValue
                    placeholder={
                      collection
                        ? t("detail.selectStage")
                        : t("detail.pickCollection")
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {visibleStages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {localizedLabel(s, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Dynamic stepper for the selected collection's visible stages */}
        <div className="p-6">
          {collection ? (
            stepperStages.length > 0 ? (
              <StageStepper
                stages={stepperStages}
                currentStageId={kase.currentStageId}
                interactive
                clickable="all"
                onSelectStage={changeStage}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("detail.allStagesHidden")}
              </p>
            )
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-brand-200 bg-brand-50/40 p-5 text-sm text-muted-foreground">
              <Layers className="h-5 w-5 text-brand-400" />
              {t("detail.buildTimeline")}
            </div>
          )}
        </div>

        {/* Per-stage hide/show management */}
        {collection && (
          <div className="border-t border-border/80 bg-white/50 p-6">
            <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Layers className="h-3.5 w-3.5" /> {t("detail.stagesInCase")}
            </p>
            <div className="flex flex-wrap gap-2">
              {collection.stages.map((s) => {
                const hidden = kase.hiddenStageIds.includes(s.id);
                const isCurrent = kase.currentStageId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleHidden(s.id, kase.hiddenStageIds)}
                    disabled={update.isPending || isCurrent}
                    title={
                      isCurrent
                        ? t("detail.cantHideCurrent")
                        : hidden
                          ? t("detail.showStage")
                          : t("detail.hideStage")
                    }
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                      hidden
                        ? "border-border bg-muted/40 text-muted-foreground line-through"
                        : "border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100",
                    )}
                  >
                    {hidden ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                    {localizedLabel(s, locale)}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground/70">
              {t("detail.hiddenStagesNote")}
            </p>
          </div>
        )}

        <div className="grid gap-px bg-border/80 sm:grid-cols-2 lg:grid-cols-5">
          <Detail icon={Stethoscope} label={t("detail.doctor")} value={kase.doctorName} />
          <Detail icon={Hash} label={t("detail.trackingId")} value={kase.trackingId} />
          <Detail icon={Package} label={t("detail.caseType")} value={kase.caseType} />
          <Detail
            icon={Tag}
            label={t("detail.category")}
            value={t(`category.${kase.category}`)}
          />
          <Detail
            icon={CalendarClock}
            label={t("detail.estCompletion")}
            value={formatEstCompletion(kase.estimatedCompletionDate)}
          />
        </div>

        {kase.notes && (
          <div className="border-t border-border/80 bg-white/50 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("detail.notes")}
            </p>
            <p className="mt-2 text-sm text-foreground/80">{kase.notes}</p>
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <ProgressManager
          caseId={id}
          steps={kase.progress}
          collectionId={kase.collectionId}
          currentStageId={kase.currentStageId}
          hiddenStageIds={kase.hiddenStageIds}
        />
        <ImageManager
          caseId={id}
          images={kase.images}
          collectionId={kase.collectionId}
          currentStageId={kase.currentStageId}
        />
      </div>

      <CaseFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        existing={kase}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("detail.deleteTitle")}
        description={t("detail.deleteBody")}
        confirmLabel={t("detail.delete")}
        destructive
        loading={del.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-card/88 p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="mt-1.5 font-medium text-ink">{value}</p>
    </div>
  );
}
