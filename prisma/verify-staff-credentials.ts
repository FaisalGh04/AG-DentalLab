/**
 * INTERACTIVE self-test for seeded staff credentials.
 *
 *   npx tsx prisma/verify-staff-credentials.ts
 *   npx tsx prisma/verify-staff-credentials.ts --only 0        (by order index)
 *   npx tsx prisma/verify-staff-credentials.ts --only روان     (by name)
 *
 * `--only <name|order|id>` restricts the run to ONE staff member (plus the
 * break-glass check, which runs under whoever is selected). Use it when the
 * others still hold rate-limit budget you don't want to spend — their throttle
 * keys and lockout counters are then left completely untouched.
 *
 * An ORDER INDEX is usually the safest argument: Arabic names through argv can
 * be mangled by the shell's code page on Windows.
 *
 * Confirms that the credentials you seeded actually authenticate, WITHOUT any
 * secret being shown to anyone but you. Prompts with hidden input, prints only
 * PASS / FAIL lines — never a password, code, or hash.
 *
 * It calls the REAL production verifier (src/lib/staff-auth.ts → verifyConfirmation),
 * so this exercises the same code path the API routes use: bcrypt comparison,
 * break-glass detection, rate limiting and lockout counters.
 *
 * Per staff member it makes 3 attempts (correct / wrong manager code / wrong
 * password), which stays inside the 5-per-15-min throttle. With `--only`, the
 * selected member also takes the break-glass attempt: 4 of the 5 available, so
 * ONE spare remains — an immediate second run WILL throttle. Wait out the window
 * rather than reading a 429 as a credential failure.
 *
 * Lockout counters are reset at the end for the members actually tested (and
 * only those), so a deliberate failure here never leaves anyone locked out.
 *
 * NOTE: testing the break-glass code stamps `lastUsedAt` and fires a Sentry
 * warning — that is the intended "never quiet" behaviour. On the scratch DB this
 * is harmless; production will have a DIFFERENT break-glass code, so testing
 * here never burns the real one.
 *
 * Safe to re-run. Writes nothing except the lockout counters it then resets.
 */
import { PrismaClient } from "@prisma/client";
import * as readline from "node:readline";
import { verifyConfirmation } from "../src/lib/staff-auth";

const prisma = new PrismaClient();

/** Fixed pseudo-IP so throttle keys are predictable for this self-test. */
const SELF_TEST_IP = "self-test";

/** `--only <name|order|id>`; null = test everyone. */
function parseOnly(): string | null {
  const i = process.argv.indexOf("--only");
  if (i === -1) return null;
  const v = process.argv[i + 1];
  if (!v || v.startsWith("--")) {
    throw new Error("--only needs a value: a staff name, order index, or id.");
  }
  return v.trim();
}

let fails = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) fails++;
};

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true,
    });
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
    };
    rl.question(question, (a) => {
      rl.close();
      resolve(a);
    });
    rl.on("error", reject);
  });
}

async function main() {
  if (!process.stdin.isTTY) {
    throw new Error(
      "Refusing to run without an interactive terminal — secrets must be typed.",
    );
  }

  const raw = process.env.DIRECT_URL || process.env.DATABASE_URL || "";
  let target = "(unknown)";
  try {
    const u = new URL(raw);
    target = `${u.hostname}:${u.port || "5432"}${u.pathname}`;
  } catch {
    /* ignore */
  }
  console.log("\n=== Staff credential self-test ===");
  console.log(`Target database: ${target}`);
  console.log("Nothing you type is displayed, logged, or stored.\n");

  const all = await prisma.staffMember.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });
  if (all.length === 0) throw new Error("No active staff. Run seed-staff.ts first.");

  // Restrict the run if --only was given. Everyone NOT selected is left entirely
  // alone: no verify call, so no rate-limit budget spent and no counters touched.
  const only = parseOnly();
  const staff = only
    ? all.filter(
        (s) =>
          s.name === only ||
          s.id === only ||
          String(s.order) === only,
      )
    : all;

  if (only && staff.length === 0) {
    console.log(`No active staff matched --only "${only}". Available:`);
    for (const s of all) console.log(`  order=${s.order}  ${s.name}`);
    throw new Error("no match for --only");
  }

  if (only) {
    console.log(
      `Restricted to ${staff.length} of ${all.length} staff: ` +
        staff.map((s) => `${s.name} (order ${s.order})`).join(", "),
    );
    console.log(
      "The other members are untouched — no attempts, no throttle spend.\n",
    );
  }

  const managerCode = await promptHidden("Manager code: ");

  console.log("\n--- 1. each staff member's own password is accepted ---");
  const passwords: Record<string, string> = {};
  for (const s of staff) {
    const pw = await promptHidden(`  Password for ${s.name}: `);
    passwords[s.id] = pw;
    const r = await verifyConfirmation(
      { staffId: s.id, staffPassword: pw, managerCode },
      SELF_TEST_IP,
    );
    check(
      `${s.name}: correct password + manager code accepted`,
      r.ok,
      r.ok ? "" : `rejected (${r.reason})`,
    );
    if (r.ok) {
      check(`${s.name}: not flagged as break-glass`, r.usedBreakGlass === false);
      check(`${s.name}: name snapshot matches`, r.staffName === s.name, r.staffName);
    }
  }

  console.log("\n--- 2. wrong manager code is rejected for every staff member ---");
  for (const s of staff) {
    const r = await verifyConfirmation(
      { staffId: s.id, staffPassword: passwords[s.id]!, managerCode: "definitely-wrong" },
      SELF_TEST_IP,
    );
    check(`${s.name}: wrong manager code rejected`, !r.ok, r.ok ? "ACCEPTED!" : "");
  }

  console.log("\n--- 3. wrong staff password is rejected ---");
  for (const s of staff) {
    const r = await verifyConfirmation(
      { staffId: s.id, staffPassword: "definitely-wrong", managerCode },
      SELF_TEST_IP,
    );
    check(`${s.name}: wrong password rejected`, !r.ok, r.ok ? "ACCEPTED!" : "");
  }

  console.log("\n--- 4. break-glass code ---");
  const bg = await promptHidden("Break-glass code: ");
  const first = staff[0]!;
  const rbg = await verifyConfirmation(
    { staffId: first.id, staffPassword: passwords[first.id]!, managerCode: bg },
    SELF_TEST_IP,
  );
  check("break-glass code accepted", rbg.ok, rbg.ok ? "" : `rejected (${rbg.reason})`);
  if (rbg.ok) {
    check("flagged as usedBreakGlass", rbg.usedBreakGlass === true);
  }
  const bgRow = await prisma.managerSecret.findUnique({ where: { kind: "BREAK_GLASS" } });
  check("break-glass lastUsedAt stamped", !!bgRow?.lastUsedAt);

  // Deliberate failures above incremented counters — clear them so nobody is
  // left locked out by this test. Scoped to the members actually TESTED: with
  // --only, everyone else's state must stay exactly as it was.
  const testedIds = staff.map((s) => s.id);
  await prisma.staffMember.updateMany({
    where: { id: { in: testedIds } },
    data: { failedAttempts: 0, lockedUntil: null },
  });
  console.log(
    `\n(lockout counters reset for ${testedIds.length} tested member(s); others untouched)`,
  );

  console.log(
    fails === 0
      ? "\nALL CREDENTIAL CHECKS PASSED"
      : `\n${fails} CHECK(S) FAILED — re-run prisma/seed-staff.ts to reset the secrets.`,
  );
  process.exitCode = fails === 0 ? 0 : 1;
}

main()
  .catch((e) => {
    console.error("Self-test failed:", e instanceof Error ? e.message : "unknown error");
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
