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
  /**
   * OMITTED for the manager identity, which authenticates with the manager code
   * alone (see the branch in verifyConfirmation). For every other staff member a
   * missing password is a FAILED attempt, never a bypass.
   */
  staffPassword?: string;
  managerCode: string;
}

export type ConfirmationResult =
  | {
      ok: true;
      staffId: string;
      /** Snapshot for the audit log — never re-resolved from the FK later. */
      staffName: string;
      usedBreakGlass: boolean;
      /** Approved via the reduced one-code manager path. Audited explicitly. */
      singleFactor: boolean;
    }
  | {
      ok: false;
      reason: "failed" | "locked" | "throttled";
      retryAfter?: number;
      /**
       * Whether the ATTEMPT was against the manager identity. Recorded on
       * failures too: single-factor failures are the brute-force signal that
       * matters most, since that path has only one secret to guess.
       * False when the staff row could not be loaded (unknown/throttled).
       */
      singleFactor: boolean;
    };

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
  // 1. Throttle first, before any bcrypt work, so throttled attempts stay cheap.
  //
  //    Keyed on staff + IP. Be precise about what that does and does not buy:
  //
  //      - it BOUNDS ONE IP to 5 attempts per 15 min against a given staff id,
  //        which is what keeps a single attacker from burning through the roster
  //      - it does NOT bound a DISTRIBUTED attack. The IP is part of the key, so
  //        an attacker with N source addresses gets N fresh buckets against the
  //        SAME staff id — 5N attempts, with the limiter never once denying.
  //
  //    What actually stops that is the per-staff lockout below (failedAttempts /
  //    lockedUntil, steps 3 and 5): it lives on the staff row, so it counts every
  //    failure against that identity no matter where it came from. It is also a
  //    ratchet, because failedAttempts clears ONLY on success — note the shape
  //    though: while the lock is live, step 3 returns early, so those attempts
  //    neither increment the counter nor extend the lock. The ratchet bites at
  //    the NEXT attempt after lockedUntil expires, which re-locks immediately
  //    (failedAttempts is still >= MAX_FAILED_ATTEMPTS) rather than granting a
  //    fresh set of tries.
  //
  //    This ordering matters most for the manager: the single-factor path at 4a
  //    has one secret behind it, so the DB lockout — not this limiter — is the
  //    control carrying that weight. Verify both after any change to either:
  //    the limiter with prisma/verify-confirm-ratelimit.ts (needs real Upstash),
  //    the lockout against a scratch DB (it touches no Redis at all).
  const { success, reset } = await limit(
    confirmationRatelimit,
    `confirm:${input.staffId}:${ip}`,
  );
  if (!success) {
    return { ok: false, reason: "throttled", retryAfter: reset, singleFactor: false };
  }

  const staff = await prisma.staffMember.findUnique({
    where: { id: input.staffId },
  });

  // 2. Unknown or inactive staff: burn a comparison so the timing profile
  //    matches the real path, then fail generically.
  //
  //    DELIBERATELY BEFORE the isManager branch below. isManager is a role
  //    marker, never an exemption: a deactivated manager must fail here, exactly
  //    like anyone else, without its credential ever being compared.
  if (!staff || !staff.isActive) {
    await bcrypt.compare(input.staffPassword ?? "", DUMMY_HASH);
    return { ok: false, reason: "failed", singleFactor: false };
  }

  // 3. Locked out? Also before the branch. The manager is subject to the SAME
  //    lockout as everyone else — and needs it more than anyone, because after
  //    the branch below there is only one secret standing behind that identity.
  if (staff.lockedUntil && staff.lockedUntil > new Date()) {
    await bcrypt.compare(input.staffPassword ?? "", DUMMY_HASH);
    return {
      ok: false,
      reason: "locked",
      retryAfter: staff.lockedUntil.getTime(),
      singleFactor: staff.isManager,
    };
  }

  const secrets = await prisma.managerSecret.findMany();
  const primary = secrets.find((s) => s.kind === "PRIMARY");
  const breakGlass = secrets.find((s) => s.kind === "BREAK_GLASS");

  const primaryOk = primary
    ? await bcrypt.compare(input.managerCode, primary.codeHash)
    : await bcrypt.compare(input.managerCode, DUMMY_HASH);

  let authorised: boolean;
  let usedBreakGlass = false;

  if (staff.isManager) {
    // 4a. SINGLE-FACTOR path — the manager approving their own action.
    //
    // One code satisfies both factors. This is a deliberate, accepted reduction
    // in assurance; docs/staff-auth.md carries the full revised threat model.
    //
    // PRIMARY ONLY — break-glass is deliberately NOT honoured here. Break-glass
    // exists to survive the manager being unreachable, which by definition means
    // somebody ELSE is acting, and that person uses the two-factor path with
    // their own password. Accepting it here would make a single long code
    // sufficient for full authority attributed to "Manager", with no staff
    // password anywhere in the chain — amplifying the emergency override into a
    // general-purpose one.
    //
    // staff.pinHash is never read on this path; the column is unreachable for
    // this row by construction, not merely unused.
    authorised = primaryOk;
  } else {
    // 4b. TWO-FACTOR path — every other staff member, unchanged behaviour.
    //
    // A MISSING password is a FAILED attempt, never a bypass. This is the line
    // that stops confirmationSchema's now-optional staffPassword from silently
    // dropping the first factor for the entire roster: only the DB's isManager
    // flag can reach 4a, and a client cannot assert it.
    let staffOk = false;
    if (input.staffPassword) {
      staffOk = await bcrypt.compare(input.staffPassword, staff.pinHash);
    } else {
      // Burn a comparison so an omitted password costs the same as a wrong one.
      await bcrypt.compare("", DUMMY_HASH);
    }

    // Evaluate BOTH factors regardless of the first result so the response time
    // does not reveal which one failed.
    const breakGlassOk = breakGlass
      ? await bcrypt.compare(input.managerCode, breakGlass.codeHash)
      : false;

    usedBreakGlass = breakGlassOk && !primaryOk;
    authorised = staffOk && (primaryOk || breakGlassOk);
  }

  if (!authorised) {
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
    return {
      ok: false,
      reason: lock ? "locked" : "failed",
      singleFactor: staff.isManager,
    };
  }

  // 5. Success — clear the counters.
  await prisma.staffMember.update({
    where: { id: staff.id },
    data: { failedAttempts: 0, lockedUntil: null },
  });

  if (usedBreakGlass) {
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
    usedBreakGlass,
    singleFactor: staff.isManager,
  };
}
