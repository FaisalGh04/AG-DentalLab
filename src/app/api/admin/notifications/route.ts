import type { NextRequest } from "next/server";
import { apiOk, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { listOverdueNotifications } from "@/lib/stage-overdue-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/notifications — active stage-overdue notifications.
 *
 * ADMIN ONLY, like every route under /api/admin: requireAdmin rejects anything
 * without an admin session. There is deliberately no public counterpart — the
 * payload carries unredacted patient names and internal case ids, neither of
 * which the /track tracker is ever allowed to see.
 *
 * `?caseId=` scopes the scan to one case for the case-detail bell. Everything is
 * computed live (see stage-overdue-service), so this is safe to poll.
 */
export async function GET(req: NextRequest) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const caseId = req.nextUrl.searchParams.get("caseId")?.trim();
    const data = await listOverdueNotifications(
      caseId ? { caseId } : {},
    );
    return apiOk(data);
  } catch (err) {
    return handleApiError(err);
  }
}
