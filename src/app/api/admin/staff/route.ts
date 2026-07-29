import type { NextRequest } from "next/server";
import { apiOk, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { getActiveStaff } from "@/lib/staff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/staff — active staff for the "Received By" dropdown and the
 * confirmation dialog's staff picker.
 *
 * Returns ONLY { id, name }. pin_hash, lockout counters and isActive never
 * leave the server: getActiveStaff() selects the two safe columns explicitly.
 * Admin-guarded like every other admin route — the roster is not public.
 *
 * Fail-closed: getActiveStaff throws on a DB error rather than returning a
 * fallback list, so a hiccup surfaces as a 500 instead of a stale roster that
 * might still contain a deactivated member.
 */
export async function GET(req: NextRequest) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const staff = await getActiveStaff();
    return apiOk(staff);
  } catch (err) {
    return handleApiError(err);
  }
}
