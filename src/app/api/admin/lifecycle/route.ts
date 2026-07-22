import type { NextRequest } from "next/server";
import { apiOk, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { getLifecycleConfig } from "@/lib/lifecycle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/lifecycle — the DB-backed lifecycle config (collections + stages),
 * in canonical display order. Consumed by the admin client via useLifecycleConfig()
 * so the case forms / progress / detail views read admin-managed groups & stages.
 */
export async function GET(req: NextRequest) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const config = await getLifecycleConfig();
    return apiOk(config);
  } catch (err) {
    return handleApiError(err);
  }
}
