/**
 * Audit rows for stage-overdue notification actions.
 *
 * Deliberately NOT routed through buildActionLog(): that builder exists to
 * record a LifecycleChange, and every row it writes carries from/to collection,
 * hidden-stage arrays and isCompletedBefore/After. Muting an alert changes none
 * of those, and passing a synthetic change would write `isCompletedBefore:
 * false` on a row where nothing about completion happened — a small lie in a
 * trail this codebase keeps scrupulously honest (see the CaseActionLog model
 * comments). These rows therefore set only the columns that are actually true:
 * what happened, to which case and stage, and who was signed in.
 */

import type { CaseActionType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface NoticeAuditEntry {
  action: CaseActionType;
  /** Null for scope-wide actions (read-all) and for config changes. */
  caseId?: string | null;
  trackingId?: string | null;
  /** The stage the action concerned, recorded in the existing to_stage_id column. */
  stageKey?: string | null;
  adminEmail?: string | null;
  adminName?: string | null;
  ip?: string | null;
}

function toRow(e: NoticeAuditEntry): Prisma.CaseActionLogCreateManyInput {
  return {
    action: e.action,
    outcome: "SUCCESS",
    caseId: e.caseId ?? null,
    trackingIdSnapshot: e.trackingId ?? null,
    toStageId: e.stageKey ?? null,
    adminEmail: e.adminEmail ?? null,
    adminNameSnapshot: e.adminName ?? null,
    ip: e.ip ?? null,
  };
}

/**
 * Write audit rows for a notification action. One statement regardless of how
 * many notifications were affected.
 *
 * Failures are swallowed with a server-side log ON PURPOSE, and this is the one
 * place in the codebase where that is right: a lifecycle mutation must never
 * exist without its log line, but muting an alert is a UI preference with no
 * security consequence, and failing the admin's click because an audit insert
 * hiccuped would be a worse outcome than a missing line.
 */
export async function auditNoticeActions(
  entries: NoticeAuditEntry[],
): Promise<void> {
  if (entries.length === 0) return;
  try {
    await prisma.caseActionLog.createMany({ data: entries.map(toRow) });
  } catch (err) {
    console.error("[notifications] audit write failed:", err);
  }
}
