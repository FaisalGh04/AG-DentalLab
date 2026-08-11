import type { NextRequest } from "next/server";
import { apiError, apiOk, handleApiError } from "@/lib/api";
import { getClientIp } from "@/lib/ratelimit";
import {
  createManagedStaff,
  listManagedStaff,
  StaffManagementError,
} from "@/lib/staff-management";
import { requireStaffManagementAccess } from "@/lib/staff-management-auth";
import { staffCreateSchema } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const access = await requireStaffManagementAccess(req);
    if (!access.ok) return access.response;
    return apiOk(await listManagedStaff());
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const access = await requireStaffManagementAccess(req);
    if (!access.ok) return access.response;
    const input = staffCreateSchema.parse(await req.json());
    const created = await createManagedStaff(input, {
      adminEmail: access.adminEmail,
      ip: getClientIp(req.headers),
    });
    return apiOk(created, 201);
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
