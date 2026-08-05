"use client";

/**
 * READ-ONLY whole-case stage history, opened from the "Created" column of the
 * admin case LIST.
 *
 * A deliberate SIBLING of stage-viewer-dialog.tsx rather than a reuse of it,
 * because the two answer different questions:
 *
 *   stage-viewer-dialog  "what happened in THIS stage" — one stage, plus that
 *                        stage's steps and images, with the whole case already
 *                        loaded by the detail page.
 *   this file            "what happened to THIS case" — every stage in
 *                        collection order, with the case fetched ON DEMAND, so
 *                        it needs loading/error states the detail page never has.
 *
 * Bending one component to cover both would have meant a nullable `stage`, a
 * multi-stage mode and a loading branch — diluting the guarantee below, which is
 * the one thing about that file that must not become negotiable.
 *
 * ============================ STRUCTURAL GUARANTEE ==========================
 * This component CANNOT change a case, and cannot reach the confirmation gate:
 *
 *   1. It receives PLAIN DATA only. The single callback is `onOpenChange`,
 *      which is local dialog visibility (a React setState) — there is no
 *      mutation function anywhere in scope.
 *   2. It performs NO data fetching. The PARENT owns the useCase() query and
 *      threads the result in as props. That split is deliberate: @/hooks/use-cases
 *      exports useUpdateCase/useDeleteCase alongside useCase, so fetching here
 *      would mean importing the mutation hooks into this file — exactly what
 *      point 4 forbids.
 *   3. It imports NO mutation path — not @/hooks/use-cases, not useConfirmAction,
 *      not ConfirmActionDialog.
 *   4. (3) is enforced by ESLint `no-restricted-imports`, scoped to this file
 *      in .eslintrc.json — adding such an import is a BUILD FAILURE, not a
 *      convention someone can quietly break later.
 * ===========================================================================
 */

import * as React from "react";
import { History, Clock, UserCheck, Layers, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminI18n } from "@/components/i18n/admin-i18n";
import {
  getProductionCollection,
  localizedLabel,
  type ProductionCollection,
} from "@/lib/production-templates";
import { formatDateTime, formatRelativeTime, cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n/config";
import type { AdminCaseDTO, StageVisitDTO } from "@/types/case";

interface Props {
  open: boolean;
  /** Local dialog visibility only. Not a data callback. */
  onOpenChange: (open: boolean) => void;
  /**
   * From the list row, which is already loaded — so the header renders
   * immediately instead of waiting on the on-demand fetch.
   */
  patientName: string;
  createdAt: string;
  /** Lifecycle config, already loaded by the parent list. */
  config: ProductionCollection[];
  /** Fetched on demand by the parent; undefined until it arrives. */
  kase: AdminCaseDTO | undefined;
  isLoading: boolean;
  isError: boolean;
}

export function CaseHistoryDialog({
  open,
  onOpenChange,
  patientName,
  createdAt,
  config,
  kase,
  isLoading,
  isError,
}: Props) {
  const { t, locale } = useAdminI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-brand-700" />
            {t("caseHistory.title")}
          </DialogTitle>
          <DialogDescription>
            {t("caseHistory.subtitle", {
              name: patientName,
              date: formatDateTime(createdAt),
            })}
          </DialogDescription>
        </DialogHeader>

        {isError ? (
          <p className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {t("caseHistory.loadError")}
          </p>
        ) : isLoading || !kase ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        ) : (
          <HistoryBody kase={kase} config={config} locale={locale} t={t} />
        )}

        <p className="text-xs text-muted-foreground/70">
          {t("caseHistory.readOnlyNote")}
        </p>
      </DialogContent>
    </Dialog>
  );
}

/** Split out purely for readability; still plain data in, JSX out. */
function HistoryBody({
  kase,
  config,
  locale,
  t,
}: {
  kase: AdminCaseDTO;
  config: ProductionCollection[];
  locale: Locale;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const collection = getProductionCollection(config, kase.collectionId);

  // No workflow chosen yet → there are no stages to group by. Say so rather
  // than rendering an empty list that looks like missing data.
  if (!collection) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-dashed border-brand-200 bg-brand-50/40 p-5 text-sm text-muted-foreground">
        <Layers className="h-5 w-5 shrink-0 text-brand-400" />
        {t("caseHistory.noWorkflow")}
      </div>
    );
  }

  const stageIds = new Set(collection.stages.map((s) => s.id));
  // Visits whose stage is NOT in the current collection: the case was moved to a
  // different workflow, and stage ids do not carry across collections. Grouping
  // by the current collection alone would silently drop these audit rows, so
  // they get their own section instead of disappearing.
  const orphaned = kase.stageHistory.filter((v) => !stageIds.has(v.stageId));
  // A case whose transitions predate the audit log has no rows at all.
  const historyUnavailable = kase.stageHistory.length === 0;

  return (
    <div className="space-y-3">
      {historyUnavailable && (
        <p className="rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {t("stageView.legacyCaseNote")}
        </p>
      )}

      <ol className="space-y-2">
        {collection.stages.map((stage) => {
          // Visits to this stage, oldest first (stageHistory is already sorted).
          const visits = kase.stageHistory.filter((v) => v.stageId === stage.id);
          const latest = visits.length > 0 ? visits[visits.length - 1]! : null;
          const earlier = visits.slice(0, -1);
          const hidden = kase.hiddenStageIds.includes(stage.id);
          const isCurrent = kase.currentStageId === stage.id;

          return (
            <li
              key={stage.id}
              className={cn(
                "rounded-2xl border p-3.5",
                isCurrent
                  ? "border-brand-200 bg-brand-50/70"
                  : "border-border/70 bg-muted/20",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    latest ? "bg-brand-600" : "bg-border",
                  )}
                />
                <span
                  className={cn(
                    "font-medium text-ink",
                    hidden && "text-muted-foreground line-through",
                  )}
                >
                  {localizedLabel(stage, locale)}
                </span>
                {isCurrent && (
                  <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
                    {t("caseHistory.current")}
                  </span>
                )}
                {hidden && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("caseHistory.hidden")}
                  </span>
                )}
              </div>

              {latest ? (
                <>
                  <VisitLine visit={latest} locale={locale} className="mt-2" />
                  {earlier.length > 0 && (
                    <div className="mt-2 border-t border-border/60 pt-2">
                      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {t("stageView.allVisits")} ({visits.length})
                      </p>
                      <div className="space-y-1">
                        {earlier.map((v, i) => (
                          <VisitLine
                            key={`${v.enteredAt}-${i}`}
                            visit={v}
                            locale={locale}
                            muted
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                // Distinguish "never got there" from "got there before the audit
                // log existed" — a blank would conflate the two.
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {isCurrent
                    ? t("stageView.notRecorded")
                    : t("stageView.notReached")}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      {orphaned.length > 0 && (
        <div className="rounded-2xl border border-border/70 bg-muted/20 p-3.5">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {t("caseHistory.earlierWorkflow")} ({orphaned.length})
          </p>
          <div className="space-y-1">
            {orphaned.map((v, i) => (
              <VisitLine key={`${v.enteredAt}-${i}`} visit={v} locale={locale} muted />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * One recorded entry: absolute timestamp (never relative alone — that hides the
 * actual instant), relative time beside it, and who confirmed it.
 */
function VisitLine({
  visit,
  locale,
  muted,
  className,
}: {
  visit: StageVisitDTO;
  locale: Locale;
  muted?: boolean;
  className?: string;
}) {
  return (
    // A <div>, not an <li>: this renders both standalone (the latest entry) and
    // inside the earlier/orphaned groups, and an <li> outside a list is invalid.
    <div
      className={cn(
        "flex flex-wrap items-baseline gap-x-2 gap-y-0.5",
        muted ? "text-xs text-muted-foreground" : "text-sm",
        className,
      )}
    >
      <span
        className={cn("font-medium", !muted && "text-ink")}
        title={formatRelativeTime(visit.enteredAt, locale)}
      >
        {formatDateTime(visit.enteredAt)}
      </span>
      <span className="text-xs text-muted-foreground">
        {formatRelativeTime(visit.enteredAt, locale)}
      </span>
      {visit.staffName && (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <UserCheck className="h-3 w-3" />
          {visit.staffName}
        </span>
      )}
    </div>
  );
}
