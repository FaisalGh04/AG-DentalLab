/**
 * Seed the initial doctor roster — 27 doctors, sequences 001..027 in the exact
 * order below. Codes are issued as ag-{letters}{sequence}-{random4}.
 *
 *   npx tsx --env-file=.env prisma/seed-doctors.ts            (dry run)
 *   npx tsx --env-file=.env prisma/seed-doctors.ts --commit   (writes)
 *
 * DRY RUN BY DEFAULT: prints the full roster with the codes it would issue,
 * so the transliteration can be reviewed before anything is written.
 *
 * Idempotent-ish: refuses to run if the doctors table is not empty, so a second
 * run cannot silently duplicate the roster or burn sequence numbers. To reseed,
 * clear the table deliberately first.
 *
 * TRANSLITERATION: letters come from suggestLetters() (dictionary-backed), with
 * two deliberate overrides below. Both are collisions where two DIFFERENT names
 * happened to produce the same fragment; the sequence already keeps the codes
 * unique, so these are purely for human recognisability.
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";
import {
  suggestLetters,
  withDoctorPrefix,
  buildCode,
  randomSuffix,
} from "../src/lib/doctor-code";

const prisma = new PrismaClient();
const COMMIT = process.argv.includes("--commit");

/** Exact creation order. Position = sequence number. */
const NAMES = [
  "معتصم القاضي",      // 1
  "عامر زنداقي",        // 2
  "هالة اليماني",       // 3
  "أمين العبدالله",     // 4
  "فريد حداد",          // 5
  "خالد الحاج",         // 6
  "احمد سلام",          // 7
  "سجى الرواش",         // 8
  "ثائر حدادين",        // 9
  "داوود ابو سراج",     // 10
  "منال الحمدان",       // 11
  "عميد الرمحي",        // 12
  "سمى الصالح",         // 13
  "محمود ابو السمن",    // 14
  "عمر عواد",           // 15
  "محسن الكردي",        // 16
  "حسين الجغبير",       // 17
  "سامي عزام",          // 18
  "محمد ابو الحاج",     // 19
  "رنى قبيعة",          // 20
  "عمر غطاشه",          // 21
  "نيرمين عثمان",       // 22
  "وليد المومني",       // 23
  "رند خطاري",          // 24
  "عالية النسور",       // 25
  "مصعب نعانعة",        // 26
  "لارا سنجقية",        // 27
] as const;

/**
 * Manual letter overrides, keyed by sequence. Both separate an accidental
 * collision between two different names:
 *   2  عامر  -> "aam"  (was "ame", colliding with 12 عميد)
 *   19 محمد  -> "mhd"  (was "moh", colliding with 16 محسن)
 * Codes would be unique either way; this is for people reading them.
 */
const LETTER_OVERRIDES: Record<number, string> = {
  2: "aam",
  19: "mhd",
};

function suffix() {
  return randomSuffix(randomBytes(16));
}

async function main() {
  console.log(COMMIT ? "=== MODE: COMMIT ===" : "=== MODE: DRY RUN ===");

  const raw = process.env.DIRECT_URL || process.env.DATABASE_URL || "";
  let target = "(unknown)";
  try {
    const u = new URL(raw);
    target = `${u.hostname}:${u.port || "5432"}${u.pathname}`;
  } catch {
    /* ignore */
  }
  console.log(`Target database: ${target}\n`);

  const existing = await prisma.doctor.count();
  if (existing > 0) {
    throw new Error(
      `Refusing to seed: doctors table already has ${existing} row(s). ` +
        "Clear it deliberately first — reseeding would duplicate the roster " +
        "and burn sequence numbers, which are never reused.",
    );
  }

  const rows = NAMES.map((n, i) => {
    const sequence = i + 1;
    const s = suggestLetters(n);
    const override = LETTER_OVERRIDES[sequence];
    const letters = override ?? s.letters;
    return {
      sequence,
      name: withDoctorPrefix(n),
      letters,
      overridden: !!override,
      suggested: s.letters,
      needsReview: s.needsReview,
      reason: s.reason,
      code: buildCode(letters, sequence, suffix()),
    };
  });

  console.log("seq | name                       | ltr | code");
  console.log("----+----------------------------+-----+---------------------");
  for (const r of rows) {
    const mark = r.overridden ? ` (override, was "${r.suggested}")` : "";
    console.log(
      `${String(r.sequence).padStart(3)} | ${r.name.padEnd(26)} | ${r.letters} | ${r.code}${mark}`,
    );
  }

  const flagged = rows.filter((r) => r.needsReview && !r.overridden);
  console.log(
    `\nlow-confidence transliterations: ${flagged.length === 0 ? "none" : ""}`,
  );
  for (const f of flagged) console.log(`  ${f.sequence}. ${f.name} -> "${f.letters}" (${f.reason})`);

  if (!COMMIT) {
    console.log("\nDRY RUN — nothing written. Re-run with --commit to seed.");
    return;
  }

  await prisma.$transaction(
    rows.map((r) =>
      prisma.doctor.create({
        data: {
          name: r.name,
          code: r.code,
          codeLetters: r.letters,
          sequence: r.sequence,
        },
      }),
    ),
  );

  const total = await prisma.doctor.count();
  console.log(`\n✔ Seeded ${total} doctors (sequences 001..${String(total).padStart(3, "0")}).`);
  if (total !== NAMES.length) {
    throw new Error(`expected ${NAMES.length} doctors, found ${total}`);
  }
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e instanceof Error ? e.message : "unknown error");
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
