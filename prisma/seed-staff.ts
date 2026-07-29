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
import * as readline from "node:readline";
import { randomBytes } from "node:crypto";

const prisma = new PrismaClient();

/** bcrypt cost — same as Admin.passwordHash (src/auth.ts). */
const BCRYPT_COST = 12;

/**
 * Minimum length for a STAFF password. Entered once per action by the person
 * performing it, so length costs little.
 */
const MIN_STAFF_SECRET_LENGTH = 6;

/**
 * Minimum length for the MANAGER code — deliberately SHORTER than the staff
 * minimum. This is an EXPLICIT TRADE-OFF, not an oversight.
 *
 * Why: the manager types this code dozens of times a day, on every case
 * creation and every stage transition. A long code creates enough friction that
 * the realistic outcome is it gets written on a sticky note by the workstation
 * or shared with staff to avoid the interruption — at which point the second
 * factor stops being a control at all. A short code that stays secret is worth
 * more than a long one that gets shared.
 *
 * What it costs:
 *   - ONLINE guessing is still well defended, and length barely matters there:
 *     an attacker also needs a valid staff password, and confirmationRatelimit
 *     (5 / 15 min per staffId+IP) plus the 5-failure lockout make grinding
 *     impractical.
 *   - OFFLINE resistance is what drops. If the database is ever exposed, a
 *     4-character code falls to brute force in seconds even at bcrypt cost 12 —
 *     the hash stops being meaningful protection for this particular secret.
 *
 * Consequences, which docs/staff-auth.md spells out:
 *   - treat the manager code as MORE sensitive, not less
 *   - never write it down anywhere near the workstation
 *   - rotate it periodically, and immediately if anyone else sees it typed
 *   - the break-glass code stays long and random precisely because it is rare
 */
const MIN_MANAGER_CODE_LENGTH = 4;

/**
 * The roster. Names are DATA, not secrets — safe to keep in the repo, and they
 * are never translated. StaffMember is the single source of truth for both the
 * confirmation gate and the "Received By" dropdown.
 */
const STAFF_NAMES = ["روان", "حسام", "معتصم", "ابو عمر", "عبدالله"] as const;

/** Ambiguity-free alphabet, same convention as TRACKING_ID_ALPHABET. */
const BG_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const BG_LENGTH = 24;

// ---------------------------------------------------------------- prompts --

/** Read a line with the keystrokes hidden (no echo, no history). */
function promptHidden(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });
    // Suppress echo: write the prompt once, then nothing for keystrokes.
    let shown = false;
    const iface = rl as unknown as {
      _writeToOutput: (s: string) => void;
      output: NodeJS.WriteStream;
    };
    iface._writeToOutput = (s: string) => {
      if (!shown) {
        iface.output.write(question);
        shown = true;
      } else if (s.includes("\n")) {
        iface.output.write("\n");
      }
      // every other keystroke is swallowed
    };
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
    rl.on("error", reject);
  });
}

function promptVisible(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(question, (a) => {
      rl.close();
      resolve(a);
    });
  });
}

/**
 * Ask for a secret twice and require a match. Never reports the value back —
 * only whether it was too short or mismatched.
 */
async function promptSecretTwice(
  label: string,
  minLength: number,
): Promise<string> {
  for (;;) {
    const first = (await promptHidden(`  ${label}: `)).trim();
    if (first.length < minLength) {
      console.log(`  ✗ too short (minimum ${minLength} characters). Try again.`);
      continue;
    }
    const second = (await promptHidden(`  ${label} (again): `)).trim();
    if (first !== second) {
      console.log("  ✗ entries did not match. Try again.");
      continue;
    }
    return first;
  }
}

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
  if (!process.stdin.isTTY) {
    throw new Error(
      "Refusing to run without an interactive terminal. Secrets must be typed, " +
        "never piped — run this directly in your own shell.",
    );
  }

  // Show WHICH database is about to be written to, with credentials stripped.
  const raw = process.env.DIRECT_URL || process.env.DATABASE_URL || "";
  let target = "(unknown)";
  try {
    const u = new URL(raw);
    target = `${u.hostname}:${u.port || "5432"}${u.pathname}`;
  } catch {
    /* leave as unknown */
  }

  console.log("\n=== Staff confirmation layer — credential seeding ===");
  console.log(`Target database: ${target}`);
  console.log(
    "\nThis writes ONLY bcrypt hashes. Existing secrets for these names are ROTATED.",
  );
  const go = (await promptVisible('\nType "yes" to continue: ')).trim();
  if (go !== "yes") {
    console.log("Aborted. Nothing was written.");
    return;
  }

  console.log("\n--- Staff passwords (input is hidden) ---");
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
    `  Minimum ${MIN_MANAGER_CODE_LENGTH} characters — deliberately shorter than the\n` +
      "  staff minimum because this is typed many times a day. A short code that\n" +
      "  stays secret beats a long one that gets written down or shared.\n" +
      "  Keep it off sticky notes, and rotate it periodically.",
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

  await prisma.$transaction(async (tx) => {
    for (const [i, s] of staffHashes.entries()) {
      await tx.staffMember.upsert({
        where: { name: s.name },
        update: {
          pinHash: s.hash,
          isActive: true,
          failedAttempts: 0,
          lockedUntil: null,
        },
        create: { name: s.name, pinHash: s.hash, order: i },
      });
    }
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

  console.log(`\n✔ Seeded ${staffHashes.length} staff + manager code (hashes only).`);

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
