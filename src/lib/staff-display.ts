import type { StaffOption } from "@/lib/staff";

/**
 * How a roster entry is LABELLED in the UI.
 *
 * Staff names are raw, untranslated Arabic strings shown as-is in every locale —
 * with exactly one exception, the manager identity, which reads "Manager" in
 * English and "المدير" in Arabic. Keyed off `isManager` rather than off the name
 * itself: names are mutable (this one has already been renamed once), and the
 * two plausible spellings of the previous name differ by a single codepoint, so
 * any name-matching rule would be a latent bug.
 *
 * DISPLAY ONLY. Wherever a staff name is a VALUE — most importantly the
 * "Received By" picker, whose selection is stored as PatientCase.receivedBy —
 * the raw `s.name` must be submitted, never this label. receivedBy is a
 * historical snapshot, and writing a localized string into it would make the
 * stored value depend on which language the operator happened to be using.
 *
 * `import type` above is deliberate: @/lib/staff pulls in Prisma, and this
 * helper is used from client components. A type-only import is erased at
 * compile time, so nothing server-side reaches the browser bundle.
 */
export function staffDisplayName(
  staff: Pick<StaffOption, "name" | "isManager">,
  t: (key: string) => string,
): string {
  return staff.isManager ? t("staff.manager") : staff.name;
}
