import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { apiError, apiOk, handleApiError, rateLimited } from "@/lib/api";
import { buildActionLog } from "@/lib/case-audit";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/ratelimit";
import {
  clearStaffManagementCookie,
  generateStaffManagementToken,
  getStaffManagementSession,
  hashStaffManagementToken,
  setStaffManagementCookie,
  staffManagementExpiry,
} from "@/lib/staff-management-auth";
import { verifyManagerConfirmation } from "@/lib/staff-auth";
import { staffManagementUnlockSchema } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;
    const admin = await auth();
    const adminId = admin?.user?.id;
    if (!adminId) return apiError("Unauthorized", 401);

    const session = await getStaffManagementSession(req, adminId);
    return apiOk({
      unlocked: !!session,
      expiresAt: session?.expiresAt.toISOString() ?? null,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const input = staffManagementUnlockSchema.parse(await req.json());
    const ip = getClientIp(req.headers);
    const admin = await auth();
    const adminId = admin?.user?.id;
    if (!adminId) return apiError("Unauthorized", 401);

    // Always PRIMARY-only and independent of staffConfirmationEnabled.
    const confirmation = await verifyManagerConfirmation(input.managerCode, ip);
    if (!confirmation.ok) {
      await prisma.caseActionLog.create({
        data: buildActionLog({
          caseId: null,
          trackingId: null,
          action: "STAFF_MANAGEMENT_ACCESS",
          outcome:
            confirmation.reason === "locked"
              ? "LOCKED_OUT"
              : "CONFIRMATION_FAILED",
          singleFactor: confirmation.singleFactor,
          adminEmail: admin.user.email ?? null,
          ip,
        }),
      });
      if (confirmation.reason === "throttled") {
        return rateLimited(confirmation.retryAfter ?? Date.now() + 60_000);
      }
      return apiError("Manager confirmation failed.", 401);
    }

    const token = generateStaffManagementToken();
    const tokenHash = hashStaffManagementToken(token);
    const expiresAt = staffManagementExpiry();

    await prisma.$transaction(async (tx) => {
      await tx.staffManagementSession.deleteMany({
        where: { OR: [{ adminId }, { expiresAt: { lte: new Date() } }] },
      });
      await tx.staffManagementSession.create({
        data: { tokenHash, adminId, expiresAt },
      });
      await tx.caseActionLog.create({
        data: buildActionLog({
          caseId: null,
          trackingId: null,
          action: "STAFF_MANAGEMENT_ACCESS",
          outcome: "SUCCESS",
          staffId: confirmation.staffId,
          staffName: confirmation.staffName,
          singleFactor: confirmation.singleFactor,
          adminEmail: admin.user.email ?? null,
          ip,
        }),
      });
    });

    const response = apiOk({ unlocked: true, expiresAt: expiresAt.toISOString() });
    setStaffManagementCookie(response, token, expiresAt);
    return response;
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;
    const admin = await auth();
    const adminId = admin?.user?.id;
    if (!adminId) return apiError("Unauthorized", 401);

    const session = await getStaffManagementSession(req, adminId);
    if (session) {
      await prisma.staffManagementSession.deleteMany({ where: { id: session.id } });
    }
    const response = apiOk({ unlocked: false, expiresAt: null });
    clearStaffManagementCookie(response);
    return response;
  } catch (err) {
    return handleApiError(err);
  }
}
