import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { apiError, apiOk, handleApiError, rateLimited } from "@/lib/api";
import { buildActionLog } from "@/lib/case-audit";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/ratelimit";
import { verifyManagerConfirmation } from "@/lib/staff-auth";
import { ownerPasswordChangeSchema } from "@/lib/validations";
import {
  ADMIN_BCRYPT_COST,
  OWNER_EMAIL,
  isOwnerEmail,
} from "@/lib/admin-accounts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST — change the OWNER's own login password.
 *
 * THE STRICT RULE, chosen deliberately. The brief allowed treating the manager
 * PIN as the highest authority and letting any admin change the owner password;
 * this implementation does NOT, because that reading is ambiguous and the
 * permissive version is unrecoverable if it is wrong — anyone holding the
 * manager code could seize the owner account. Three independent factors are
 * required, and all three are verified server-side:
 *
 *   1. the SIGNED-IN SESSION is the owner (not a claim in the body)
 *   2. the CURRENT owner password (bcrypt.compare against the stored hash)
 *   3. the PRIMARY manager code
 *
 * Ordered so the cheapest, least informative check runs first: a non-owner is
 * refused before any password comparison or manager verification happens.
 *
 * Like the sibling route, verifyManagerConfirmation() never consults
 * AdminSecuritySetting, so the staff-confirmation toggle cannot weaken this.
 */
export async function POST(req: NextRequest) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const ip = getClientIp(req.headers);
    const session = await auth();
    const adminEmail = session?.user?.email ?? null;

    // FACTOR 1 — identity, taken from the session only. Checked BEFORE parsing
    // the body: a non-owner learns nothing about the expected shape, and no
    // password material is read from a caller who may not use this endpoint.
    if (!isOwnerEmail(adminEmail)) {
      await prisma.caseActionLog.create({
        data: buildActionLog({
          caseId: null,
          trackingId: `admin:${OWNER_EMAIL}`,
          action: "OWNER_PASSWORD_CHANGE_FAILED",
          // Nothing was confirmed yet; this is a policy refusal.
          outcome: "BLOCKED",
          adminEmail,
          ip,
        }),
      });
      return apiError(
        "Only the owner can change the owner password.",
        403,
      );
    }

    const input = ownerPasswordChangeSchema.parse(await req.json());

    // Read the row by the OWNER EMAIL rather than the session id: this endpoint
    // is defined as acting on the owner account, so it resolves the owner the
    // same way isOwnerEmail does. Belt and braces — factor 1 already proved the
    // session is that account.
    const owner = await prisma.admin.findUnique({
      where: { email: OWNER_EMAIL },
      select: { id: true, email: true, passwordHash: true },
    });
    if (!owner) {
      return apiError("Owner account not found.", 404);
    }

    // FACTOR 2 — the current password.
    const currentOk = await bcrypt.compare(
      input.currentPassword,
      owner.passwordHash,
    );
    if (!currentOk) {
      await prisma.caseActionLog.create({
        data: buildActionLog({
          caseId: null,
          trackingId: `admin:${owner.email}`,
          action: "OWNER_PASSWORD_CHANGE_FAILED",
          outcome: "CONFIRMATION_FAILED",
          adminEmail,
          ip,
        }),
      });
      // One generic message for both wrong-password and wrong-manager-code
      // below: never reveal which factor was wrong.
      return apiError("Password change failed.", 401);
    }

    // FACTOR 3 — the PRIMARY manager code.
    const confirmation = await verifyManagerConfirmation(input.managerCode, ip);
    if (!confirmation.ok) {
      await prisma.caseActionLog.create({
        data: buildActionLog({
          caseId: null,
          trackingId: `admin:${owner.email}`,
          action: "OWNER_PASSWORD_CHANGE_FAILED",
          outcome:
            confirmation.reason === "locked"
              ? "LOCKED_OUT"
              : "CONFIRMATION_FAILED",
          singleFactor: confirmation.singleFactor,
          adminEmail,
          ip,
        }),
      });
      if (confirmation.reason === "throttled") {
        return rateLimited(confirmation.retryAfter ?? Date.now() + 60_000);
      }
      return apiError("Password change failed.", 401);
    }

    const passwordHash = await bcrypt.hash(
      input.newPassword,
      ADMIN_BCRYPT_COST,
    );

    await prisma.$transaction(async (tx) => {
      await tx.admin.update({
        where: { id: owner.id },
        data: { passwordHash },
      });
      await tx.caseActionLog.create({
        data: buildActionLog({
          caseId: null,
          trackingId: `admin:${owner.email}`,
          action: "OWNER_PASSWORD_CHANGED",
          outcome: "SUCCESS",
          staffId: confirmation.staffId,
          staffName: confirmation.staffName,
          usedBreakGlass: confirmation.usedBreakGlass,
          singleFactor: confirmation.singleFactor,
          adminEmail,
          ip,
        }),
      });
    });

    // No password material in the response. `sessionsRemainValid` is stated
    // explicitly so the UI can warn honestly: sessions are stateless JWTs
    // (src/auth.config.ts, 8 h), so existing sign-ins are NOT revoked by this
    // change. See the note in the settings dialog.
    return apiOk({ changed: true, sessionsRemainValid: true });
  } catch (err) {
    return handleApiError(err);
  }
}
