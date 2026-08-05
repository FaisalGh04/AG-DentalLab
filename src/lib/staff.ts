// Staff roster — the SINGLE SOURCE OF TRUTH for both the "Received By" dropdown
// and the confirmation gate's staff list.
//
// FAIL-CLOSED, deliberately diverging from getLifecycleConfig() in lifecycle.ts.
// That loader falls back to a static config on a DB hiccup so the doctor-facing
// tracker can never blank out — correct for CONTENT. This is an AUTH boundary:
// a stale or hardcoded roster could accept a staff member who was deactivated,
// so a DB failure must surface as an error, never as a permissive default.
//
// Note the deliberate asymmetry with PatientCase.receivedBy: that column stores
// a NAME SNAPSHOT, never a FK. Renaming or deactivating someone here changes who
// can be PICKED going forward; it never rewrites who received a past case.

import { cache } from "react";
import { prisma } from "@/lib/prisma";

export interface StaffOption {
  id: string;
  name: string;
  /**
   * The manager identity. Drives RENDERING ONLY — the single-code prompt and the
   * localized "Manager" label. Not a secret (it is a role marker, and the
   * reduced path is visible in the UI by design), and never trusted as an
   * assertion: verifyConfirmation re-reads it from the DB on every attempt.
   */
  isManager: boolean;
}

/**
 * Active staff, ordered for display. Wrapped in React `cache()` so one
 * render/request loads it once.
 *
 * @throws if the DB is unreachable — callers must let this propagate.
 */
export const getActiveStaff = cache(async (): Promise<StaffOption[]> => {
  const rows = await prisma.staffMember.findMany({
    where: { isActive: true },
    select: { id: true, name: true, isManager: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });
  return rows;
});

/**
 * Is `name` a currently-active staff member? Runtime replacement for the old
 * compile-time `z.enum(RECEIVED_BY_OPTIONS)` on receivedBy — a DB-driven list
 * cannot be a zod enum, so the create route validates against this instead.
 */
export async function isActiveStaffName(name: string): Promise<boolean> {
  const staff = await getActiveStaff();
  return staff.some((s) => s.name === name);
}
