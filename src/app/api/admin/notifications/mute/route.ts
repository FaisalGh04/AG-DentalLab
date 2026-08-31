import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { apiOk, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { getClientIp } from "@/lib/ratelimit";
import { resolveActingAdmin } from "@/lib/admin-accounts";
import { auditNoticeActions } from "@/lib/notification-audit";
import { applyNoticeState } from "@/lib/stage-overdue-service";
import { noticeMuteSchema } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/notifications/mute — mute or unmute notifications.
 *
 * One endpoint for all four UI affordances:
 *   { caseIds: [id], muted: true }   → Mute this one
 *   { caseIds: [id], muted: false }  → Unmute this one
 *   { all: true, muted: true }       → Mute all
 *   { all: true, muted: false }      → Unmute all
 *
 * `all` is resolved against the CURRENT overdue set server-side, so Mute all
 * never touches a case that stopped being overdue since the page rendered.
 *
 * Unmuting writes mutedAt = null, which restores the notification to the red
 * alert bar for as long as the case is still overdue in the same stage visit —
 * if it has moved on, there is nothing to restore and nothing is written.
 */
export async function POST(req: NextRequest) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const input = noticeMuteSchema.parse(await req.json());
    const touched = await applyNoticeState(
      { mutedAt: input.muted ? new Date() : null },
      input,
    );

    if (touched.length > 0) {
      const session = await auth();
      const actingAdmin = await resolveActingAdmin(session?.user?.id);
      const adminEmail = actingAdmin?.email ?? session?.user?.email ?? null;
      const adminName = actingAdmin?.displayName ?? null;
      const ip = getClientIp(req.headers);
      // One row per notification, even for Mute all: which cases were silenced
      // is the whole point of auditing this, and a single "muted 12" row would
      // not answer that later.
      await auditNoticeActions(
        touched.map((c) => ({
          action: input.muted
            ? ("STAGE_OVERDUE_MUTED" as const)
            : ("STAGE_OVERDUE_UNMUTED" as const),
          caseId: c.caseId,
          trackingId: c.trackingId,
          stageKey: c.stageKey,
          adminEmail,
          adminName,
          ip,
        })),
      );
    }

    return apiOk({ updated: touched.length });
  } catch (err) {
    return handleApiError(err);
  }
}
