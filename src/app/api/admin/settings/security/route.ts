import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import {
  apiError,
  apiOk,
  handleApiError,
  rateLimited,
} from "@/lib/api";
import { buildActionLog } from "@/lib/case-audit";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/ratelimit";
import {
  GLOBAL_SECURITY_SETTING_ID,
  getSecuritySettings,
} from "@/lib/security-settings";
import { verifyManagerConfirmation } from "@/lib/staff-auth";
import { securitySettingUpdateSchema } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;
    return apiOk(await getSecuritySettings());
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const input = securitySettingUpdateSchema.parse(await req.json());
    const ip = getClientIp(req.headers);
    const session = await auth();

    // This check is unconditional. It never consults the setting being changed,
    // so disabling protection cannot make re-enabling or future toggles bypass it.
    const confirmation = await verifyManagerConfirmation(input.managerCode, ip);
    const action = input.enabled
      ? "STAFF_CONFIRMATION_ENABLED"
      : "STAFF_CONFIRMATION_DISABLED";

    if (!confirmation.ok) {
      await prisma.caseActionLog.create({
        data: buildActionLog({
          caseId: null,
          trackingId: null,
          action,
          outcome:
            confirmation.reason === "locked"
              ? "LOCKED_OUT"
              : "CONFIRMATION_FAILED",
          singleFactor: confirmation.singleFactor,
          adminEmail: session?.user?.email ?? null,
          ip,
        }),
      });

      if (confirmation.reason === "throttled") {
        return rateLimited(confirmation.retryAfter ?? Date.now() + 60_000);
      }
      return apiError("Manager confirmation failed.", 401);
    }

    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.adminSecuritySetting.findUnique({
        where: { id: GLOBAL_SECURITY_SETTING_ID },
      });

      if (current?.staffConfirmationEnabled === input.enabled) {
        return current;
      }

      const setting = await tx.adminSecuritySetting.upsert({
        where: { id: GLOBAL_SECURITY_SETTING_ID },
        create: {
          id: GLOBAL_SECURITY_SETTING_ID,
          staffConfirmationEnabled: input.enabled,
        },
        update: { staffConfirmationEnabled: input.enabled },
      });

      await tx.caseActionLog.create({
        data: buildActionLog({
          caseId: null,
          trackingId: null,
          action,
          outcome: "SUCCESS",
          staffId: confirmation.staffId,
          staffName: confirmation.staffName,
          usedBreakGlass: confirmation.usedBreakGlass,
          singleFactor: confirmation.singleFactor,
          adminEmail: session?.user?.email ?? null,
          ip,
        }),
      });

      return setting;
    });

    return apiOk({
      staffConfirmationEnabled: result.staffConfirmationEnabled,
      updatedAt: result.updatedAt.toISOString(),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
