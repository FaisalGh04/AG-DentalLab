/**
 * STAGE-OVERDUE DETECTION.
 *
 * A case is overdue when it has sat in one stage longer than that stage allows.
 * Every notification in the admin UI is COMPUTED here, from live rows, on every
 * read — nothing is stored except what the admin did about it (read / muted),
 * which is the one thing that cannot be derived. See the StageOverdueNotice
 * model comment in prisma/schema.prisma for why it is built this way.
 *
 * THE FIVE CONDITIONS (all must hold, and each is enforced below):
 *   1. the case has a current stage                → currentStageId != null
 *   2. that stage has a threshold configured       → overdueAfterMinutes != null
 *   3. the entry time is known                     → currentStageEnteredAt != null
 *   4. now - enteredAt >= threshold
 *   5. the case is still IN that stage — implied rather than checked: the stage
 *      and entry time are read from the case row itself, so a case that moved
 *      on is described by its NEW stage and the old notification simply stops
 *      being computed.
 * Completed cases are excluded outright — a finished case cannot be late.
 *
 * COST. Two indexed queries plus one small state lookup, regardless of how many
 * cases exist:
 *   a) every stage WITH a threshold (a handful of rows; none configured
 *      anywhere → zero further queries and an empty result)
 *   b) active cases whose stage entry precedes the SMALLEST threshold, bounded
 *      by SCAN_LIMIT and served by patient_cases(is_completed, current_stage_entered_at)
 *   c) the read/mute rows for just those cases
 * The exact per-stage threshold is then applied in memory — (b) is a superset
 * prefilter, never the final answer.
 */

import { prisma } from "@/lib/prisma";
import type {
  OverdueNotificationDTO,
  OverdueNotificationsResponse,
} from "@/types/notifications";

/**
 * Hard cap on the candidate scan. A lab with more than this many simultaneously
 * overdue cases has a workflow problem, not a notification problem; the response
 * flags `truncated` so the UI can say so instead of quietly under-reporting.
 */
const SCAN_LIMIT = 200;

/** One (stage-set, stage) pair that has alerting switched on. */
interface ConfiguredStage {
  stageSetId: string;
  stageKey: string;
  labelEn: string;
  labelAr: string;
  minutes: number;
}

/** Key for the per-(collection, stage) threshold lookup. */
function stageSlot(stageSetId: string, stageKey: string): string {
  return stageSetId + "::" + stageKey;
}

/** Key for the per-VISIT state lookup. */
function visitSlot(caseId: string, stageKey: string, enteredAt: Date): string {
  return caseId + "::" + stageKey + "::" + enteredAt.getTime();
}

async function loadConfiguredStages(): Promise<ConfiguredStage[]> {
  const rows = await prisma.caseStage.findMany({
    where: { overdueAfterMinutes: { not: null } },
    select: {
      stageSetId: true,
      stageKey: true,
      labelEn: true,
      labelAr: true,
      overdueAfterMinutes: true,
    },
  });
  return rows.map((r) => ({
    stageSetId: r.stageSetId,
    stageKey: r.stageKey,
    labelEn: r.labelEn,
    labelAr: r.labelAr,
    // Non-null by the where clause; narrowed here for the type system.
    minutes: r.overdueAfterMinutes as number,
  }));
}

/** A genuinely overdue case, before read/mute state is attached. */
export interface OverdueCase {
  caseId: string;
  trackingId: string;
  patientName: string;
  stageKey: string;
  stageLabelEn: string;
  stageLabelAr: string;
  enteredAt: Date;
  dueAt: Date;
  thresholdMinutes: number;
  overdueMinutes: number;
}

/**
 * The overdue cases themselves — no read/mute state, no DTO shaping.
 *
 * Exported because the mutation routes need the SAME set the list route
 * computed: "mute all" must mute exactly what is currently overdue, and a
 * mute/read request for one case must resolve that case's stage and entry time
 * server-side rather than trusting a client-supplied key.
 */
export async function findOverdueCases(
  opts: { caseId?: string; now?: Date } = {},
): Promise<{ cases: OverdueCase[]; truncated: boolean; now: Date }> {
  const now = opts.now ?? new Date();
  const configured = await loadConfiguredStages();
  if (configured.length === 0) return { cases: [], truncated: false, now };

  const byStage = new Map(
    configured.map((c) => [stageSlot(c.stageSetId, c.stageKey), c]),
  );
  const smallest = Math.min(...configured.map((c) => c.minutes));
  // Nothing that entered its stage more recently than the SMALLEST configured
  // threshold can be overdue under ANY threshold, so this prefilter is safe.
  const newestPossible = new Date(now.getTime() - smallest * 60_000);

  const candidates = await prisma.patientCase.findMany({
    where: {
      // A completed case is not waiting on anything.
      isCompleted: false,
      // Conditions 1 + 2 as a coarse pair. These two `in` filters match the
      // cross-product of configured sets and configured stage keys; the exact
      // pairing is re-checked in memory below.
      collectionId: { in: [...new Set(configured.map((c) => c.stageSetId))] },
      currentStageId: { in: [...new Set(configured.map((c) => c.stageKey))] },
      // Conditions 3 + 4, coarsely (smallest threshold).
      currentStageEnteredAt: { not: null, lte: newestPossible },
      ...(opts.caseId ? { id: opts.caseId } : {}),
    },
    select: {
      id: true,
      trackingId: true,
      patientFirstName: true,
      patientLastName: true,
      collectionId: true,
      currentStageId: true,
      currentStageEnteredAt: true,
    },
    // Oldest entry first, so the cap keeps the worst offenders rather than an
    // arbitrary slice.
    orderBy: { currentStageEnteredAt: "asc" },
    take: SCAN_LIMIT + 1,
  });

  const truncated = candidates.length > SCAN_LIMIT;
  const cases: OverdueCase[] = [];

  for (const c of candidates.slice(0, SCAN_LIMIT)) {
    // Narrowing only — the query already excluded nulls on all three.
    if (!c.collectionId || !c.currentStageId || !c.currentStageEnteredAt) {
      continue;
    }
    const stage = byStage.get(stageSlot(c.collectionId, c.currentStageId));
    // Reachable: the coarse filters above admit unconfigured (set, stage) pairs.
    if (!stage) continue;

    const dueAt = new Date(
      c.currentStageEnteredAt.getTime() + stage.minutes * 60_000,
    );
    // Condition 4, exactly: this stage's own threshold, not the smallest one.
    if (dueAt.getTime() > now.getTime()) continue;

    cases.push({
      caseId: c.id,
      trackingId: c.trackingId,
      patientName: (c.patientFirstName + " " + c.patientLastName).trim(),
      stageKey: c.currentStageId,
      stageLabelEn: stage.labelEn,
      stageLabelAr: stage.labelAr,
      enteredAt: c.currentStageEnteredAt,
      dueAt,
      thresholdMinutes: stage.minutes,
      overdueMinutes: Math.floor((now.getTime() - dueAt.getTime()) / 60_000),
    });
  }

  // Most overdue first. The query ordered by ENTRY time, which is only the same
  // ranking when every stage shares one threshold.
  cases.sort((a, b) => b.overdueMinutes - a.overdueMinutes);
  return { cases, truncated, now };
}

/**
 * The full admin payload: overdue cases joined with their persisted read/mute
 * state. `caseId` scopes it to one case, for the case-detail bell.
 */
export async function listOverdueNotifications(
  opts: { caseId?: string } = {},
): Promise<OverdueNotificationsResponse> {
  const { cases, truncated, now } = await findOverdueCases(opts);

  if (cases.length === 0) {
    return {
      items: [],
      unreadCount: 0,
      activeCount: 0,
      mutedCount: 0,
      truncated,
      computedAt: now.toISOString(),
    };
  }

  // State rows exist only for notifications the admin has acted on, so this
  // returns far fewer rows than `cases` in the common case.
  const states = await prisma.stageOverdueNotice.findMany({
    where: { caseId: { in: cases.map((c) => c.caseId) } },
    select: {
      caseId: true,
      stageKey: true,
      stageEnteredAt: true,
      readAt: true,
      mutedAt: true,
    },
  });
  // Keyed by VISIT, so state left over from an earlier visit to the same stage
  // never leaks onto the current one.
  const stateByVisit = new Map(
    states.map((s) => [visitSlot(s.caseId, s.stageKey, s.stageEnteredAt), s]),
  );

  const items: OverdueNotificationDTO[] = cases.map((c) => {
    const st = stateByVisit.get(visitSlot(c.caseId, c.stageKey, c.enteredAt));
    return {
      caseId: c.caseId,
      trackingId: c.trackingId,
      patientName: c.patientName,
      stageKey: c.stageKey,
      stageLabelEn: c.stageLabelEn,
      stageLabelAr: c.stageLabelAr,
      enteredAt: c.enteredAt.toISOString(),
      dueAt: c.dueAt.toISOString(),
      thresholdMinutes: c.thresholdMinutes,
      overdueMinutes: c.overdueMinutes,
      read: st?.readAt != null,
      muted: st?.mutedAt != null,
    };
  });

  return {
    items,
    // Muted notifications are not outstanding work — they are explicitly
    // parked, so they leave the badge as well as the red bar.
    unreadCount: items.filter((i) => !i.muted && !i.read).length,
    activeCount: items.filter((i) => !i.muted).length,
    mutedCount: items.filter((i) => i.muted).length,
    truncated,
    computedAt: now.toISOString(),
  };
}

/**
 * Create-or-update the state row for a set of currently-overdue cases.
 *
 * `caseIds` is intersected with what is ACTUALLY overdue right now, so a request
 * naming an arbitrary case writes nothing: the (stage, visit) half of the key
 * comes from the server's own scan and never from the caller. Returns the cases
 * it touched, so the route can audit them by tracking id.
 */
export async function applyNoticeState(
  patch: { readAt?: Date | null; mutedAt?: Date | null },
  target: { caseIds?: string[]; all?: boolean },
): Promise<OverdueCase[]> {
  const { cases } = await findOverdueCases();
  const wanted = target.all
    ? cases
    : cases.filter((c) => (target.caseIds ?? []).includes(c.caseId));
  if (wanted.length === 0) return [];

  // One transaction, one single-row upsert per notification on a unique key.
  // Bounded by SCAN_LIMIT.
  await prisma.$transaction(
    wanted.map((c) =>
      prisma.stageOverdueNotice.upsert({
        where: {
          caseId_stageKey_stageEnteredAt: {
            caseId: c.caseId,
            stageKey: c.stageKey,
            stageEnteredAt: c.enteredAt,
          },
        },
        create: {
          caseId: c.caseId,
          stageKey: c.stageKey,
          stageEnteredAt: c.enteredAt,
          ...patch,
        },
        update: patch,
      }),
    ),
  );
  return wanted;
}
