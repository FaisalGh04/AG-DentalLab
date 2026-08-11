import type { NextRequest } from "next/server";
import { apiError, apiOk, handleApiError } from "@/lib/api";
import { getClientIp } from "@/lib/ratelimit";
import {
  StaffManagementError,
  updateManagedStaff,
} from "@/lib/staff-management";
import { requireStaffManagementAccess } from "@/lib/staff-management-auth";
import { staffUpdateSchema } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const access = await requireStaffManagementAccess(req);
    if (!access.ok) return access.response;
    const { id } = await params;
    const input = staffUpdateSchema.parse(await req.json());
    const updated = await updateManagedStaff(id, input, {
      adminEmail: access.adminEmail,
      ip: getClientIp(req.headers),
    });
    return apiOk(updated);
  } catch (err) {
    if (err instanceof StaffManagementError) {
      return apiError(err.message, err.status);
    }
    if (
      typeof err === "object" &&
      err !== null &&
      (err as { code?: string }).code === "P2002"
    ) {
      return apiError("A staff member with that name already exists.", 409);
    }
    return handleApiError(err);
  }
}
