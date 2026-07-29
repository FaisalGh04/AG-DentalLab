import type { NextRequest } from "next/server";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { rotateDoctorCode } from "@/lib/doctor-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/doctors/[id]/rotate — reissue the code.
 *
 * Regenerates ONLY the random 4-character suffix and stamps codeRotatedAt. The
 * {letters}{sequence} part stays stable, so a doctor who has memorised
 * "mut001" keeps that; only the secret part changes.
 *
 * The OLD CODE STOPS WORKING IMMEDIATELY. Deliberately a separate endpoint from
 * PATCH so reissuing a credential can never happen as a side effect of an edit.
 */
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const { id } = await params;
    return apiOk(await rotateDoctorCode(id));
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      ((err as { code?: string }).code === "P2025" ||
        (err as Error).message === "Doctor not found")
    ) {
      return apiError("Doctor not found", 404);
    }
    return handleApiError(err);
  }
}
