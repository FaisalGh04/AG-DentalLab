/**
 * INTERACTIVE seeder for the staff confirmation layer.
 *
 *   npx tsx prisma/seed-staff.ts
 *
 * Prompts for the 5 staff passwords and the manager code with HIDDEN input,
 * GENERATES the break-glass code itself, hashes everything with bcrypt cost 12
 * (matching Admin.passwordHash in src/auth.ts) and writes ONLY hashes.
 *
 * SECRET HANDLING — the rules this script follows:
 *   - nothing is read from argv or env: secrets cannot land in shell history,
 *     a CI log, or a committed file
 *   - keystrokes are never echoed, and no secret is ever printed, logged, or
 *     included in an error message
 *   - every secret is typed TWICE and must match; a typo'd manager code would
 *     otherwise lock out every gated action with no way to discover why
 *   - refuses to run outside a real TTY, so secrets cannot be piped in
 *   - the break-glass code is shown EXACTLY ONCE and is unrecoverable
 *     afterwards (only its hash is stored)
 *
 * Idempotent: re-running ROTATES the secrets for existing rows (upsert by name
 * / kind). It never creates duplicates and never deletes cases or logs.
 *
 * NOTE ON `receivedBy`: PatientCase.receivedBy stores a NAME SNAPSHOT, not a
 * FK. Renaming a staff member here changes who can be PICKED going forward; it
 * never rewrites who received a past case.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import {
  promptSecretTwice,
  promptVisible,
  requireTTY,
  describeTarget,
} from "./prompt-utils";

const prisma = new PrismaClient();

/** bcrypt cost — same as Admin.passwordHash (src/auth.ts). */
const BCRYPT_COST = 12;

/**
 * Minimum length for a STAFF password. Entered once per action by the person
 * performing it, so length costs little.
 */
const MIN_STAFF_SECRET_LENGTH = 6;

/**
 * Minimum length for the MANAGER code. RAISED FROM 4 TO 6.
 *
 * The old value of 4 was a deliberate trade-off, justified like this: the
 * manager types this code many times a day, so friction risks it ending up on a
 * sticky note or shared with staff, and online guessing stayed well defended
 * because "an attacker also needs a valid staff password".
 *
 * THAT LAST CLAUSE IS NO LONGER TRUE. The manager identity now authenticates
 * with this code ALONE (StaffMember.isManager — the single-factor path in
 * src/lib/staff-auth.ts). For that path there is no second secret, so the entire
 * online defence is confirmationRatelimit plus the 5-failure lockout, and the
 * code's own length went from "barely matters" to "is the search space".
 *
 * At 4 characters that space is 10,000; the lockout allows roughly 20 guesses an
 * hour, so exhausting it is a patient fortnight, not a fantasy. Six characters
 * raises it a hundredfold for two extra keystrokes.
 *
 * Offline resistance is unchanged in kind and still weak: if the database leaks,
 * a short code falls to brute force regardless of bcrypt cost. Treat this secret
 * as MORE sensitive than a staff password, not less — never written down near
 * the workstation, never shared, rotated on a schedule you can actually keep
 * (`npx tsx prisma/rotate-manager-code.ts` rotates it WITHOUT touching staff
 * passwords, so there is no excuse to skip it). The break-glass code stays long
 * and random precisely because it is used rarely.
 */
const MIN_MANAGER_CODE_LENGTH = 6;

/**
 * Staff who hold a PERSONAL PASSWORD. Names are DATA, not secrets — safe to keep
 * in the repo, and they are never translated. StaffMember is the single source
 * of truth for both the confirmation gate and the "Received By" dropdown.
 *
 * MANAGER_NAME is deliberately NOT in this list: that identity has no personal
 * password to prompt for (see below).
 */
const STAFF_NAMES = ["روان", "حسام", "معتصم", "عبدالله"] as const;

/**
 * The manager identity. Authenticates with the manager code itself, so this row
 * gets NO prompt and an unusable random pinHash — the column is never read for
 * it (src/lib/staff-auth.ts branches before touching pinHash), and storing a
 * real password here would create a second, silently-drifting copy of a secret.
 *
 * Renamed from "ابو عمر". Note the outgoing name is spelled with a BARE ALIF
 * (U+0627); "أبو عمر" (U+0623) is a different string and would not have matched.
 * To rename an EXISTING row use prisma/rename-staff.ts, which targets by id —
 * this seeder upserts by name and would create a duplicate instead.
 */
const MANAGER_NAME = "المدير";

/** Ambiguity-free alphabet, same convention as TRACKING_ID_ALPHABET. */
const BG_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const BG_LENGTH = 24;

// The prompt helpers live in ./prompt-utils so this script and
// rotate-manager-code.ts share ONE implementation of the secret-handling rules.

/** Cryptographically random, rejection-sampled to avoid modulo bias. */
function generateBreakGlassCode(): string {
  const out: string[] = [];
  while (out.length < BG_LENGTH) {
    for (const byte of randomBytes(BG_LENGTH)) {
      if (byte >= 256 - (256 % BG_ALPHABET.length)) continue; // reject bias
      const ch = BG_ALPHABET.charAt(byte % BG_ALPHABET.length);
      out.push(ch);
      if (out.length === BG_LENGTH) break;
    }
  }
  return out.join("");
}

// ------------------------------------------------------------------- main --

async function main() {
  requireTTY();

  console.log("\n=== Staff confirmation layer — credential seeding ===");
  console.log(`Target database: ${describeTarget()}`);
  console.log(
    "\nThis writes ONLY bcrypt hashes. Existing secrets for these names are ROTATED.",
  );
  const go = (await promptVisible('\nType "yes" to continue: ')).trim();
  if (go !== "yes") {
    console.log("Aborted. Nothing was written.");
    return;
  }

  console.log("\n--- Staff passwords (input is hidden) ---");
  console.log(
    `  "${MANAGER_NAME}" is NOT prompted for: that identity authenticates with the\n` +
      "  manager code itself, so it gets an unusable random pinHash instead.",
  );
  const staffHashes: { name: string; hash: string }[] = [];
  for (const name of STAFF_NAMES) {
    const secret = await promptSecretTwice(
      `Password for ${name}`,
      MIN_STAFF_SECRET_LENGTH,
    );
    staffHashes.push({ name, hash: await bcrypt.hash(secret, BCRYPT_COST) });
  }

  console.log("\n--- Manager confirmation code (input is hidden) ---");
  console.log(
    `  Minimum ${MIN_MANAGER_CODE_LENGTH} characters. This is no longer merely a\n` +
      "  SECOND factor: for the manager identity it is the ONLY one, so its length\n" +
      "  is the whole online search space. Avoid short repeating patterns (1212,\n" +
      "  7171) — they are the first thing a guess tries.\n" +
      "  Keep it off sticky notes, never share it, and rotate it routinely with\n" +
      "  `npx tsx prisma/rotate-manager-code.ts` (which leaves staff passwords alone).",
  );
  const managerSecret = await promptSecretTwice(
    "Manager code",
    MIN_MANAGER_CODE_LENGTH,
  );
  const managerHash = await bcrypt.hash(managerSecret, BCRYPT_COST);

  // Generated, never typed: it must be long and random, and nobody should be
  // able to choose a memorable (guessable) emergency override.
  const breakGlass = generateBreakGlassCode();
  const breakGlassHash = await bcrypt.hash(breakGlass, BCRYPT_COST);

  // The manager row never holds a real password: its pinHash is bcrypt over 32
  // random bytes that nobody — including this script — retains.
  const managerPinHash = await bcrypt.hash(
    randomBytes(32).toString("hex"),
    BCRYPT_COST,
  );

  await prisma.$transaction(async (tx) => {
    for (const [i, s] of staffHashes.entries()) {
      await tx.staffMember.upsert({
        where: { name: s.name },
        update: {
          pinHash: s.hash,
          isActive: true,
          isManager: false,
          failedAttempts: 0,
          lockedUntil: null,
        },
        create: { name: s.name, pinHash: s.hash, order: i },
      });
    }

    // Clear any OTHER manager BEFORE setting this one. A partial unique index
    // allows only one is_manager = true row, so doing it in the other order
    // would hit the constraint whenever the flag had drifted onto a different
    // row. Clearing first makes re-running this seeder self-correcting.
    await tx.staffMember.updateMany({
      where: { isManager: true, name: { not: MANAGER_NAME } },
      data: { isManager: false },
    });
    await tx.staffMember.upsert({
      where: { name: MANAGER_NAME },
      update: {
        pinHash: managerPinHash,
        isActive: true,
        isManager: true,
        failedAttempts: 0,
        lockedUntil: null,
      },
      create: {
        name: MANAGER_NAME,
        pinHash: managerPinHash,
        isManager: true,
        order: STAFF_NAMES.length,
      },
    });
    await tx.managerSecret.upsert({
      where: { kind: "PRIMARY" },
      // Reset lastUsedAt too: after rotation the old timestamp refers to the
      // PREVIOUS code, which is misleading when auditing "when was this used".
      update: { codeHash: managerHash, lastUsedAt: null },
      create: { kind: "PRIMARY", codeHash: managerHash },
    });
    await tx.managerSecret.upsert({
      where: { kind: "BREAK_GLASS" },
      update: { codeHash: breakGlassHash, lastUsedAt: null },
      create: { kind: "BREAK_GLASS", codeHash: breakGlassHash },
    });
  });

  console.log(
    `\n✔ Seeded ${staffHashes.length} staff with passwords, plus "${MANAGER_NAME}"` +
      " (no password — single-factor) and the manager code. Hashes only.",
  );

  // The ONLY secret this script ever prints, shown exactly once.
  console.log("\n" + "=".repeat(64));
  console.log("BREAK-GLASS CODE — shown once, cannot be recovered:");
  console.log("\n    " + breakGlass + "\n");
  console.log("Store it OFFLINE, held by someone OTHER than the manager");
  console.log("(the point is surviving that person being unreachable).");
  console.log("Rotate it after every use — see docs/staff-auth.md.");
  console.log("=".repeat(64) + "\n");

  await promptVisible("Press Enter once you have stored it securely... ");
  // Best effort: push it off the visible scrollback.
  console.log("\n".repeat(60));
  console.log("Done.");
}

main()
  .catch((e) => {
    // Deliberately does NOT print the error object — a thrown Prisma error can
    // echo query parameters, and those could include a hash.
    console.error(
      "Seeding failed:",
      e instanceof Error ? e.message : "unknown error",
    );
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
