// HISTORICAL — RAN ONCE against production on 2026-07-28. DO NOT RE-RUN.
// Its guards would abort anyway (the 8 target ids no longer exist), but it is
// kept as the record of what was deleted and why.
/**
 * ONE-TIME, DESTRUCTIVE: remove the 8 pre-2026-07-28 test cases from production,
 * keeping only the 4 real cases logged on 2026-07-28.
 *
 * Why a script and not raw SQL: the DB cascade (case_progress, case_images) is
 * automatic, but storage is NOT. CaseImage.key points at a private R2 object
 * that nothing deletes on cascade — raw SQL would orphan 4 billable, unreachable
 * objects. This mirrors what the app's own DELETE route does
 * (src/app/api/admin/cases/[id]/route.ts).
 *
 * Cache: no revalidateTag() here — it requires Next's request context and throws
 * in a standalone script. getDashboardStats uses `revalidate: 30`, so counts
 * self-heal within 30s.
 *
 * SAFETY
 *   - Targets 8 literal ids. No date predicate drives the delete, so a case
 *     created mid-run can never be swept in.
 *   - DRY RUN by default. Pass --commit to actually delete.
 *   - Aborts unless exactly 8 ids match, none created on/after 2026-07-28,
 *     and the 4 expected survivors are present.
 *   - Aborts if storage is unconfigured: deleteObject() silently no-ops when
 *     s3 is null, which would report success while orphaning every object.
 *
 * Run:  npx tsx --env-file=.env prisma/delete-test-cases-2026-07-28.ts
 *       npx tsx --env-file=.env prisma/delete-test-cases-2026-07-28.ts --commit
 */
import { PrismaClient } from "@prisma/client";
import { s3, deleteObject, headObject } from "../src/lib/s3";

const prisma = new PrismaClient();
const COMMIT = process.argv.includes("--commit");

/** The 8 test cases. Explicit ids only — never a `created_at <` predicate. */
const TARGET_IDS = [
  "cmr6du3wm0001svlstz9kdahg", // AG-2E63E3  Sara Khalil
  "cmr6gslg60000svl0d0it84ua", // AG-Z49VL8  Test Api
  "cmr6gwbq30000svdoh8h929dx", // AG-XT3WWL  Mohammed Ghatasheh
  "cmr6hdlu40000sv8snlqrnd3z", // AG-K3S8R3  yazan gh
  "cmr96iap70004svgo79qatpfj", // AG-QDCSHC  yazan gh
  "cmr98g4o90000l40485khrgxx", // AG-YFFUDN  ahmad talal
  "cmribi9et0000svm89vme8frq", // AG-NS5JWG  Sara Ahmad
  "cmrksu2y00000ma01rdi7ovab", // AG-QB76T5  مرام بسيسو
] as const;

/** The 4 that must survive, untouched. */
const EXPECTED_SURVIVORS = ["AG-U682ZS", "AG-D8VRQP", "AG-4PLW69", "AG-HH7L3L"];

const CUTOFF = new Date("2026-07-28T00:00:00.000Z");

function die(msg: string): never {
  console.error(`\nABORT: ${msg}`);
  throw new Error(msg);
}

async function main() {
  console.log(COMMIT ? "=== MODE: COMMIT (destructive) ===" : "=== MODE: DRY RUN ===");
  console.log();

  // --- guard 0: storage must be configured, or object deletes silently no-op --
  if (!s3) {
    die(
      "Storage is NOT configured (s3 client is null). deleteObject() would " +
        "silently do nothing and orphan every R2 object. Run with --env-file=.env.",
    );
  }
  console.log("guard 0 OK  storage configured");

  // --- guard 1: exactly the 8 target ids exist --------------------------
  if (new Set(TARGET_IDS).size !== 8) die("TARGET_IDS is not 8 unique ids");

  const targets = await prisma.patientCase.findMany({
    where: { id: { in: [...TARGET_IDS] } },
    include: { images: true, _count: { select: { progress: true, images: true } } },
    orderBy: { createdAt: "asc" },
  });
  if (targets.length !== 8) {
    die(`expected 8 matching cases, found ${targets.length}`);
  }
  console.log(`guard 1 OK  exactly 8 target cases matched`);

  // --- guard 2: none of them created today or later ---------------------
  const tooNew = targets.filter((c) => c.createdAt >= CUTOFF);
  if (tooNew.length > 0) {
    die(`${tooNew.length} target(s) created on/after ${CUTOFF.toISOString()}`);
  }
  console.log(`guard 2 OK  none created on/after 2026-07-28`);

  // --- guard 3: the 4 expected survivors are present --------------------
  const survivors = await prisma.patientCase.findMany({
    where: { id: { notIn: [...TARGET_IDS] } },
    select: { trackingId: true, receivedBy: true },
    orderBy: { createdAt: "asc" },
  });
  const survivorIds = survivors.map((s) => s.trackingId).sort();
  if (
    survivorIds.length !== 4 ||
    survivorIds.join(",") !== [...EXPECTED_SURVIVORS].sort().join(",")
  ) {
    die(`survivors mismatch. expected ${EXPECTED_SURVIVORS} got ${survivorIds}`);
  }
  console.log(`guard 3 OK  4 expected survivors present`);
  console.log();

  // --- plan -------------------------------------------------------------
  console.log("TO DELETE:");
  let steps = 0;
  let imgs = 0;
  for (const c of targets) {
    steps += c._count.progress;
    imgs += c._count.images;
    console.log(
      `  ${c.trackingId}  ${c.createdAt.toISOString().slice(0, 10)}  ` +
        `${c.patientFirstName} ${c.patientLastName}  ` +
        `[steps ${c._count.progress}, images ${c._count.images}]`,
    );
  }
  console.log(`  -> 8 cases, ${steps} progress steps, ${imgs} images (cascade)`);
  console.log();

  const keys = targets.flatMap((c) => c.images.map((i) => i.key)).filter(Boolean);
  console.log(`R2 OBJECTS TO REMOVE (${keys.length}):`);
  for (const k of keys) console.log(`  ${k}`);
  console.log();

  console.log("TO KEEP:");
  for (const s of survivors) {
    console.log(`  ${s.trackingId}  receivedBy=${JSON.stringify(s.receivedBy)}`);
  }
  console.log();

  if (!COMMIT) {
    console.log("DRY RUN — nothing deleted. Re-run with --commit to execute.");
    return;
  }

  // --- 1. storage first: a failed object delete must not lose the DB row --
  console.log("--- deleting R2 objects ---");
  for (const key of keys) {
    let existedBefore = true;
    try {
      await headObject(key);
    } catch {
      existedBefore = false;
    }
    try {
      await deleteObject(key);
    } catch (e) {
      console.error(`  ERROR deleting ${key}:`, e);
      continue;
    }
    let goneAfter = false;
    try {
      await headObject(key);
    } catch {
      goneAfter = true;
    }
    console.log(
      `  ${goneAfter ? "removed" : "STILL PRESENT"}  ${key}` +
        (existedBefore ? "" : "  (was already absent)"),
    );
  }
  console.log();

  // --- 2. rows (cascades progress + images) -----------------------------
  console.log("--- deleting case rows ---");
  const { count } = await prisma.patientCase.deleteMany({
    where: { id: { in: [...TARGET_IDS] } },
  });
  console.log(`  deleted ${count} case row(s)`);
  console.log();

  // --- 3. post-conditions ------------------------------------------------
  const total = await prisma.patientCase.count();
  const remaining = await prisma.patientCase.findMany({
    select: { trackingId: true, receivedBy: true },
    orderBy: { createdAt: "asc" },
  });
  const orphanProgress = await prisma.caseProgress.count({
    where: { caseId: { in: [...TARGET_IDS] } },
  });
  const orphanImages = await prisma.caseImage.count({
    where: { caseId: { in: [...TARGET_IDS] } },
  });

  console.log("--- verification ---");
  console.log(`  total cases:            ${total}  (expect 4)`);
  console.log(`  orphan progress rows:   ${orphanProgress}  (expect 0)`);
  console.log(`  orphan image rows:      ${orphanImages}  (expect 0)`);
  for (const r of remaining) {
    console.log(`  survivor ${r.trackingId}  receivedBy=${JSON.stringify(r.receivedBy)}`);
  }

  if (count !== 8) die(`deleted ${count}, expected 8`);
  if (total !== 4) die(`total is ${total}, expected 4`);
  if (orphanProgress !== 0 || orphanImages !== 0) die("orphaned child rows remain");
  console.log("\nOK — 8 deleted, 4 remain, no orphans.");
  console.log("Dashboard counts self-heal within 30s (unstable_cache revalidate: 30).");
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
