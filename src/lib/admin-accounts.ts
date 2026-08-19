import { prisma } from "@/lib/prisma";

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

/** The signed-in admin, resolved from the database. */
export interface ActingAdmin {
  id: string;
  email: string;
  /** Admin.name when set, otherwise the email. Never empty. */
  displayName: string;
}

/**
 * THE one way a route learns who is acting. Server-authoritative: it takes the
 * id from the verified session and reads the Admin ROW, so nothing a client
 * sends can influence the answer.
 *
 * Read from the row rather than the JWT claims deliberately — the session lives
 * for 8 hours, so a renamed admin would otherwise keep stamping a stale name
 * onto new stage entries and onto PatientCase.receivedBy.
 *
 * Returns null when the session has no id or the row is gone (deleted
 * mid-session); callers decide whether that is fatal.
 */
export async function resolveActingAdmin(
  adminId: string | null | undefined,
): Promise<ActingAdmin | null> {
  if (!adminId) return null;
  const row = await prisma.admin.findUnique({
    where: { id: adminId },
    select: { id: true, email: true, name: true },
  });
  if (!row) return null;

  const displayName = row.name?.trim() || row.email.trim();
  if (!displayName) return null;
  return { id: row.id, email: row.email, displayName };
}
