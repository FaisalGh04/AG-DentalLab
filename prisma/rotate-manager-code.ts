/**
 * Rotate ONLY the manager confirmation code (ManagerSecret.PRIMARY).
 *
 *   npx tsx prisma/rotate-manager-code.ts
 *
 * WHY THIS EXISTS
 * ---------------
 * seed-staff.ts prompts for every staff password in one pass, so rotating the
 * manager code with it also re-issues all four staff passwords. docs/staff-auth.md
 * asks for the manager code to be rotated ROUTINELY — monthly, and immediately if
 * anyone sees it typed — and a rotation that drags four other credential changes
 * behind it is a rotation that does not get done.
 *
 * That matters more now than it did: since the manager identity authenticates
 * with this code ALONE (the single-factor path), this one secret is the entire
 * credential behind privileged actions attributed to the manager.
 *
 * WHAT IT TOUCHES
 * ---------------
 *   ManagerSecret.PRIMARY.codeHash   <- new hash
 *   ManagerSecret.PRIMARY.lastUsedAt <- reset to null
 *
 * WHAT IT NEVER TOUCHES
 * ---------------------
 *   - any StaffMember row (passwords, isManager, lockout counters)
 *   - ManagerSecret.BREAK_GLASS — rotate that by re-running seed-staff.ts, which
 *     regenerates and displays it once
 *   - any case or audit log
 *
 * lastUsedAt is reset because after rotation the old timestamp refers to the
 * PREVIOUS code, which is actively misleading when auditing "when was this used".
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  promptSecretTwice,
  promptVisible,
  requireTTY,
  describeTarget,
} from "./prompt-utils";

const prisma = new PrismaClient();

/** Same cost as Admin.passwordHash and StaffMember.pinHash. */
const BCRYPT_COST = 12;

/**
 * Minimum length for the manager code. Kept in step with seed-staff.ts — if
 * these two ever disagree, the weaker one wins in practice, because whichever
 * script is run last decides the code that is actually stored.
 */
const MIN_MANAGER_CODE_LENGTH = 6;

async function main() {
  requireTTY();

  console.log("\n=== Rotate manager confirmation code ===");
  console.log(`Target database: ${describeTarget()}`);
  console.log(
    "\nThis rotates ONLY ManagerSecret.PRIMARY.\n" +
      "Staff passwords, the break-glass code, cases and audit logs are untouched.",
  );

  const existing = await prisma.managerSecret.findUnique({ where: { kind: "PRIMARY" } });
  if (!existing) {
    console.log(
      "\nNo PRIMARY manager code exists yet — run `npx tsx prisma/seed-staff.ts`\n" +
        "first to seed the full credential set. Nothing was written.",
    );
    return;
  }
  console.log(
    `\nCurrent PRIMARY code was last used: ${
      existing.lastUsedAt ? existing.lastUsedAt.toISOString() : "never recorded"
    }`,
  );

  // Warn if the single-factor path is live: rotating this code changes the ONLY
  // credential standing behind the manager identity, so whoever holds it must be
  // told at the same moment.
  const manager = await prisma.staffMember.findFirst({
    where: { isManager: true },
    select: { name: true, isActive: true },
  });
  if (manager) {
    console.log(
      `\n  NOTE: "${manager.name}" is marked as the manager identity` +
        `${manager.isActive ? "" : " (currently INACTIVE)"}, so this code is also\n` +
        "  that person's ONLY credential for gated actions (single-factor path).\n" +
        "  After rotating, they cannot approve anything until they know the new code.",
    );
  }

  const go = (await promptVisible('\nType "yes" to continue: ')).trim();
  if (go !== "yes") {
    console.log("Aborted. Nothing was written.");
    return;
  }

  console.log("\n--- New manager code (input is hidden) ---");
  console.log(
    `  Minimum ${MIN_MANAGER_CODE_LENGTH} characters. This code alone authorises\n` +
      "  gated actions for the manager identity, so avoid short repeating patterns\n" +
      "  (1212, 7171) — they are the first thing a guess tries.",
  );
  const code = await promptSecretTwice("Manager code", MIN_MANAGER_CODE_LENGTH);
  const codeHash = await bcrypt.hash(code, BCRYPT_COST);

  await prisma.managerSecret.update({
    where: { kind: "PRIMARY" },
    data: { codeHash, lastUsedAt: null },
  });

  console.log("\n✔ Manager code rotated (hash only).");
  console.log("  Staff passwords: untouched.");
  console.log("  Break-glass code: untouched.");
  console.log("  Tell the manager the new code through a channel you trust.\n");
}

main()
  .catch((e) => {
    // Deliberately does NOT print the error object — a thrown Prisma error can
    // echo query parameters, and those could include a hash.
    console.error("Rotation failed:", e instanceof Error ? e.message : "unknown error");
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
