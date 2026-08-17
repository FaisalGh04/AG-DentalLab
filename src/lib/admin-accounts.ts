import { randomBytes } from "node:crypto";

/**
 * Admin ACCOUNT helpers — the rows in the `admins` table that back NextAuth
 * login. Deliberately separate from src/lib/staff.ts: StaffMember is the
 * confirmation layer (PINs, manager code) and shares no key or credential with
 * these accounts.
 *
 * SERVER ONLY. This module imports node:crypto and must never be pulled into a
 * client component — the owner's identity is not a secret, but the password
 * generator has no business in a browser bundle.
 */

/** bcrypt cost — same as src/auth.ts, prisma/seed-staff.ts and the Admin rows. */
export const ADMIN_BCRYPT_COST = 12;

/**
 * The owner account. Read from the same env var prisma/seed.ts uses, with the
 * identical default, so the two can never disagree about who the owner is.
 *
 * Normalized the same way src/auth.ts normalizes a login email (trim +
 * lowercase), because that is what the `admins.email` unique index holds.
 */
export const OWNER_EMAIL = normalizeAdminEmail(
  process.env.ADMIN_EMAIL ?? "owner@agdentallab.com",
);

/** The one definition of how an admin email is keyed. Mirrors src/auth.ts. */
export function normalizeAdminEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** True when this email is the protected owner account. */
export function isOwnerEmail(email: string | null | undefined): boolean {
  return !!email && normalizeAdminEmail(email) === OWNER_EMAIL;
}

/**
 * Ambiguity-free alphabet — same convention as TRACKING_ID_ALPHABET and the
 * break-glass code in prisma/seed-staff.ts. No O/0 or I/l/1: a temporary
 * password is read aloud or copied by hand at least once.
 */
const TEMP_PASSWORD_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

/**
 * Length of a generated temporary password. ~116 bits over the alphabet above.
 * Nobody memorises these — they are handed over and replaced — so length costs
 * nothing and removes any question of offline guessability.
 */
const TEMP_PASSWORD_LENGTH = 20;

/**
 * Cryptographically random, rejection-sampled to avoid modulo bias (the same
 * generator shape as generateBreakGlassCode in prisma/seed-staff.ts).
 *
 * The caller must return this to the operator EXACTLY ONCE and store only its
 * bcrypt hash. It is never logged, never included in an error, and never
 * written to any audit row.
 */
export function generateTemporaryPassword(): string {
  const out: string[] = [];
  const limit = 256 - (256 % TEMP_PASSWORD_ALPHABET.length);
  while (out.length < TEMP_PASSWORD_LENGTH) {
    for (const byte of randomBytes(TEMP_PASSWORD_LENGTH)) {
      if (byte >= limit) continue; // reject bias
      out.push(TEMP_PASSWORD_ALPHABET.charAt(byte % TEMP_PASSWORD_ALPHABET.length));
      if (out.length === TEMP_PASSWORD_LENGTH) break;
    }
  }
  return out.join("");
}
