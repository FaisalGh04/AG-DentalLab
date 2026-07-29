import type { NextRequest } from "next/server";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import {
  renameDoctor,
  setDoctorActive,
  deleteDoctor,
  countLinkedCases,
} from "@/lib/doctor-service";
import { doctorUpdateSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH /api/admin/doctors/[id] — rename and/or activate-deactivate.
 *
 * `code`, `codeLetters` and `sequence` are IMMUTABLE once issued: cases link to
 * the doctor and the code may already be in a doctor's phone. doctorUpdateSchema
 * has no such fields, and because zod objects are non-strict an injected one is
 * silently stripped — but we reject loudly instead, so a real client bug is not
 * mistaken for a successful save. (Same reasoning as receivedBy on cases.)
 */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const body = await req.json();
    for (const field of ["code", "codeLetters", "sequence"] as const) {
      if (body && typeof body === "object" && field in body) {
        return apiError(
          `"${field}" cannot be changed after the doctor is created. Use the rotate endpoint to reissue a code.`,
          422,
        );
      }
    }

    const { id } = await params;
    const input = doctorUpdateSchema.parse(body);

    let result =
      input.name !== undefined ? await renameDoctor(id, input.name) : null;
    if (input.isActive !== undefined) {
      result = await setDoctorActive(id, input.isActive);
    }
    if (!result) return apiError("Nothing to update.", 422);

    return apiOk(result);
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      (err as { code?: string }).code === "P2025"
    ) {
      return apiError("Doctor not found", 404);
    }
    return handleApiError(err);
  }
}

/**
 * GET /api/admin/doctors/[id] — used by the delete confirmation to show how
 * many cases would be UNLINKED (never deleted).
 */
export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;
    const { id } = await params;
    const doctor = await prisma.doctor.findUnique({ where: { id } });
    if (!doctor) return apiError("Doctor not found", 404);
    return apiOk({ id, linkedCases: await countLinkedCases(id) });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * DELETE /api/admin/doctors/[id].
 *
 * Linked cases are NOT deleted — the FK is ON DELETE SET NULL, so each case
 * keeps its doctorName snapshot and simply becomes unlinked. The response
 * reports how many were affected so the UI can confirm what happened.
 */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;
    const { id } = await params;
    const { unlinkedCases } = await deleteDoctor(id);
    return apiOk({ id, unlinkedCases });
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      (err as { code?: string }).code === "P2025"
    ) {
      return apiError("Doctor not found", 404);
    }
    return handleApiError(err);
  }
}
