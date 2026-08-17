/**
 * Admin ACCOUNT helpers — the rows in the `admins` table that back NextAuth
 * login. Deliberately separate from src/lib/staff.ts: StaffMember is the
 * confirmation layer (PINs, manager code) and shares no key or credential with
 * these accounts.
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

// NOTE: this module previously exported generateTemporaryPassword(). Password
// resets are now entered by the manager rather than generated, so the generator
// and its node:crypto dependency were removed instead of being left unused.
