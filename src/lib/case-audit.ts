// Lifecycle diff-detection + audit logging for the confirmation gate.
//
// THE CENTRAL CONSTRAINT: PATCH /api/admin/cases/[id] serves BOTH gated
// transitions and ordinary field edits (notes, doctor, dates). Gating the route
// wholesale would break everyday editing, so the gate keys off the DIFF: we
// compare the would-be normalized lifecycle against the persisted row and
// require confirmation only when it actually changes.
//
// The comparison runs on the POST-normalization value on purpose. A collection
// change DERIVES a new currentStageId server-side (normalizeLifecycle), so
// comparing raw input would miss it.

import type { CaseActionType, PatientCase, Prisma } from "@prisma/client";
import type { NormalizedLifecycle } from "@/lib/production-templates";

export interface LifecycleSnapshot {
  collectionId: string | null;
  currentStageId: string | null;
  hiddenStageIds: string[];
  isCompleted: boolean;
}

export interface LifecycleChange {
  action: CaseActionType;
  from: LifecycleSnapshot;
  to: LifecycleSnapshot;
}

/** Order-insensitive comparison — reordering hiddenStageIds is NOT a change. */
function sameSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const x = [...a].sort();
  const y = [...b].sort();
  return x.every((v, i) => v === y[i]);
}

function snapshot(v: {
  collectionId: string | null;
  currentStageId: string | null;
  hiddenStageIds: string[];
  isCompleted: boolean;
}): LifecycleSnapshot {
  return {
    collectionId: v.collectionId,
    currentStageId: v.currentStageId,
    hiddenStageIds: [...v.hiddenStageIds],
    isCompleted: v.isCompleted,
  };
}

/**
 * Returns null when nothing lifecycle-related changes → no confirmation
 * required, no log written. That null path is what keeps plain edits ungated.
 *
 * Also returns null for no-ops (re-selecting the stage a case is already on),
 * so the StageStepper does not demand a manager code for clicking the current
 * stage.
 */
export function detectLifecycleChange(
  existing: Pick<
    PatientCase,
    "collectionId" | "currentStageId" | "hiddenStageIds" | "isCompleted"
  >,
  next: NormalizedLifecycle,
): LifecycleChange | null {
  const collectionChanged = next.collectionId !== existing.collectionId;
  const stageChanged = next.currentStageId !== existing.currentStageId;
  const hiddenChanged = !sameSet(next.hiddenStageIds, existing.hiddenStageIds);

  if (!collectionChanged && !stageChanged && !hiddenChanged) return null;

  // Precedence: a collection change subsumes the stage reset it causes.
  const action: CaseActionType = collectionChanged
    ? "COLLECTION_CHANGED"
    : stageChanged
      ? "STAGE_CHANGED"
      : "STAGE_VISIBILITY_CHANGED";

  return { action, from: snapshot(existing), to: snapshot(next) };
}

export interface ActionLogInput {
  caseId: string | null;
  trackingId: string | null;
  action: CaseActionType;
  outcome: "SUCCESS" | "CONFIRMATION_FAILED" | "LOCKED_OUT";
  change?: LifecycleChange | null;
  staffId?: string | null;
  staffName?: string | null;
  usedBreakGlass?: boolean;
  adminEmail?: string | null;
  ip?: string | null;
}

/**
 * Build the CaseActionLog row. Returned as data (not written) so the caller can
 * include it in the SAME transaction as the mutation — a confirmed action must
 * never exist without its log line.
 *
 * Never accepts or stores the attempted secret.
 */
export function buildActionLog(
  input: ActionLogInput,
): Prisma.CaseActionLogCreateInput {
  const c = input.change;
  return {
    action: input.action,
    outcome: input.outcome,
    trackingIdSnapshot: input.trackingId,
    fromCollectionId: c?.from.collectionId ?? null,
    toCollectionId: c?.to.collectionId ?? null,
    fromStageId: c?.from.currentStageId ?? null,
    toStageId: c?.to.currentStageId ?? null,
    hiddenBefore: c?.from.hiddenStageIds ?? [],
    hiddenAfter: c?.to.hiddenStageIds ?? [],
    // Captured explicitly: toggleHidden can COMPLETE a case with no stage change.
    isCompletedBefore: c?.from.isCompleted ?? null,
    isCompletedAfter: c?.to.isCompleted ?? null,
    staffNameSnapshot: input.staffName ?? null,
    usedBreakGlass: input.usedBreakGlass ?? false,
    adminEmail: input.adminEmail ?? null,
    ip: input.ip ?? null,
    ...(input.caseId ? { case: { connect: { id: input.caseId } } } : {}),
    ...(input.staffId ? { staff: { connect: { id: input.staffId } } } : {}),
  };
}
