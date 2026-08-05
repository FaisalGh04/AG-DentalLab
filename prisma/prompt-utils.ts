/**
 * Shared interactive-prompt helpers for the credential scripts
 * (seed-staff.ts, rotate-manager-code.ts).
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

/** The target database, with credentials stripped, for the confirmation banner. */
export function describeTarget(): string {
  const raw = process.env.DIRECT_URL || process.env.DATABASE_URL || "";
  try {
    const u = new URL(raw);
    return `${u.hostname}:${u.port || "5432"}${u.pathname}`;
  } catch {
    return "(unknown)";
  }
}
