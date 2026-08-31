import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { apiOk, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { getClientIp } from "@/lib/ratelimit";
import { resolveActingAdmin } from "@/lib/admin-accounts";
import { auditNoticeActions } from "@/lib/notification-audit";
import { applyNoticeState } from "@/lib/stage-overdue-service";
import { noticeReadSchema } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/notifications/read — mark notifications as read.
 *
 * `{ caseIds: [...] }` marks those; `{ all: true }` is Read all, which covers
 * every notification that is overdue AT THIS MOMENT (the server recomputes the
 * set rather than trusting a list the client rendered some seconds ago).
 *
 * Reading is idempotent and re-runnable: an already-read notification is
 * upserted to the same state.
 */
export async function POST(req: NextRequest) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const input = noticeReadSchema.parse(await req.json());
    const touched = await applyNoticeState({ readAt: new Date() }, input);

    // Read-all is audited as ONE row: a per-case row per bulk click would bury
    // the mute/unmute decisions that actually matter in the same trail. A
    // targeted read is a UI side effect of opening an item and is not audited
    // at all — the task asks for mute, unmute, read-all and duration changes.
    if (input.all && touched.length > 0) {
      const session = await auth();
      const actingAdmin = await resolveActingAdmin(session?.user?.id);
      await auditNoticeActions([
        {
          action: "STAGE_OVERDUE_READ_ALL",
          adminEmail: actingAdmin?.email ?? session?.user?.email ?? null,
          adminName: actingAdmin?.displayName ?? null,
          ip: getClientIp(req.headers),
        },
      ]);
    }

    return apiOk({ updated: touched.length });
  } catch (err) {
    return handleApiError(err);
  }
}
