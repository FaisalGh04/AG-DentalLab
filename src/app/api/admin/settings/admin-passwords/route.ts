import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { apiError, apiOk, handleApiError, rateLimited } from "@/lib/api";
import { buildActionLog } from "@/lib/case-audit";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/ratelimit";
import { verifyManagerConfirmation } from "@/lib/staff-auth";
import { adminPasswordResetSchema } from "@/lib/validations";
import {
  ADMIN_BCRYPT_COST,
  OWNER_EMAIL,
  isOwnerEmail,
} from "@/lib/admin-accounts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin ACCOUNT password management — the `admins` rows behind NextAuth login.
 *
 * MANAGER-GATED, ALWAYS. Every mutation here calls verifyManagerConfirmation(),
 * which is PRIMARY-only and does NOT consult AdminSecuritySetting. Turning the
 * staff-confirmation toggle off therefore cannot open this surface — exactly the
 * posture of /api/admin/settings/security, and for the same reason: a switch
 * that could disable the protection guarding password changes would be worthless.
 *
 * SECRET HANDLING: a password hash is never selected, never returned and never
 * logged. The new password is CHOSEN by the manager and travels inbound only —
 * nothing here generates one, and no response, audit row or log line carries
 * password material in either direction.
 */

/** GET — list the NON-OWNER admin accounts. Never returns a hash. */
export async function GET(req: NextRequest) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    // The owner is excluded in the QUERY, not filtered in JS afterwards, so the
    // row never enters the process to begin with. `select` is an allowlist:
    // passwordHash is absent by construction, not by omission.
    const admins = await prisma.admin.findMany({
      where: { email: { not: OWNER_EMAIL } },
      select: { id: true, name: true, email: true, updatedAt: true },
      orderBy: [{ createdAt: "asc" }],
    });

    const session = await auth();
    return apiOk({
      admins: admins.map((a) => ({
        id: a.id,
        name: a.name,
        email: a.email,
        updatedAt: a.updatedAt.toISOString(),
      })),
      // Drives the Owner Password section's visibility. The client uses this for
      // RENDERING ONLY — the owner route re-derives it from the session itself.
      viewerIsOwner: isOwnerEmail(session?.user?.email),
      ownerEmail: OWNER_EMAIL,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

/** POST — reset a NON-OWNER admin's password to a generated temporary one. */
export async function POST(req: NextRequest) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const input = adminPasswordResetSchema.parse(await req.json());
    const ip = getClientIp(req.headers);
    const session = await auth();
    const adminEmail = session?.user?.email ?? null;

    // Unconditional, and deliberately BEFORE the target lookup: an unconfirmed
    // caller must not be able to probe which admin ids exist.
    const confirmation = await verifyManagerConfirmation(input.managerCode, ip);
    if (!confirmation.ok) {
      await prisma.caseActionLog.create({
        data: buildActionLog({
          caseId: null,
          trackingId: null,
          action: "ADMIN_PASSWORD_RESET_FAILED",
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
      return apiError("Manager confirmation failed.", 401);
    }

    const target = await prisma.admin.findUnique({
      where: { id: input.adminId },
      select: { id: true, email: true, name: true },
    });

    if (!target) {
      await prisma.caseActionLog.create({
        data: buildActionLog({
          caseId: null,
          trackingId: null,
          action: "ADMIN_PASSWORD_RESET_FAILED",
          outcome: "BLOCKED",
          staffId: confirmation.staffId,
          staffName: confirmation.staffName,
          singleFactor: confirmation.singleFactor,
          adminEmail,
          ip,
        }),
      });
      return apiError("Admin account not found.", 404);
    }

    // THE OWNER GUARD. Re-derived from the freshly-read row, so it holds even if
    // the id was obtained some other way — the client's opinion of who the owner
    // is never participates. The owner password has its own endpoint with
    // strictly more requirements; it must not be reachable through this one.
    if (isOwnerEmail(target.email)) {
      await prisma.caseActionLog.create({
        data: buildActionLog({
          caseId: null,
          trackingId: `admin:${target.email}`,
          action: "ADMIN_PASSWORD_RESET_BLOCKED",
          // The manager code was CORRECT here — this is a policy refusal, which
          // is precisely why BLOCKED exists as a distinct outcome.
          outcome: "BLOCKED",
          staffId: confirmation.staffId,
          staffName: confirmation.staffName,
          singleFactor: confirmation.singleFactor,
          adminEmail,
          ip,
        }),
      });
      return apiError(
        "The owner account cannot be reset here. Use the Owner Password section.",
        403,
      );
    }

    // Hashed BEFORE the transaction: bcrypt cost 12 is ~250 ms and has no
    // business inside an interactive transaction budget. The plaintext exists
    // only as this local — it is never logged, never audited, never returned.
    const passwordHash = await bcrypt.hash(input.newPassword, ADMIN_BCRYPT_COST);

    await prisma.$transaction(async (tx) => {
      await tx.admin.update({
        where: { id: target.id },
        data: { passwordHash },
      });
      await tx.caseActionLog.create({
        data: buildActionLog({
          caseId: null,
          // WHOSE password was reset. The audit schema has no dedicated column
          // for a target admin, so the email goes in trackingIdSnapshot, the
          // free-text snapshot field, prefixed to make the namespace obvious.
          // Never the password.
          trackingId: `admin:${target.email}`,
          action: "ADMIN_PASSWORD_RESET",
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

    // Confirmation only — deliberately carries NO password material.
    return apiOk({ email: target.email, name: target.name, changed: true });
  } catch (err) {
    return handleApiError(err);
  }
}
