"use client";

/**
 * READ-ONLY stage viewer. A "look" action, deliberately separate from the "act"
 * entry points (Stage <Select>, StageStepper click) which require two-factor
 * confirmation.
 *
 * ============================ STRUCTURAL GUARANTEE ==========================
 * This component CANNOT change a case's stage, and cannot reach the
 * confirmation gate:
 *
 *   1. It receives PLAIN DATA only. The single callback is `onOpenChange`,
 *      which is local dialog visibility (a React setState) — there is no
 *      mutation function anywhere in scope.
 *   2. It performs NO data fetching. Everything shown is already loaded by
 *      useCase(id) on the parent page; nothing here calls the network. (The
 *      browser does issue GETs for <img src> — read-only image reads through
 *      the admin proxy, never a write.)
 *   3. It imports NO mutation path — not useUpdateCase, not useConfirmAction,
 *      not ConfirmActionDialog, not @/hooks/use-cases.
 *   4. (3) is enforced by ESLint `no-restricted-imports`, scoped to this file
 *      in .eslintrc.json — adding such an import is a BUILD FAILURE, not a
 *      convention someone can quietly break later.
 * ===========================================================================
 */

import * as React from "react";
import Image from "next/image";
import { History, Clock, ImageIcon, ListChecks, UserCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAdminI18n } from "@/components/i18n/admin-i18n";
import { formatDateTime, formatRelativeTime, formatNumber, cn } from "@/lib/utils";
import type { ProgressDTO, ImageDTO, StageVisitDTO } from "@/types/case";

interface Props {
  open: boolean;
  /** Local dialog visibility only. Not a data callback. */
  onOpenChange: (open: boolean) => void;
  stage: { id: string; label: string } | null;
  /** Visits to THIS stage, oldest first. Empty = never entered / not recorded. */
  visits: StageVisitDTO[];
  /** Progress steps logged against this stage. */
  steps: ProgressDTO[];
  /** Images tagged to this stage. */
  images: ImageDTO[];
  /** True when the case has reached this stage at least once. */
  isReached: boolean;
  /** True when the case has NO audit history at all (predates the audit log). */
  historyUnavailable: boolean;
}

export function StageViewerDialog({
  open,
  onOpenChange,
  stage,
  visits,
  steps,
  images,
  isReached,
  historyUnavailable,
}: Props) {
  const { t, locale } = useAdminI18n();
  if (!stage) return null;

  const latest = visits.length > 0 ? visits[visits.length - 1] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-brand-700" />
            {stage.label}
          </DialogTitle>
          <DialogDescription>{t("stageView.desc")}</DialogDescription>
        </DialogHeader>

        {/* --- entry timestamp ------------------------------------------- */}
        <div className="rounded-2xl border border-brand-100 bg-brand-50/70 p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {t("stageView.entered")}
          </p>

          {latest ? (
            <>
              <p
                className="mt-1.5 font-medium text-ink"
                title={formatRelativeTime(latest.enteredAt, locale)}
              >
                {formatDateTime(latest.enteredAt, locale)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatRelativeTime(latest.enteredAt, locale)}
                {latest.staffName ? ` · ${latest.staffName}` : ""}
              </p>
            </>
          ) : !isReached ? (
            <p className="mt-1.5 text-sm text-muted-foreground">
              {t("stageView.notReached")}
            </p>
          ) : (
            // Reached, but no log row: the transition happened before the audit
            // log existed. Say so plainly rather than showing an empty value.
            <p className="mt-1.5 text-sm text-muted-foreground">
              {t("stageView.notRecorded")}
            </p>
          )}
        </div>

        {historyUnavailable && isReached && (
          <p className="rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            {t("stageView.legacyCaseNote")}
          </p>
        )}

        {/* --- repeat visits ---------------------------------------------- */}
        {visits.length > 1 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("stageView.allVisits")} ({formatNumber(visits.length, locale)})
            </p>
            <ol className="space-y-1.5">
              {visits.map((v, i) => (
                <li
                  key={`${v.enteredAt}-${i}`}
                  className="flex items-baseline justify-between gap-3 rounded-lg bg-muted/30 px-3 py-1.5 text-xs"
                >
                  <span title={formatRelativeTime(v.enteredAt, locale)}>
                    {formatDateTime(v.enteredAt, locale)}
                  </span>
                  {v.staffName && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <UserCheck className="h-3 w-3" />
                      {v.staffName}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* --- steps ------------------------------------------------------ */}
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <ListChecks className="h-3.5 w-3.5" />
            {t("stageView.steps")} ({formatNumber(steps.length, locale)})
          </p>
          {steps.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("stageView.noSteps")}</p>
          ) : (
            <ul className="space-y-1.5">
              {steps.map((s) => (
                <li
                  key={s.id}
                  className="flex items-start gap-2 rounded-lg bg-muted/30 px-3 py-2 text-sm"
                >
                  <span
                    className={cn(
                      "mt-1 h-2 w-2 shrink-0 rounded-full",
                      s.completed ? "bg-brand-600" : "bg-border",
                    )}
                  />
                  <span className={cn(s.completed && "text-foreground/70")}>
                    {s.stepTitle}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* --- images ----------------------------------------------------- */}
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <ImageIcon className="h-3.5 w-3.5" />
            {t("stageView.images")} ({formatNumber(images.length, locale)})
          </p>
          {images.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("stageView.noImages")}</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="relative aspect-square overflow-hidden rounded-lg bg-muted"
                >
                  <Image
                    src={img.imageUrl}
                    alt={img.caption ?? ""}
                    fill
                    sizes="120px"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground/70">{t("stageView.readOnlyNote")}</p>
      </DialogContent>
    </Dialog>
  );
}
