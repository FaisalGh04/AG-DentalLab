/**
 * Verify the REAL Upstash confirmation limiter — the control the manager's
 * single-factor path leans on hardest, since that path has only one secret.
 *
 * WHY THIS IS SAFE TO POINT AT PRODUCTION
 * ---------------------------------------
 * It never opens the database. src/lib/staff-auth.ts calls the limiter as its
 * FIRST step, before `prisma.staffMember.findUnique`, with an opaque string key
 * `confirm:<staffId>:<ip>`. Upstash never learns whether that staffId exists, is
 * active, or is the manager. So this reproduces the exact production call shape
 * without a manager row, without the migration, and without enabling anything.
 *
 * Import chain is deliberately Prisma-free:
 *   this file -> ../src/lib/ratelimit -> ./redis -> @upstash/redis
 * That matters because .env's DATABASE_URL points at PRODUCTION Supabase, so an
 * accidental Prisma import here would be a live production connection.
 *
 * The identifier is self-describing and uses RFC 5737 TEST-NET-3 (203.0.113.0/24,
 * reserved for documentation) in the IP slot, so it cannot collide with a real
 * staff member's bucket — and if anyone sees it in the Upstash analytics
 * dashboard, it explains itself.
 *
 * Run:  npx tsx prisma/verify-confirm-ratelimit.ts
 *       npx tsx prisma/verify-confirm-ratelimit.ts --cleanup
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// The sibling prisma/*.ts scripts get .env for free, because instantiating
// PrismaClient loads it. This script deliberately never imports Prisma (see the
// header), so nothing loads .env for us and every UPSTASH_* var would be
// undefined — src/lib/redis.ts would hand back `null` and the whole run would
// pass vacuously against a limiter that isn't there. Hence loading it here.
process.loadEnvFile(); // Node >= 20.12

// src/lib/redis.ts and src/lib/ratelimit.ts read process.env into MODULE-LEVEL
// consts, evaluated once on first import. Static imports are hoisted above the
// call above, so these must be pulled in dynamically, AFTER it. Keeping them
// dynamic also means a future import-sorter cannot silently re-break this.
type RatelimitModule = typeof import("../src/lib/ratelimit");
type RedisModule = typeof import("../src/lib/redis");

// Mirrors MAX_FAILED_ATTEMPTS / the 5-per-15-min sliding window.
const EXPECTED_BUDGET = 5;
const PROBE_PREFIX = "rl:confirm";

const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
const PROBE_ID = `confirm:PROBE-singlefactor-${stamp}:203.0.113.7`;

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

async function cleanup(redis: RedisModule["redis"]) {
  if (!redis) return;
  // Sliding-window keys are `<prefix>:<identifier>:<window>`. Scan rather than
  // KEYS so we never block a production Redis, and match only our probe.
  const pattern = `${PROBE_PREFIX}:${PROBE_ID}*`;
  let cursor = "0";
  const found: string[] = [];
  do {
    const [next, batch] = await redis.scan(cursor, { match: pattern, count: 100 });
    cursor = String(next);
    found.push(...batch);
  } while (cursor !== "0");

  if (found.length === 0) {
    console.log("  no probe keys left (they also expire on their own)");
    return;
  }
  await redis.del(...found);
  console.log(`  deleted ${found.length} probe key(s):`);
  for (const k of found) console.log(`    ${k}`);
}

async function main() {
  const { confirmationRatelimit, limit }: RatelimitModule = await import(
    "../src/lib/ratelimit"
  );
  const { redis }: RedisModule = await import("../src/lib/redis");

  if (process.argv.includes("--cleanup")) {
    console.log("\nCleanup only\n");
    await cleanup(redis);
    return;
  }

  console.log("\n=== Confirmation limiter — live Upstash ===\n");
  console.log(`  identifier: ${PROBE_ID}\n`);

  // --- A. the limiter is actually wired to Upstash at all ------------------
  // If env were missing/malformed, src/lib/redis.ts yields null and the whole
  // test below would be vacuous — so this is a precondition, not a nicety.
  assert(redis !== null, "Upstash client constructed from env");
  assert(
    confirmationRatelimit !== null,
    "confirmationRatelimit is live (not the null dev fallback)",
  );
  if (!confirmationRatelimit) {
    console.log("\n  Cannot continue: limiter is null. Check UPSTASH_* env.\n");
    process.exit(1);
  }

  // Start clean so a re-run in the same 15-min window isn't pre-throttled.
  await cleanup(redis);
  console.log("");

  // --- B. budget is spent, then denied -------------------------------------
  const seen: { n: number; success: boolean; remaining: number; reset: number }[] = [];
  for (let n = 1; n <= EXPECTED_BUDGET + 2; n++) {
    const r = await limit(confirmationRatelimit, PROBE_ID);
    seen.push({ n, ...r });
    console.log(
      `  attempt ${n}: success=${String(r.success).padEnd(5)} remaining=${r.remaining}`,
    );
  }
  console.log("");

  const allowed = seen.filter((s) => s.success).length;
  assert(
    allowed === EXPECTED_BUDGET,
    `exactly ${EXPECTED_BUDGET} attempts allowed (got ${allowed})`,
  );
  assert(
    seen.slice(0, EXPECTED_BUDGET).every((s) => s.success),
    "the allowed attempts are the FIRST ones (window, not random)",
  );
  assert(
    seen.slice(EXPECTED_BUDGET).every((s) => !s.success),
    "every attempt past the budget is denied",
  );
  assert(
    seen[EXPECTED_BUDGET - 1]?.remaining === 0,
    "remaining hits 0 on the last allowed attempt",
  );

  const denied = seen[EXPECTED_BUDGET]!;
  const minutes = (denied.reset - Date.now()) / 60_000;

  // `reset` is the end of the CURRENT FIXED BUCKET, not the moment the budget
  // returns: @upstash/ratelimit computes `(currentWindow + 1) * windowDuration`
  // (dist/index.js:1387). Land a denial near a bucket edge and this is seconds
  // away, even though the sliding window still weights the previous bucket's
  // hits at ~1.0 immediately after the boundary — so the caller stays denied
  // and the budget only frees up gradually across the next 15 minutes.
  //
  // Assert the real semantic (a boundary inside the window), NOT "~15 minutes":
  // the loose version of this check passed at 0.3 min and proved nothing.
  assert(
    minutes > 0 && minutes <= 15.0001,
    `denial carries a future bucket boundary within the window (${minutes.toFixed(1)} min)`,
  );
  console.log(
    `        note: reset is a bucket edge, NOT a retry-safe time — see src/lib/api.ts:28`,
  );

  // --- C. fail-closed when Upstash is unreachable --------------------------
  // Load-bearing for the single-factor path: if the limiter silently failed
  // OPEN on an Upstash outage, the manager identity would be left with one
  // short secret and no throttle. NODE_ENV is read inside limit() at CALL time,
  // so setting it here exercises the production branch honestly.
  // Sentry is never init'd in a bare script, so its capture calls are no-ops.
  console.log("");
  // Plain assignment: Node 20 rejects defineProperty on process.env unless the
  // descriptor is also writable+enumerable, and the cast is only needed because
  // Next's types narrow NODE_ENV to a readonly union.
  const env = process.env as Record<string, string | undefined>;
  const prevEnv = env.NODE_ENV;
  env.NODE_ENV = "production";

  const unconfigured = await limit(null, PROBE_ID);
  assert(
    !unconfigured.success,
    "prod + limiter null  -> DENIED (fail-closed, not fail-open)",
  );

  const brokenLimiter = new Ratelimit({
    redis: new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: "deliberately-invalid-token-for-failclosed-probe",
    }),
    limiter: Ratelimit.slidingWindow(5, "15 m"),
    analytics: false, // don't pollute real analytics with the broken-auth probe
    prefix: "rl:probe-failclosed",
  });
  const errored = await limit(brokenLimiter, PROBE_ID);
  assert(
    !errored.success,
    "prod + Upstash auth error -> DENIED (fail-closed on live error)",
  );

  env.NODE_ENV = prevEnv;

  // --- D. leave nothing behind ---------------------------------------------
  console.log("");
  await cleanup(redis);

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
