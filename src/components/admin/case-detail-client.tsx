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
  UserCheck,
  ChevronRight,
  History,
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
import { WorkflowSelect } from "@/components/admin/workflow-select";
import { TrackingIdCopy } from "@/components/case/tracking-id-copy";
import { CaseFormDialog } from "@/components/admin/case-form-dialog";
import { StageViewerDialog } from "@/components/admin/stage-viewer-dialog";
import { StageActorHistoryDialog } from "@/components/admin/stage-actor-history-dialog";
import { ToothTreatmentSummary } from "@/components/admin/tooth-treatment-summary";
import { ConfirmActionDialog } from "@/components/admin/confirm-action-dialog";
import { useConfirmAction } from "@/hooks/use-confirm-action";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { ProgressManager } from "@/components/admin/progress-manager";
import { ImageManager } from "@/components/admin/image-manager";
import { useAdminI18n } from "@/components/i18n/admin-i18n";
import { useCase, useDeleteCase, useUpdateCase } from "@/hooks/use-cases";
import { useLifecycleConfig } from "@/hooks/use-lifecycle";
import { useCaseTaxonomy } from "@/hooks/use-case-taxonomy";
import {
  getProductionCollection,
  getVisibleStages,
  firstStageId,
  localizedLabel,
} from "@/lib/production-templates";
import {
  formatDate,
  formatEstCompletion,
  formatDateTime,
  formatRelativeTime,
  cn,
} from "@/lib/utils";

export function CaseDetailClient({ id }: { id: string }) {
  const { t, locale } = useAdminI18n();
  const { data: config = [] } = useLifecycleConfig();
  const { data: taxonomy } = useCaseTaxonomy();
  const router = useRouter();
  const params = useSearchParams();
  const { data: kase, isLoading } = useCase(id);
  const update = useUpdateCase(id);
  const del = useDeleteCase();

  const [editOpen, setEditOpen] = React.useState(params.get("edit") === "true");
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  // Every gated action on this page routes through one gate, so no call site can
  // accidentally mutate the lifecycle inline and bypass confirmation.
  const confirmGate = useConfirmAction();
  // Read-only stage viewer. Plain local state — deliberately NOT routed through
  // confirmGate, because looking at a stage is not a transition.
  const [viewerStageId, setViewerStageId] = React.useState<string | null>(null);
  const [stageActorOpen, setStageActorOpen] = React.useState(false);
  /**
   * Stage change awaiting the plain are-you-sure dialog. An ACCIDENT GUARD
   * only — it holds no secret and grants nothing. Whatever the staff
   * confirmation setting dictates still happens afterwards, unchanged, when
   * commitStageChange hands off to confirmGate.
   */
  const [pendingStageId, setPendingStageId] = React.useState<string | null>(
    null,
  );
  /**
   * Remount key for WorkflowSelect. Dismissing the gate saves nothing, so
   * `kase.collectionId` is unchanged and the picker would keep showing the
   * abandoned selection. Bumping this on every close discards its pending
   * state; on a SUCCESSFUL save the remount simply re-derives from the newly
   * saved value, so it is harmless there.
   */
  const [workflowResetKey, setWorkflowResetKey] = React.useState(0);

  const badgeLabels = {
    completed: t("state.completed"),
    noCollection: t("state.noCollection"),
  };

  /** Human label for a stage id, for the dialog's intent summary. */
  function stageLabel(stageId: string | null | undefined): string {
    if (!stageId) return t("confirm.noStage");
    // Resolve independently rather than closing over `collection`, which is
    // declared further down (after the loading guard).
    const c = getProductionCollection(config, kase?.collectionId);
    const s = c?.stages.find((x) => x.id === stageId);
    return s ? localizedLabel(s, locale) : stageId;
  }

  // ---- ENTRY POINT 4: workflow / collection change ---------------------
  function changeCollection(collectionId: string) {
    const target = getProductionCollection(config, collectionId);
    confirmGate.request(
      {
        summary: `${t("confirm.workflowTo")}: ${
          target ? localizedLabel(target, locale) : collectionId
        }`,
      },
      async (confirmation) => {
        // Switching collection resets the current stage (to the new first stage)
        // and clears hidden stages — stage ids don't carry across collections.
        await update.mutateAsync({
          collectionId,
          currentStageId: firstStageId(config, collectionId),
          hiddenStageIds: [],
          confirmation,
        });
        toast.success(t("detail.toastCollectionUpdated"));
      },
    );
  }

  // ---- ENTRY POINTS 2 + 3: Stage <Select> and StageStepper click -------
  /**
   * THE single entry point for BOTH stage controls — neither calls the mutation
   * or the gate directly, so neither can skip the accident guard.
   *
   * Only opens the dialog; nothing is sent until the human confirms.
   */
  function requestStageChange(targetStageId: string) {
    // No-op guard: re-selecting the current stage is not a transition, so it
    // must not prompt. The server treats it as ungated too.
    if (!targetStageId || targetStageId === kase?.currentStageId) return;
    // A second pick while the previous change is still in flight would queue a
    // duplicate mutation computed against a stage that is already stale.
    if (update.isPending) return;
    setPendingStageId(targetStageId);
  }

  /**
   * Accident guard cleared → run the pre-existing gated flow verbatim.
   * confirmGate still decides between the staff/manager confirmation dialog and
   * a direct save, exactly as before; the guard above changed none of that.
   */
  function commitStageChange(stageId: string) {
    confirmGate.request(
      {
        summary: `${stageLabel(kase?.currentStageId)} → ${stageLabel(stageId)}`,
      },
      async (confirmation) => {
        await update.mutateAsync({ currentStageId: stageId, confirmation });
      },
    );
  }

  // ---- ENTRY POINT 5: stage visibility toggle -------------------------
  function toggleHidden(stageId: string, hidden: string[]) {
    const willHide = !hidden.includes(stageId);
    const next = willHide
      ? [...hidden, stageId]
      : hidden.filter((s) => s !== stageId);
    confirmGate.request(
      {
        summary: `${
          willHide ? t("confirm.hideStage") : t("confirm.showStage")
        }: ${stageLabel(stageId)}`,
      },
      async (confirmation) => {
        await update.mutateAsync({ hiddenStageIds: next, confirmation });
      },
    );
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

  const collection = getProductionCollection(config, kase.collectionId);
  const visibleStages = getVisibleStages(config, kase.collectionId, kase.hiddenStageIds);
  const stepperStages = visibleStages.map((s) => ({
    id: s.id,
    label: localizedLabel(s, locale),
  }));

  // --- read-only stage history (derived, never mutated) -------------------
  const history = kase.stageHistory;
  /** Visits to one stage, oldest first. */
  const visitsFor = (stageId: string) => history.filter((v) => v.stageId === stageId);
  /** Most recent entry into a stage; null when never recorded. */
  const latestVisit = (stageId: string) => {
    const v = visitsFor(stageId);
    return v.length > 0 ? v[v.length - 1]! : null;
  };
  // A case whose transitions predate the audit log has no rows at all — used to
  // explain "not recorded" rather than leaving a bare blank.
  const historyUnavailable = history.length === 0;

  const viewerStage = viewerStageId
    ? (collection?.stages.find((s) => s.id === viewerStageId) ?? null)
    : null;
  // "Reached" = we have a recorded entry, or it IS the current stage (which
  // covers legacy cases with no audit rows).
  const viewerReached = viewerStageId
    ? visitsFor(viewerStageId).length > 0 || kase.currentStageId === viewerStageId
    : false;

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
                config={config}
                collectionId={kase.collectionId}
                currentStageId={kase.currentStageId}
                isCompleted={kase.isCompleted}
                locale={locale}
                labels={badgeLabels}
              />
            </div>
          </div>

          {/* Workflow (type → group) + Stage pickers. The workflow picker hides
              itself for non-production categories. Committing immediately, so we
              ignore incomplete (null) selections. */}
          <div className="grid w-full max-w-md gap-3 sm:grid-cols-2 lg:w-auto">
            <WorkflowSelect
              key={workflowResetKey}
              category={kase.category}
              value={kase.collectionId ?? null}
              onChange={(id) => {
                if (id) changeCollection(id);
              }}
            />
            {/* Levelled with WorkflowSelect beside it, which is one row taller
                (label + Regular/Digital toggle + group select). flex-col with
                an mt-auto spacer rather than a hard-coded offset: the toggle's
                height moves with the locale's font metrics. The grid row
                stretches both columns, so the label stays level with the
                Workflow label at the top while the select drops to sit level
                with the group select at the bottom. On mobile the grid is one
                column, each control is its own row, and mt-auto is inert — so
                the stacked layout is unchanged. */}
            <div className="flex flex-col">
              {/* pt-4 puts this label on the Workflow label's baseline. That one
                  shares its line with the Regular/Digital toggle, whose own top
                  inset (8px gap + 1px border + 2px padding + 4px button padding)
                  pushes the shared baseline down by ~15px; the label alone has
                  nothing to push it. Measured, not guessed: both labels and both
                  selects land within 0px at desktop, tablet, and in Arabic. */}
              <label className="pt-4 text-sm font-medium">
                {t("detail.stage")}
              </label>
              <Select
                value={kase.currentStageId ?? ""}
                disabled={!collection}
                onValueChange={requestStageChange}
              >
                <SelectTrigger className="mt-auto w-full sm:w-52">
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
                onSelectStage={requestStageChange}
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
                const entered = latestVisit(s.id);
                return (
                  // The two buttons are SIBLINGS, never nested: a button inside
                  // a button is invalid HTML and the click would bubble into
                  // toggleHidden — i.e. "view" would fire the confirmation gate.
                  <span
                    key={s.id}
                    className={cn(
                      "inline-flex items-center rounded-full border",
                      hidden
                        ? "border-border bg-muted/40"
                        : "border-brand-200 bg-brand-50",
                    )}
                  >
                    {/* ACT: toggling visibility is a gated lifecycle change. */}
                    <button
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
                        "inline-flex items-center gap-1.5 rounded-s-full px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                        hidden
                          ? "text-muted-foreground line-through"
                          : "text-brand-700 hover:bg-brand-100",
                      )}
                    >
                      {hidden ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                      {localizedLabel(s, locale)}
                    </button>

                    {/* Timestamp sits BETWEEN the two buttons and is deliberately
                        non-interactive: inside the toggle it would look like
                        information while actually firing the gated hide/show,
                        and its tooltip would compete with the button's own. */}
                    {entered && (
                      <span
                        className="px-1 text-xs font-normal text-muted-foreground"
                        title={formatRelativeTime(entered.enteredAt, locale)}
                      >
                        {formatDateTime(entered.enteredAt)}
                      </span>
                    )}

                    {/* LOOK: opens a read-only dialog. Sets LOCAL STATE ONLY —
                        no mutation, no confirmation gate, no network call. */}
                    <button
                      type="button"
                      onClick={() => setViewerStageId(s.id)}
                      title={t("stageView.open")}
                      aria-label={`${t("stageView.open")}: ${localizedLabel(s, locale)}`}
                      className={cn(
                        "inline-flex items-center rounded-e-full border-s px-2 py-1.5 transition-colors",
                        hidden
                          ? "border-s-border text-muted-foreground hover:bg-muted/60"
                          : "border-s-brand-200 text-brand-700 hover:bg-brand-100",
                      )}
                    >
                      <History className="h-3.5 w-3.5" />
                    </button>
                  </span>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground/70">
              {t("detail.hiddenStagesNote")}
            </p>
          </div>
        )}

        {/* Per-tooth plan. Falls back to the legacy category/caseType pair for
            cases created before tooth items existed — see the component. */}
        <div className="border-t border-border/80 p-6">
          <ToothTreatmentSummary
            toothItems={kase.toothItems}
            legacyCategory={kase.category}
            legacyCaseType={kase.caseType}
          />
        </div>

        {/* 6 tiles → 2x3 on desktop. Read-only throughout: receivedBy is
            write-once and has no inline editor by design. */}
        <div className="grid gap-px bg-border/80 sm:grid-cols-2 lg:grid-cols-3">
          <Detail icon={Stethoscope} label={t("detail.doctor")} value={kase.doctorName} />
          <Detail icon={Hash} label={t("detail.trackingId")} value={kase.trackingId} />
          <Detail icon={Package} label={t("detail.caseType")} value={kase.caseType} />
          <Detail
            icon={Tag}
            label={t("detail.category")}
            value={
              (() => {
                const item = taxonomy?.categories.find(
                  (entry) => entry.category === kase.category,
                );
                return item
                  ? locale === "ar"
                    ? item.labelAr
                    : item.labelEn
                  : t(`category.${kase.category}`);
              })()
            }
          />
          {/* Current-stage actor: who moved the case into the stage it is in
              now, NOT the original receiver (that stays on the case as
              receivedBy and is shown inside the dialog for legacy cases).
              Clickable — opens the full chronological history. */}
          <DetailButton
            icon={UserCheck}
            label={
              kase.currentStageActor.isFallback
                ? t("detail.receivedBy")
                : t("detail.stageUpdatedBy")
            }
            value={kase.currentStageActor.name || "—"}
            hint={t("detail.stageHistoryHint")}
            onClick={() => setStageActorOpen(true)}
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
      {/* READ-ONLY. Chronological "who moved this into which stage, when". */}
      <StageActorHistoryDialog
        open={stageActorOpen}
        onOpenChange={setStageActorOpen}
        history={kase.stageHistory}
        currentStageId={kase.currentStageId}
        stageLabel={(stageId) => stageLabel(stageId)}
        receivedBy={kase.receivedBy}
      />
      {/* READ-ONLY viewer. Receives plain data; has no mutation in scope. */}
      <StageViewerDialog
        open={!!viewerStageId}
        onOpenChange={(o) => !o && setViewerStageId(null)}
        stage={
          viewerStage
            ? { id: viewerStage.id, label: localizedLabel(viewerStage, locale) }
            : null
        }
        visits={viewerStageId ? visitsFor(viewerStageId) : []}
        steps={kase.progress.filter((p) => p.stageId === viewerStageId)}
        images={kase.images.filter((i) => i.stageId === viewerStageId)}
        isReached={viewerReached}
        historyUnavailable={historyUnavailable}
      />
      {/* Single gate for entry points 2-5 on this page. */}
      <ConfirmActionDialog
        open={confirmGate.open}
        onOpenChange={(o) => {
          confirmGate.setOpen(o);
          // Closing (confirmed or cancelled) ends the pending workflow change.
          if (!o) setWorkflowResetKey((k) => k + 1);
        }}
        intent={confirmGate.intent}
        perform={confirmGate.perform}
      />
      {/* Accident guard for stage changes. A PLAIN confirmation: no secret
          field, no bypass, and no part of the security model — the staff /
          manager confirmation still runs after this whenever it is enabled. */}
      <ConfirmDialog
        open={pendingStageId !== null}
        onOpenChange={(o) => {
          // Cancel (button, X, or a programmatic close) discards the target and
          // sends nothing. The <Select> is controlled by the SAVED stage, so it
          // is already showing the real value — there is no UI to roll back.
          if (!o) setPendingStageId(null);
        }}
        title={t("detail.confirmStageTitle", {
          from: stageLabel(kase.currentStageId),
          to: stageLabel(pendingStageId),
        })}
        description={t("detail.confirmStageBody")}
        confirmLabel={t("detail.confirmStageAction")}
        loading={update.isPending}
        onConfirm={() => {
          const target = pendingStageId;
          if (!target) return;
          setPendingStageId(null);
          commitStageChange(target);
        }}
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

/**
 * Clickable sibling of <Detail>. Same visual rhythm so the grid stays even,
 * plus affordances a plain tile has no business carrying: hover/focus states, a
 * chevron, and real keyboard semantics (it is a <button>, so Enter/Space and
 * focus-visible come for free).
 */
function DetailButton({
  icon: Icon,
  label,
  value,
  hint,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={hint}
      className="group bg-card/88 p-5 text-start transition-colors hover:bg-brand-50/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50 dark:hover:bg-brand-900/20"
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="mt-1.5 flex items-center gap-1.5 font-medium text-ink">
        <span className="min-w-0 truncate">{value}</span>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100" />
      </p>
      <span className="mt-1 block text-xs text-muted-foreground/80 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        {hint}
      </span>
    </button>
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
