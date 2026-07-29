import type { NextRequest } from "next/server";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { listDoctors, createDoctor } from "@/lib/doctor-service";
import { doctorCreateSchema } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/doctors — full roster with linked-case counts.
 *
 * ADMIN-ONLY. `code` is the public portal credential, so this must never be
 * reachable without a session.
 */
export async function GET(req: NextRequest) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;
    return apiOk(await listDoctors());
  } catch (err) {
    return handleApiError(err);
  }
}

/** POST /api/admin/doctors — create a doctor and issue its code. */
export async function POST(req: NextRequest) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const input = doctorCreateSchema.parse(await req.json());
    const created = await createDoctor(input);
    return apiOk(created, 201);
  } catch (err) {
    // A duplicate code should be impossible (the sequence differentiates), so
    // surface it explicitly rather than as a generic 500 if it ever happens.
    if (
      typeof err === "object" &&
      err !== null &&
      (err as { code?: string }).code === "P2002"
    ) {
      return apiError("That doctor code is already in use.", 409);
    }
    return handleApiError(err);
  }
}
