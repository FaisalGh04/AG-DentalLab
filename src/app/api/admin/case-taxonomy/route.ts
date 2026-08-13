import type { NextRequest } from "next/server";
import { apiOk, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { getCaseTaxonomy } from "@/lib/case-taxonomy-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;
    return apiOk(await getCaseTaxonomy());
  } catch (err) {
    console.error("[case-taxonomy] failed to load taxonomy:", err);
    return handleApiError(err);
  }
}
