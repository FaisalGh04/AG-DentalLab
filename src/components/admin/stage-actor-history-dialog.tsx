"use client";

import * as React from "react";
import { History, UserCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAdminI18n } from "@/components/i18n/admin-i18n";
import { formatDate } from "@/lib/utils";
import type { StageVisitDTO } from "@/types/case";

/**
 * Chronological "who moved this case into which stage, and when".
 *
 * Read-only and derived — it renders `stageHistory` exactly as the server
 * computed it from the audit log and never mutates anything.
 *
 * Dismissal follows the admin convention automatically: DialogContent blocks
 * outside-click and Escape on any /admin route (src/components/ui/dialog.tsx),
 * leaving the X button as the way out.
 */
export function StageActorHistoryDialog({
  open,
  onOpenChange,
  history,
  currentStageId,
  stageLabel,
  receivedBy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  history: StageVisitDTO[];
  /** The stage the case is in NOW — what the "Current" marker keys off. */
  currentStageId: string | null;
  /** Resolves a stage id to its localized label; falls back to the raw id. */
  stageLabel: (stageId: string) => string;
  /** Original receiver, used for the fallback row on pre-audit cases. */
  receivedBy: string;
}) {
  const { t } = useAdminI18n();
  // Newest first: the current stage is what someone opening this wants first.
  const rows = React.useMemo(() => [...history].reverse(), [history]);
  /**
   * Which row is the case's PRESENT position. Matched on currentStageId rather
   * than assumed to be row 0: clearing the workflow writes a transition whose
   * toStageId is null, which this list excludes, leaving a stale row on top
   * that must NOT be labelled current. Also -1 when the current stage was
   * entered before the audit log existed. rows is newest-first, so the first
   * match is that stage's latest entry.
   */
  const currentIndex = currentStageId
    ? rows.findIndex((v) => v.stageId === currentStageId)
    : -1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-brand-700" />
            {t("detail.stageHistoryTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("detail.stageHistoryDescription")}
          </DialogDescription>
        </DialogHeader>

        {rows.length === 0 ? (
          // No transition rows at all: the case predates the audit log. Show the
          // one thing that IS known, clearly labelled as the original receiver
          // rather than dressed up as a recorded stage entry.
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">
              {t("detail.stageHistoryUnavailable")}
            </p>
            <div className="mt-3 flex items-center gap-2 border-t border-border/70 pt-3">
              <UserCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                {t("detail.receivedBy")}
              </span>
              <span className="ms-auto font-medium text-ink">
                {receivedBy || "—"}
              </span>
            </div>
          </div>
        ) : (
          <ol className="space-y-2">
            {rows.map((visit, index) => (
              <li
                key={`${visit.stageId}-${visit.enteredAt}-${index}`}
                className="rounded-xl border border-border bg-card p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={index === currentIndex ? "success" : "secondary"}
                  >
                    {stageLabel(visit.stageId)}
                  </Badge>
                  {index === currentIndex && (
                    // brand-800, not 700: the admin dark theme compensates
                    // 800/900 in globals.css but deliberately not 700, which on
                    // the dark card falls to ~2.2:1 — unreadable.
                    <span className="text-xs font-medium text-brand-800">
                      {t("detail.stageHistoryCurrent")}
                    </span>
                  )}
                  {/* dir=ltr so the timestamp is never bidi-reordered in Arabic. */}
                  <span
                    dir="ltr"
                    className="ms-auto text-xs tabular-nums text-muted-foreground"
                  >
                    {formatDate(visit.enteredAt)} · {formatClockTime(visit.enteredAt)}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
                    {t("detail.stageActorBy")}
                  </span>
                  <span className="font-medium text-ink">
                    {visit.adminName ?? t("detail.stageActorUnknown")}
                  </span>
                  {visit.adminEmail && (
                    <span
                      dir="ltr"
                      className="text-xs text-muted-foreground ltr:text-left rtl:text-right"
                    >
                      {visit.adminEmail}
                    </span>
                  )}
                </div>

                {/* The StaffMember who supplied the confirmation PIN, when the
                    gate was on. Secondary: it answers a different question from
                    "who made the change". */}
                {visit.staffName && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("detail.stageActorConfirmedBy")}: {visit.staffName}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Exact wall-clock time, 24h with seconds. Separate from formatDate so the
 * history can show the precise instant a stage was entered — two transitions
 * minutes apart must be distinguishable.
 */
function formatClockTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}
