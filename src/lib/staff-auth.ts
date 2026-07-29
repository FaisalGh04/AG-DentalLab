// Verification for the two-factor confirmation gate: a staff member's own
// password PLUS a manager code, both required to create a case or move its
// stage. Layered ON TOP OF the NextAuth admin session (src/auth.ts) — the caller
// must already have passed requireAdmin(); this authorises the specific ACTION.
//
// Design notes, mirroring the hardening already in auth.ts:
//   - rate-limit BEFORE any bcrypt work, so throttled attempts stay cheap
//   - dummy compare on unknown/locked staff, to blunt enumeration by timing
//   - ONE generic failure reason to the caller: revealing which of the two
//     secrets was wrong turns the dialog into an oracle
//   - never log, return, or throw the attempted secret

import bcrypt from "bcryptjs";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/prisma";
import { confirmationRatelimit, limit } from "@/lib/ratelimit";

/** Cost 12, matching Admin.passwordHash. */
export const BCRYPT_COST = 12;

/** A bcrypt hash of nonsense, for constant-ish-time failure paths. */
const DUMMY_HASH = "$2a$12$invalidinvalidinvalidinvalidinv";

/** Lock a staff member out after this many consecutive failures. */
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export interface ConfirmationInput {
  staffId: string;
  staffPassword: string;
  managerCode: string;
}

export type ConfirmationResult =
  | {
      ok: true;
      staffId: string;
      /** Snapshot for the audit log — never re-resolved from the FK later. */
      staffName: string;
      usedBreakGlass: boolean;
    }
  | { ok: false; reason: "failed" | "locked" | "throttled"; retryAfter?: number };

/**
 * Verify both factors. Returns a discriminated result rather than throwing, so
 * callers can log the failure before responding.
 *
 * The caller MUST NOT surface `reason` differences beyond locked/throttled vs
 * failed — in particular never "wrong password" vs "wrong manager code".
 */
export async function verifyConfirmation(
  input: ConfirmationInput,
  ip: string,
): Promise<ConfirmationResult> {
  // 1. Throttle first — keyed on staff + IP so one actor cannot burn through
  //    the whole roster, and one staff id cannot be attacked from many IPs
  //    without also tripping the per-IP dimension.
  const { success, reset } = await limit(
    confirmationRatelimit,
    `confirm:${input.staffId}:${ip}`,
  );
  if (!success) {
    return { ok: false, reason: "throttled", retryAfter: reset };
  }

  const staff = await prisma.staffMember.findUnique({
    where: { id: input.staffId },
  });

  // 2. Unknown or inactive staff: burn a comparison so the timing profile
  //    matches the real path, then fail generically.
  if (!staff || !staff.isActive) {
    await bcrypt.compare(input.staffPassword, DUMMY_HASH);
    return { ok: false, reason: "failed" };
  }

  // 3. Locked out?
  if (staff.lockedUntil && staff.lockedUntil > new Date()) {
    await bcrypt.compare(input.staffPassword, DUMMY_HASH);
    return { ok: false, reason: "locked", retryAfter: staff.lockedUntil.getTime() };
  }

  // 4. Both factors. Evaluate BOTH regardless of the first result so the
  //    response time does not reveal which one failed.
  const staffOk = await bcrypt.compare(input.staffPassword, staff.pinHash);

  const secrets = await prisma.managerSecret.findMany();
  const primary = secrets.find((s) => s.kind === "PRIMARY");
  const breakGlass = secrets.find((s) => s.kind === "BREAK_GLASS");

  const primaryOk = primary
    ? await bcrypt.compare(input.managerCode, primary.codeHash)
    : await bcrypt.compare(input.managerCode, DUMMY_HASH);
  const breakGlassOk = breakGlass
    ? await bcrypt.compare(input.managerCode, breakGlass.codeHash)
    : false;

  const managerOk = primaryOk || breakGlassOk;

  if (!staffOk || !managerOk) {
    const failed = staff.failedAttempts + 1;
    const lock = failed >= MAX_FAILED_ATTEMPTS;
    await prisma.staffMember.update({
      where: { id: staff.id },
      data: {
        failedAttempts: failed,
        lockedUntil: lock
          ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000)
          : staff.lockedUntil,
      },
    });
    return { ok: false, reason: lock ? "locked" : "failed" };
  }

  // 5. Success — clear the counters.
  await prisma.staffMember.update({
    where: { id: staff.id },
    data: { failedAttempts: 0, lockedUntil: null },
  });

  if (breakGlassOk && !primaryOk) {
    // Emergency override must never be quiet, or it becomes the default path.
    Sentry.captureMessage(
      `[staff-auth] BREAK-GLASS code used by staff "${staff.name}" (${staff.id})`,
      "warning",
    );
    console.warn(`[staff-auth] BREAK-GLASS used by ${staff.name}`);
    await prisma.managerSecret.update({
      where: { kind: "BREAK_GLASS" },
      data: { lastUsedAt: new Date() },
    });
  } else if (primary) {
    await prisma.managerSecret.update({
      where: { kind: "PRIMARY" },
      data: { lastUsedAt: new Date() },
    });
  }

  return {
    ok: true,
    staffId: staff.id,
    staffName: staff.name,
    usedBreakGlass: breakGlassOk && !primaryOk,
  };
}
