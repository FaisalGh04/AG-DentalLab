import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";
import { apiError, apiOk, handleApiError, rateLimited } from "@/lib/api";
import { buildActionLog } from "@/lib/case-audit";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/ratelimit";
import {
  clearStaffManagementCookie,
  requireStaffManagementAccess,
} from "@/lib/staff-management-auth";
import {
  BCRYPT_COST,
  verifyManagerConfirmation,
} from "@/lib/staff-auth";
import { managerSecretChangeSchema } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  try {
    const access = await requireStaffManagementAccess(req);
    if (!access.ok) return access.response;

    const input = managerSecretChangeSchema.parse(await req.json());
    const ip = getClientIp(req.headers);
    // Rotation requires the current PRIMARY secret again, even during an
    // already-unlocked management session.
    const confirmation = await verifyManagerConfirmation(
      input.currentManagerCode,
      ip,
    );
    if (!confirmation.ok) {
      await prisma.caseActionLog.create({
        data: buildActionLog({
          caseId: null,
          trackingId: null,
          action: "MANAGER_SECRET_UPDATED",
          outcome:
            confirmation.reason === "locked"
              ? "LOCKED_OUT"
              : "CONFIRMATION_FAILED",
          singleFactor: confirmation.singleFactor,
          adminEmail: access.adminEmail,
          ip,
        }),
      });
      if (confirmation.reason === "throttled") {
        return rateLimited(confirmation.retryAfter ?? Date.now() + 60_000);
      }
      return apiError("Current manager confirmation failed.", 401);
    }

    const codeHash = await bcrypt.hash(input.newManagerCode, BCRYPT_COST);
    await prisma.$transaction(async (tx) => {
      await tx.managerSecret.upsert({
        where: { kind: "PRIMARY" },
        create: { kind: "PRIMARY", codeHash },
        update: { codeHash, lastUsedAt: null },
      });
      // Credential rotation revokes every outstanding management unlock.
      await tx.staffManagementSession.deleteMany();
      await tx.caseActionLog.create({
        data: buildActionLog({
          caseId: null,
          trackingId: null,
          action: "MANAGER_SECRET_UPDATED",
          outcome: "SUCCESS",
          staffId: confirmation.staffId,
          staffName: confirmation.staffName,
          singleFactor: confirmation.singleFactor,
          adminEmail: access.adminEmail,
          ip,
        }),
      });
    });

    const response = apiOk({ updated: true });
    clearStaffManagementCookie(response);
    return response;
  } catch (err) {
    return handleApiError(err);
  }
}
