/**
 * Verify that the DB lockout is INDEPENDENT of the rate-limit window size.
 *
 * This is the companion to prisma/verify-confirm-ratelimit.ts. That one proves
 * the Upstash limiter; this one proves the control that actually bounds
 * credential guessing — `staff_members.failed_attempts` / `locked_until` — and
 * that widening the limiter (5 -> 15 attempts / 15 min) did not loosen it.
 *
 * The sequence below is the whole point: with the limiter at 15 and
 * MAX_FAILED_ATTEMPTS at 5, a run of wrong guesses from one IP must go
 *
 *     attempts 1-4   -> "failed"     (counting up)
 *     attempt  5     -> "locked"     (lockout fires; limiter still has budget)
 *     attempts 6-15  -> "locked"     (limiter ADMITS these; the DB stops them)
 *     attempt  16    -> "throttled"  (limiter budget finally spent)
 *
 * If the lockout were somehow leaning on the limiter, attempts 6-15 would come
 * back "failed" and the guess budget would have tripled with the window.
 *
 * WHY THIS CANNOT TOUCH PRODUCTION
 * --------------------------------
 * Unlike its companion, this script DOES write to the database — it creates a
 * throwaway staff row, drives it into lockout, and deletes it. So:
 *
 *   - it reads the target from VERIFY_DATABASE_URL, never from .env's
 *     DATABASE_URL, so there is no "forgot to override" failure mode
 *   - it REFUSES to run if that host matches the host in .env (production)
 *   - production has not had migration 20260805132105 applied anyway, so
 *     is_manager / single_factor do not exist there
 *
 * It does use the REAL production Upstash limiter, deliberately: the interaction
 * being verified is between the live limiter and the DB, and the throwaway
 * staff id gets its own bucket, which the script deletes afterwards.
 *
 * Run:  VERIFY_DATABASE_URL='postgresql://.../ag_dentallab_verify' \
 *         npx tsx prisma/verify-confirm-lockout.ts
 */

process.loadEnvFile(); // Node >= 20.12 — for UPSTASH_* (see companion script)

const PROD_URL = process.env.DATABASE_URL;
const TARGET = process.env.VERIFY_DATABASE_URL;

function hostOf(url: string | undefined): string | null {
  if (!url) return null;
  const m = url.match(/@([^:/?]+)/);
  return m?.[1]?.toLowerCase() ?? null;
}

function dbNameOf(url: string | undefined): string {
  if (!url) return "?";
  return url.split("/").pop()?.split("?")[0] ?? "?";
}

if (!TARGET) {
  console.error(
    "\nRefusing to run: VERIFY_DATABASE_URL is not set.\n\n" +
      "This script WRITES to staff_members. Point it at a scratch database:\n" +
      "  VERIFY_DATABASE_URL='postgresql://.../ag_dentallab_verify' \\\n" +
      "    npx tsx prisma/verify-confirm-lockout.ts\n",
  );
  process.exit(1);
}

// Hard refusal is on the exact (host, database) pair — that is production
// itself. A scratch DB sitting on the same server is a different database and
// is allowed, but it is close enough to the live one to be worth shouting about.
const sameHost = !!hostOf(TARGET) && hostOf(TARGET) === hostOf(PROD_URL);
const sameDb = dbNameOf(TARGET) === dbNameOf(PROD_URL);

if (sameHost && sameDb) {
  console.error(
    `\nRefusing to run: VERIFY_DATABASE_URL resolves to the SAME DATABASE as\n` +
      `.env's DATABASE_URL — ${dbNameOf(PROD_URL)} @ ${hostOf(PROD_URL)} — which is production.\n\n` +
      `This script drives a staff row into lockout. Use a scratch database.\n`,
  );
  process.exit(1);
}

if (sameHost) {
  console.warn(
    `\n  WARNING: scratch DB "${dbNameOf(TARGET)}" is on the SAME HOST as production\n` +
      `  (${hostOf(TARGET)}). Different database, so allowed — but check the name.\n`,
  );
}

// Point the app's Prisma singleton at the scratch DB. Must happen BEFORE
// src/lib/prisma.ts is evaluated, since it builds PrismaClient at module init
// — hence the dynamic imports in main(), same reason as the companion script.
process.env.DATABASE_URL = TARGET;
process.env.DIRECT_URL = TARGET;

const PROBE_IP = "203.0.113.8"; // RFC 5737 TEST-NET-3, never a real client
const PROBE_NAME = `zzz-probe-lockout-${Date.now()}`;
const WRONG_PASSWORD = "definitely-not-the-password";
const WRONG_CODE = "definitely-not-the-manager-code";

const ok = (s: string) => console.log(`  \x1b[32mPASS\x1b[0m  ${s}`);
const bad = (s: string) => console.log(`  \x1b[31mFAIL\x1b[0m  ${s}`);

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (cond) ok(msg);
  else {
    bad(msg);
    failures++;
  }
}

async function main() {
  const { CONFIRMATION_MAX_ATTEMPTS }: typeof import("../src/lib/ratelimit") =
    await import("../src/lib/ratelimit");
  const { redis }: typeof import("../src/lib/redis") = await import(
    "../src/lib/redis"
  );
  const { verifyConfirmation, BCRYPT_COST }: typeof import("../src/lib/staff-auth") =
    await import("../src/lib/staff-auth");
  const { prisma }: typeof import("../src/lib/prisma") = await import(
    "../src/lib/prisma"
  );
  const bcrypt = (await import("bcryptjs")).default;

  // Mirrors MAX_FAILED_ATTEMPTS in src/lib/staff-auth.ts, which is module-private
  // by design. Asserted against observed behaviour below, not trusted blindly.
  const EXPECTED_LOCK_AT = 5;

  console.log("\n=== Confirmation lockout — scratch DB + live Upstash ===\n");
  console.log(`  database:   ${dbNameOf(TARGET)} @ ${hostOf(TARGET) ?? "local"}`);
  console.log(`  production: ${dbNameOf(PROD_URL)} @ ${hostOf(PROD_URL)}  (NOT touched)`);
  console.log(`  limiter:    ${CONFIRMATION_MAX_ATTEMPTS} / 15 m`);
  console.log(`  lock at:    ${EXPECTED_LOCK_AT} consecutive failures\n`);

  assert(
    CONFIRMATION_MAX_ATTEMPTS > EXPECTED_LOCK_AT,
    `limiter budget (${CONFIRMATION_MAX_ATTEMPTS}) exceeds lock threshold ` +
      `(${EXPECTED_LOCK_AT}), so the lockout is observable on its own`,
  );

  const staff = await prisma.staffMember.create({
    data: {
      name: PROBE_NAME,
      pinHash: await bcrypt.hash("the-real-password", BCRYPT_COST),
      isActive: true,
      isManager: false, // never the manager: the partial unique index owns that
      order: 9999,
    },
  });
  console.log(`  created throwaway staff ${staff.id} (${PROBE_NAME})\n`);

  const rlKeyPattern = `rl:confirm:confirm:${staff.id}:${PROBE_IP}*`;

  try {
    const reasons: string[] = [];
    for (let n = 1; n <= CONFIRMATION_MAX_ATTEMPTS + 1; n++) {
      const r = await verifyConfirmation(
        {
          staffId: staff.id,
          staffPassword: WRONG_PASSWORD,
          managerCode: WRONG_CODE,
        },
        PROBE_IP,
      );
      const reason = r.ok ? "OK(!)" : r.reason;
      reasons.push(reason);
      const row = await prisma.staffMember.findUnique({
        where: { id: staff.id },
        select: { failedAttempts: true, lockedUntil: true },
      });
      console.log(
        `  attempt ${String(n).padStart(2)}: ${reason.padEnd(9)} ` +
          `failed_attempts=${row?.failedAttempts} ` +
          `locked=${row?.lockedUntil ? "yes" : "no"}`,
      );
    }
    console.log("");

    // 1-4 count up without locking.
    assert(
      reasons.slice(0, EXPECTED_LOCK_AT - 1).every((r) => r === "failed"),
      `attempts 1-${EXPECTED_LOCK_AT - 1} return "failed"`,
    );
    // 5 locks — this is the threshold, unchanged by the wider window.
    assert(
      reasons[EXPECTED_LOCK_AT - 1] === "locked",
      `attempt ${EXPECTED_LOCK_AT} returns "locked" (lockout threshold intact)`,
    );
    // 6..budget stay locked WHILE the limiter still has budget. This is the
    // load-bearing assertion: the DB, not the limiter, is refusing them.
    const middle = reasons.slice(EXPECTED_LOCK_AT, CONFIRMATION_MAX_ATTEMPTS);
    assert(
      middle.length > 0 && middle.every((r) => r === "locked"),
      `attempts ${EXPECTED_LOCK_AT + 1}-${CONFIRMATION_MAX_ATTEMPTS} return ` +
        `"locked" while the limiter still has budget (DB is the stopper)`,
    );
    // Only past the budget does the limiter speak up.
    assert(
      reasons[CONFIRMATION_MAX_ATTEMPTS] === "throttled",
      `attempt ${CONFIRMATION_MAX_ATTEMPTS + 1} returns "throttled" (limiter boundary)`,
    );

    const final = await prisma.staffMember.findUnique({
      where: { id: staff.id },
      select: { failedAttempts: true, lockedUntil: true },
    });
    assert(
      final?.failedAttempts === EXPECTED_LOCK_AT,
      `failed_attempts settles at ${EXPECTED_LOCK_AT}, NOT ${CONFIRMATION_MAX_ATTEMPTS} — ` +
        `attempts during the lock return early and never increment it ` +
        `(got ${final?.failedAttempts})`,
    );
    const lockMin = final?.lockedUntil
      ? (final.lockedUntil.getTime() - Date.now()) / 60_000
      : -1;
    assert(
      lockMin > 0 && lockMin <= 15.5,
      `locked_until is ~15 min out (${lockMin.toFixed(1)} min)`,
    );
  } finally {
    await prisma.staffMember.delete({ where: { id: staff.id } });
    console.log(`\n  deleted throwaway staff ${staff.id}`);

    if (redis) {
      let cursor = "0";
      const found: string[] = [];
      do {
        const [next, batch] = await redis.scan(cursor, {
          match: rlKeyPattern,
          count: 100,
        });
        cursor = String(next);
        found.push(...batch);
      } while (cursor !== "0");
      if (found.length) {
        await redis.del(...found);
        console.log(`  deleted ${found.length} probe rate-limit key(s)`);
      }
    }
    await prisma.$disconnect();
  }

  console.log(
    failures === 0
      ? "\n\x1b[32mAll checks passed.\x1b[0m\n"
      : `\n\x1b[31m${failures} check(s) failed.\x1b[0m\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
