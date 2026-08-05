/**
 * TARGETED, one-off staff rename — and the only supported way to mark the
 * manager identity.
 *
 *   npx tsx prisma/rename-staff.ts --list
 *   npx tsx prisma/rename-staff.ts --id <cuid> --to "المدير" --manager
 *   npx tsx prisma/rename-staff.ts --id <cuid> --to "المدير" --manager --apply
 *
 * DRY RUN BY DEFAULT. Nothing is written without --apply.
 *
 * WHY THIS EXISTS INSTEAD OF seed-staff.ts
 * ----------------------------------------
 * seed-staff.ts upserts BY NAME from a hardcoded list, which makes it the wrong
 * tool for a rename in two independent ways:
 *
 *   1. It would not rename anything. An upsert keyed on the NEW name simply
 *      creates a second row, leaving the original active and selectable — so the
 *      roster silently grows instead of changing.
 *   2. It re-prompts for EVERY staff password in one pass, rotating all of them
 *      as a side effect of renaming one person.
 *
 * This script targets a row by ID, never by name. That is not fussiness: the two
 * plausible spellings of the outgoing name differ by a single codepoint
 * ("ابو عمر" starts U+0627, "أبو عمر" starts U+0623), they are not equal even
 * after NFC normalisation, and StaffMember.name is @unique — so a name-matched
 * write silently creates a duplicate rather than failing. Every name this script
 * prints is shown with its codepoints so the operator can see which one they are
 * actually looking at.
 *
 * WHAT IT NEVER TOUCHES
 * ---------------------
 *   - other staff rows
 *   - lockout counters
 *   - any case, audit log, or ManagerSecret
 *   - pinHash, EXCEPT under --manager (see below)
 *
 * NOTE ON HISTORY: PatientCase.receivedBy is a NAME SNAPSHOT, not a foreign key.
 * Renaming here changes who can be PICKED going forward; past cases keep the
 * name they were logged with, by design.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { promptVisible, describeTarget } from "./prompt-utils";

const prisma = new PrismaClient();
const BCRYPT_COST = 12;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const value = process.argv[i + 1];
  // Reject a missing value rather than swallowing the NEXT FLAG as one. Without
  // this, `--id --to "X"` silently reads the id as "--to" and then reports "no
  // staff member with that id" — a confusing error for what is really a typo,
  // and the kind of thing that gets retried blindly on a production shell.
  if (value === undefined || value.startsWith("--")) {
    throw new Error(`--${name} requires a value (got ${value ?? "nothing"}).`);
  }
  return value;
}
const has = (name: string) => process.argv.includes(`--${name}`);

/** Every name is shown with codepoints — see the header for why. */
function codepoints(s: string): string {
  return [...s]
    .map((c) => "U+" + c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0"))
    .join(" ");
}

function show(row: { id: string; name: string; isManager: boolean; isActive: boolean }) {
  console.log(`  id=${row.id}`);
  console.log(`  name="${row.name}"`);
  console.log(`       ${codepoints(row.name)}`);
  console.log(`  isManager=${row.isManager}  isActive=${row.isActive}`);
}

async function main() {
  const apply = has("apply");
  console.log("\n=== Staff rename ===");
  console.log(`Target database: ${describeTarget()}`);
  console.log(apply ? "MODE: APPLY (will write)" : "MODE: DRY RUN (no writes)");

  const all = await prisma.staffMember.findMany({
    orderBy: { order: "asc" },
    select: { id: true, name: true, isManager: true, isActive: true },
  });

  if (has("list") || !arg("id")) {
    console.log(`\nRoster (${all.length} rows):\n`);
    for (const r of all) {
      show(r);
      console.log("");
    }
    if (!arg("id")) {
      console.log("Pass --id <cuid> --to \"<new name>\" to rename. Nothing was written.");
    }
    return;
  }

  const id = arg("id")!;
  const to = arg("to");
  const makeManager = has("manager");

  if (!to && !makeManager) {
    throw new Error("Nothing to do: pass --to \"<new name>\" and/or --manager.");
  }

  // REFUSE on anything other than exactly one match. An id lookup can only ever
  // return 0 or 1, but stating it explicitly means a future change to the lookup
  // cannot quietly start updating several rows.
  const matches = all.filter((r) => r.id === id);
  if (matches.length === 0) {
    throw new Error(`No staff member with id="${id}". Run --list to see the roster.`);
  }
  if (matches.length > 1) {
    throw new Error(`Refusing: ${matches.length} rows matched id="${id}".`);
  }
  const row = matches[0]!;

  // Name collision: StaffMember.name is @unique, so this would fail at the DB
  // anyway — but failing here says WHICH row it collides with.
  if (to) {
    const clash = all.find((r) => r.name === to && r.id !== row.id);
    if (clash) {
      throw new Error(
        `Refusing: another staff member already has the name "${to}" (id=${clash.id}).`,
      );
    }
  }

  // At most one manager. Also enforced by a partial unique index, but this gives
  // a readable error instead of a constraint violation.
  if (makeManager) {
    const existing = all.find((r) => r.isManager && r.id !== row.id);
    if (existing) {
      throw new Error(
        `Refusing: "${existing.name}" (id=${existing.id}) is already the manager. ` +
          "Clear that flag first — there can only be one.",
      );
    }
  }

  console.log("\nBEFORE:");
  show(row);
  console.log("\nAFTER:");
  show({
    id: row.id,
    name: to ?? row.name,
    isManager: makeManager ? true : row.isManager,
    isActive: row.isActive,
  });

  if (makeManager) {
    console.log(
      "\n  --manager also SCRAMBLES this row's pinHash to random bytes nobody\n" +
        "  holds. The manager authenticates against ManagerSecret.PRIMARY and its\n" +
        "  pinHash is never read, so leaving the old hash in place would mean the\n" +
        "  previous personal password silently became valid again the moment the\n" +
        "  flag was ever cleared. Fail closed instead: after this, clearing the\n" +
        "  flag leaves the row with NO usable password until seed-staff.ts is run.",
    );
  }
  console.log("\n  pinHash of every OTHER row: untouched.");
  console.log("  Lockout counters, cases, audit logs, ManagerSecret: untouched.");
  console.log(
    "  Past cases keep the old name in receivedBy — it is a snapshot, not an FK.",
  );

  if (!apply) {
    console.log("\nDRY RUN — nothing was written. Re-run with --apply to commit.\n");
    return;
  }

  const go = (await promptVisible('\nType "yes" to apply: ')).trim();
  if (go !== "yes") {
    console.log("Aborted. Nothing was written.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.staffMember.update({
      where: { id: row.id },
      data: {
        ...(to ? { name: to } : {}),
        ...(makeManager
          ? {
              isManager: true,
              pinHash: await bcrypt.hash(randomBytes(32).toString("hex"), BCRYPT_COST),
            }
          : {}),
      },
    });
  });

  const after = await prisma.staffMember.findUnique({
    where: { id: row.id },
    select: { id: true, name: true, isManager: true, isActive: true },
  });
  console.log("\n✔ Applied. Row is now:");
  if (after) show(after);
  console.log("");
  if (makeManager) {
    console.log(
      "REMINDER: the gate's reduced single-factor path is now LIVE for this row.\n" +
        "See docs/staff-auth.md for the revised threat model.\n",
    );
  }
}

main()
  .catch((e) => {
    // Never print the error object: a thrown Prisma error can echo query
    // parameters, and those could include a hash.
    console.error("\nFailed:", e instanceof Error ? e.message : "unknown error");
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
