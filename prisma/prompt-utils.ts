/**
 * Shared helpers for the credential scripts (seed-staff.ts, rename-staff.ts,
 * rotate-manager-code.ts): interactive prompting, and the ONE definition of
 * which database those scripts talk to.
 *
 * Extracted so the SECRET-HANDLING RULES have exactly one implementation. Two
 * copies of "never echo a keystroke, never print a secret, require it twice"
 * are two chances for one of them to quietly stop being true.
 *
 * The rules these enforce:
 *   - keystrokes are never echoed
 *   - no secret is ever printed, logged, or put in an error message
 *   - every secret is typed TWICE and must match (a typo'd manager code would
 *     otherwise lock out every gated action with no way to discover why)
 *   - callers must refuse to run outside a TTY, so secrets cannot be piped in
 */
import * as readline from "node:readline";
import { PrismaClient } from "@prisma/client";

/** Read a line with the keystrokes hidden (no echo, no history). */
export function promptHidden(question: string): Promise<string> {
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

export function promptVisible(question: string): Promise<string> {
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
export async function promptSecretTwice(
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

/** Refuse to run without a real terminal, so secrets cannot be piped in. */
export function requireTTY(): void {
  if (!process.stdin.isTTY) {
    throw new Error(
      "Refusing to run without an interactive terminal. Secrets must be typed, " +
        "never piped — run this directly in your own shell.",
    );
  }
}

/**
 * The connection the credential scripts use — DIRECT_URL first.
 *
 * These scripts previously did a bare `new PrismaClient()`, which resolves
 * DATABASE_URL: in production that is Supabase's TRANSACTION-mode pooler on
 * 6543. Measured from a remote operator machine, an interactive transaction
 * costs ~570 ms per statement through that pooler versus ~355 ms through the
 * 5432 session pooler. seed-staff.ts's write block holds EIGHT statements, so
 * over 6543 it lands at roughly 5.4 s — past Prisma's 5000 ms interactive
 * transaction cap. Prisma then reaps the transaction and the next statement
 * fails with "Transaction not found. Transaction ID is invalid…".
 *
 * That is a LATENCY cliff, not a pooler incompatibility: 1-4 statements
 * succeed over 6543. It never appeared against a local scratch database
 * because loopback round-trips are sub-millisecond. Preferring DIRECT_URL
 * takes the faster path and keeps admin CLI work on the same connection
 * Prisma Migrate already uses (schema.prisma's `directUrl`).
 *
 * Returns undefined when neither is set, so the caller falls back to Prisma's
 * own resolution and its error message, rather than inventing a worse one.
 */
export function resolveAdminDatabaseUrl(): string | undefined {
  return process.env.DIRECT_URL || process.env.DATABASE_URL || undefined;
}

/**
 * Prisma client for the credential scripts.
 *
 * Uses resolveAdminDatabaseUrl so the connection and the describeTarget()
 * banner can never disagree — before this, the banner read DIRECT_URL while
 * the client used DATABASE_URL, so a confirmation prompt could in principle
 * name a different database than the one about to be written.
 */
export function createAdminPrismaClient(): PrismaClient {
  const url = resolveAdminDatabaseUrl();
  return url ? new PrismaClient({ datasources: { db: { url } } }) : new PrismaClient();
}

/**
 * Transaction budget for the credential scripts.
 *
 * Prisma's defaults are timeout 5000 ms / maxWait 2000 ms. Preferring
 * DIRECT_URL alone would leave seed-staff.ts at ~2.8 s against a 5 s cap —
 * enough headroom to pass today and to break again from a slower network. An
 * explicit budget removes the cliff instead of moving it. These writes are a
 * handful of upserts against tiny tables, so a long ceiling costs nothing:
 * it bounds a hang, it does not make the normal path slower.
 */
export const ADMIN_TX_OPTIONS = { timeout: 30_000, maxWait: 10_000 } as const;

/** The target database, with credentials stripped, for the confirmation banner. */
export function describeTarget(): string {
  const raw = resolveAdminDatabaseUrl() ?? "";
  try {
    const u = new URL(raw);
    return `${u.hostname}:${u.port || "5432"}${u.pathname}`;
  } catch {
    return "(unknown)";
  }
}
