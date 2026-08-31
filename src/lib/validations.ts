import { z } from "zod";
import {
  FIRST_TOOTH,
  LAST_TOOTH,
  MAX_ENTRIES_PER_TOOTH,
  MIN_ENTRIES_PER_TOOTH,
} from "@/lib/teeth";
import { formatTrackingId } from "@/lib/tracking-id-format";
import {
  MAX_IMAGE_BYTES,
  ALLOWED_IMAGE_LABEL,
  isAllowedImageType,
} from "@/lib/upload-constants";

export const caseCategoryKeySchema = z
  .string()
  .trim()
  .min(1, "Category is required")
  .max(64)
  .regex(
    /^[A-Z][A-Z0-9_]*$/,
    "Use uppercase letters, numbers, and underscores; start with a letter",
  )
  .refine((value) => value !== "ALL", "ALL is reserved for the admin filter");

// --- Public search --------------------------------------------------
export const searchSchema = z.object({
  trackingId: z.preprocess(
    (value) => (typeof value === "string" ? formatTrackingId(value) : value),
    z
      .string()
      .regex(
        /^AG-[A-HJ-NP-Z2-9]{6}$/,
        "Enter a valid tracking ID, for example AG-8F3K2A",
      ),
  ),
});
export type SearchInput = z.infer<typeof searchSchema>;

/**
 * PUBLIC doctor portal code: ag-{letters}{sequence}-{random4}.
 *
 * Case-insensitive on input (people type however they like) but normalised to
 * the stored form: lowercase prefix/letters, uppercase random suffix.
 *
 * The shape is validated BEFORE any database work so malformed input is
 * rejected without a query — and, importantly, a shape failure is reported the
 * same way as "no such doctor", so the response never distinguishes
 * "wrong format" from "no such code".
 */
export const doctorCodeSchema = z.object({
  code: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z
      .string()
      .regex(/^ag-[A-Za-z]{3}\d{3}-[A-Za-z0-9]{4}$/, "Invalid doctor code")
      .transform((v) => {
        const [prefix, suffix] = v.split("-").slice(0, 2).length ? [v.slice(0, v.lastIndexOf("-")), v.slice(v.lastIndexOf("-") + 1)] : [v, ""];
        return `${prefix.toLowerCase()}-${suffix.toUpperCase()}`;
      }),
  ),
});
export type DoctorCodeInput = z.infer<typeof doctorCodeSchema>;

/** True when the input looks like a doctor portal code rather than a case id. */
export function isDoctorCodeInput(value: string): boolean {
  return /^ag-[A-Za-z]{3}\d{3}-[A-Za-z0-9]{4}$/.test(value.trim());
}

/**
 * The single /track input now accepts EITHER a case tracking id OR a doctor
 * portal code, so the form must validate the union and the caller branches on
 * the shape. The two lookups then use entirely separate API routes — the
 * single-case tracker's code path is not shared or modified.
 */
export const trackInputSchema = z.object({
  trackingId: z
    .string()
    .trim()
    .min(1, "Enter a tracking ID or doctor code")
    .refine(
      (v) =>
        /^AG-[A-HJ-NP-Z2-9]{6}$/.test(formatTrackingId(v)) ||
        isDoctorCodeInput(v),
      "Enter a valid tracking ID (AG-8F3K2A) or doctor code (ag-abc001-K7P2)",
    ),
});
export type TrackInput = z.infer<typeof trackInputSchema>;

/** Patient-name filter inside a doctor portal. Empty = no filter. */
export const doctorPortalQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  archived: z.boolean().optional(),
});

// --- Admin login ----------------------------------------------------
export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type LoginInput = z.infer<typeof loginSchema>;

// --- Case create / update ------------------------------------------
const dateInputSchema = z
  .string()
  .refine(
    (value) =>
      value.length === 0 ||
      /^\d{4}-\d{2}-\d{2}$/.test(value) ||
      z.string().datetime().safeParse(value).success,
    "Enter a valid date",
  );

/**
 * ONE category + case type pair on a tooth. Shape only — membership of the
 * ACTIVE taxonomy is DB-backed and checked in the API layer, exactly like the
 * legacy category/caseType pair below.
 */
export const toothCaseTypeEntrySchema = z.object({
  category: caseCategoryKeySchema,
  caseType: z.string().trim().min(2, "Case type is required").max(160),
});
export type ToothCaseTypeEntryInput = z.infer<typeof toothCaseTypeEntrySchema>;

export const toothItemSchema = z.object({
  toothNumber: z
    .number()
    .int()
    .min(FIRST_TOOTH, "Tooth number must be between 1 and 32")
    .max(LAST_TOOTH, "Tooth number must be between 1 and 32"),
  entries: z
    .array(toothCaseTypeEntrySchema)
    .min(MIN_ENTRIES_PER_TOOTH, "Each selected tooth needs at least one case type")
    .max(MAX_ENTRIES_PER_TOOTH, "A tooth can have at most 4 case types"),
});
export type ToothItemInput = z.infer<typeof toothItemSchema>;

/**
 * The whole per-tooth plan. Every rule the feature promises lives HERE and
 * therefore runs on the server for free — the client reuses this same schema,
 * so the two can never disagree about what is valid.
 */
export const toothItemsSchema = z
  .array(toothItemSchema)
  .min(1, "Select at least one tooth")
  // 32 teeth exist; more than 32 items means duplicates, caught below anyway.
  .max(LAST_TOOTH)
  .superRefine((items, ctx) => {
    const seen = new Set<number>();
    for (const [index, item] of items.entries()) {
      if (seen.has(item.toothNumber)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, "toothNumber"],
          message: `Tooth ${item.toothNumber} is listed more than once`,
        });
      }
      seen.add(item.toothNumber);
    }
  });

const caseInputBaseSchema = z.object({
  patientFirstName: z.string().trim().min(1, "First name is required").max(80),
  patientLastName: z.string().trim().min(1, "Last name is required").max(80),
  doctorName: z.string().trim().min(2, "Doctor name is required").max(120),
  // Optional roster link. NULL = free-text one-off doctor. Lives on the BASE
  // schema so it is editable after creation (retroactive linking), and because
  // it is not a lifecycle field it never triggers the confirmation gate.
  doctorId: z
    .string()
    .trim()
    .max(40)
    .optional()
    .nullable()
    .transform((v) => v || null),
  /**
   * LEGACY single-value taxonomy snapshot. Optional as of the per-tooth model:
   * a client sending `toothItems` omits both, and the SERVER derives them (see
   * deriveLegacyTaxonomy in src/lib/case-tooth-items.ts) rather than trusting a
   * client-computed value. Still accepted on its own so any caller that has not
   * moved to tooth items keeps working unchanged.
   */
  caseType: z.string().trim().min(2, "Case type is required").max(160).optional(),
  category: caseCategoryKeySchema.optional(),
  /**
   * The per-tooth plan. When present it is the SOURCE OF TRUTH and the two
   * fields above are derived from it, ignoring whatever the client sent.
   */
  toothItems: toothItemsSchema.optional(),
  // Production-template selection. The route validates that the stage belongs to
  // the collection and derives isCompleted; empty string is normalized to null.
  collectionId: z
    .string()
    .trim()
    .max(80)
    .optional()
    .nullable()
    .transform((v) => v || null),
  currentStageId: z
    .string()
    .trim()
    .max(80)
    .optional()
    .nullable()
    .transform((v) => v || null),
  hiddenStageIds: z.array(z.string().trim().max(80)).max(50).optional(),
  estimatedCompletionDate: dateInputSchema.nullable().optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

/**
 * receivedBy is SERVER-DERIVED and appears on NO schema in this file — not
 * create, not update.
 *
 * It used to be a required field on the create schema, chosen by the operator
 * from the StaffMember roster. It is now taken from the authenticated admin
 * session in src/app/api/admin/cases/route.ts and is never accepted from a
 * client on any route. Its absence here IS the enforcement: zod objects are
 * non-strict, so `caseCreateSchema.parse()` and `caseUpdateSchema.parse()` both
 * silently strip an injected `receivedBy` off a crafted body, and neither
 * `CaseCreateInput` nor `CaseUpdateInput` has the property, so TypeScript will
 * not compile a client that tries to send one.
 *
 * The remaining layers are unchanged and still guard the write-once rule after
 * creation: the loud 422 guard and the omitted Prisma field in
 * src/app/api/admin/cases/[id]/route.ts.
 */

/**
 * The two-factor confirmation payload accompanying a gated mutation.
 *
 * Sent WITH the mutation rather than exchanged for a token, so verification and
 * the write are atomic — there is no window in which an approval exists but the
 * action has not happened. Consequence: these bodies must never be logged or
 * captured by Sentry.
 */
export const confirmationSchema = z.object({
  staffId: z.string().trim().min(1, "Select who is performing this action"),
  /**
   * OPTIONAL at the schema level ONLY because the manager identity authenticates
   * with a single code. This is NOT a relaxation of the gate:
   *
   *   - the SERVER decides which path applies, by reading isManager from the DB
   *     row for this staffId — a client can never assert that it is the manager
   *   - for any other staff member, src/lib/staff-auth.ts treats a missing or
   *     empty password as a FAILED attempt (counting toward lockout), never as
   *     a bypass
   *
   * Rejecting it here instead would be the wrong layer: the schema does not know
   * who the staffId belongs to, and asking it to would mean a DB read inside
   * validation.
   */
  staffPassword: z.string().max(200).optional(),
  managerCode: z.string().min(1, "Manager code is required").max(200),
});
export type ConfirmationInputDTO = z.infer<typeof confirmationSchema>;

// --- Admin security settings ---------------------------------------
// Deliberately accepts ONLY the manager code. The server resolves the one
// isManager staff row itself, so a client cannot choose another identity or
// smuggle the ordinary staff confirmation path into this always-protected action.
export const securitySettingUpdateSchema = z.object({
  enabled: z.boolean(),
  managerCode: z.string().min(1, "Manager code is required").max(200),
});
export type SecuritySettingUpdateInput = z.infer<
  typeof securitySettingUpdateSchema
>;

// --- Admin account password management -----------------------------
//
// Minimum length for a NEW admin login password, set to match loginSchema's 8
// so the rule for creating a credential is the same as the rule for using one.
//
// This governs ADMIN ACCOUNT passwords only (the `admins` rows behind NextAuth).
// The staff confirmation layer is unrelated and unaffected: staffPinSchema below
// keeps its own 6-digit rule, and the manager code keeps its own.
export const ADMIN_PASSWORD_MIN_LENGTH = 8;

/**
 * THE shared strength rule for any new admin login password. Both the non-owner
 * reset and the owner change use this exact field, so the two can never drift
 * apart — a password acceptable in one place is acceptable in the other.
 */
const adminNewPasswordField = z
  .string()
  .min(
    ADMIN_PASSWORD_MIN_LENGTH,
    `Password must be at least ${ADMIN_PASSWORD_MIN_LENGTH} characters`,
  )
  .max(200);

/** Shared confirmation check, so the message and path are identical everywhere. */
function requireMatchingConfirmation(
  data: { newPassword: string; confirmPassword: string },
  ctx: z.RefinementCtx,
) {
  if (data.newPassword !== data.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["confirmPassword"],
      message: "Passwords do not match",
    });
  }
}

/**
 * Reset a NON-OWNER admin's password. The manager CHOOSES the new password and
 * submits it here; nothing is generated server-side and no password is ever
 * returned in the response.
 *
 * `adminId` is an opaque id, never an email: the server resolves the row and
 * re-checks that it is not the owner. A client cannot nominate a target by
 * address and cannot assert anything about the target's role.
 */
export const adminPasswordResetSchema = z
  .object({
    adminId: z.string().trim().min(1, "Select an admin account").max(40),
    managerCode: z.string().min(1, "Manager code is required").max(200),
    newPassword: adminNewPasswordField,
    confirmPassword: z.string().min(1, "Confirm the new password").max(200),
  })
  .superRefine(requireMatchingConfirmation);
export type AdminPasswordResetInput = z.infer<typeof adminPasswordResetSchema>;

/**
 * Change the OWNER's own password. Requires three things, all verified
 * server-side: the signed-in session IS the owner, the current owner password,
 * and the PRIMARY manager code. The confirmation field is checked here so a
 * mistyped password is caught before any hashing or DB work.
 */
export const ownerPasswordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required").max(200),
    newPassword: adminNewPasswordField,
    confirmPassword: z.string().min(1, "Confirm the new password").max(200),
    managerCode: z.string().min(1, "Manager code is required").max(200),
  })
  .superRefine((data, ctx) => {
    requireMatchingConfirmation(data, ctx);
    // Cheap guard against a no-op change that would still rotate updatedAt and
    // write a misleading "password changed" audit line.
    if (data.newPassword === data.currentPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newPassword"],
        message: "New password must be different from the current one",
      });
    }
  });
export type OwnerPasswordChangeInput = z.infer<typeof ownerPasswordChangeSchema>;

// Taxonomy membership is DB-backed and therefore checked in the API after this
// shape validation. This also lets unchanged historical snapshots remain
// editable after an option is renamed or deactivated.
// Create and update now validate the SAME field set; they differ only in that
// update makes every field optional. receivedBy is on neither — see the note
// above caseInputBaseSchema's create/update split.
/**
 * Creation needs a treatment plan one way or the other. Making category and
 * caseType individually optional above would otherwise let a case be created
 * with NO taxonomy at all, which the old required fields prevented.
 */
export const caseCreateSchema = caseInputBaseSchema.superRefine((data, ctx) => {
  // toothItems was SENT: toothItemsSchema has already reported anything wrong
  // with it (including an empty array). Adding more here would stack three
  // overlapping messages on the same field.
  if (data.toothItems !== undefined) return;
  // Neither shape was sent at all.
  if (!data.category || !data.caseType) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["toothItems"],
      message: "Select at least one tooth",
    });
  }
});
export type CaseCreateInput = z.infer<typeof caseCreateSchema>;

// Partial of the BASE, not of caseCreateSchema: an edit that only touches
// `notes` must not be forced to resend the treatment plan. Omitting toothItems
// on a PATCH means "leave the existing teeth alone" (see the [id] route).
export const caseUpdateSchema = caseInputBaseSchema.partial();
export type CaseUpdateInput = z.infer<typeof caseUpdateSchema>;

export const caseCategoryConfigUpdateSchema = z
  .object({
    labelEn: z.string().trim().min(1).max(120).optional(),
    labelAr: z.string().trim().min(1).max(120).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, "Nothing to update");
export type CaseCategoryConfigUpdateInput = z.infer<
  typeof caseCategoryConfigUpdateSchema
>;

// Strict on purpose: the server owns category-key generation. A stale or
// malicious client cannot smuggle its own `category` key into this payload.
export const caseCategoryCreateSchema = z
  .object({
    labelEn: z.string().trim().min(1).max(120),
    labelAr: z.string().trim().min(1).max(120),
  })
  .strict();
export type CaseCategoryCreateInput = z.infer<typeof caseCategoryCreateSchema>;

export const caseTypeCreateSchema = z.object({
  name: z.string().trim().min(2, "Case type name is required").max(160),
});
export type CaseTypeCreateInput = z.infer<typeof caseTypeCreateSchema>;

export const caseTypeUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(160).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, "Nothing to update");
export type CaseTypeUpdateInput = z.infer<typeof caseTypeUpdateSchema>;

// --- Manager-only Staff Management ---------------------------------
const staffPinSchema = z
  .string()
  .min(6, "Use at least 6 digits")
  .max(200)
  .regex(/^\d+$/, "Use digits only");

export const staffManagementUnlockSchema = z.object({
  managerCode: z.string().min(1, "Manager code is required").max(200),
});
export type StaffManagementUnlockInput = z.infer<
  typeof staffManagementUnlockSchema
>;

export const staffCreateSchema = z
  .object({
    name: z.string().trim().min(2, "Staff name is required").max(120),
    password: staffPinSchema,
    isActive: z.boolean().default(true),
    isManager: z.boolean().default(false),
    demotedManagerPassword: staffPinSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.isManager && !data.demotedManagerPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["demotedManagerPassword"],
        message: "Set a staff PIN for the outgoing manager",
      });
    }
  });
export type StaffCreateInput = z.infer<typeof staffCreateSchema>;

export const staffUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    password: staffPinSchema.optional(),
    isActive: z.boolean().optional(),
    makeManager: z.boolean().optional(),
    demotedManagerPassword: staffPinSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.makeManager && !data.demotedManagerPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["demotedManagerPassword"],
        message: "Set a staff PIN for the outgoing manager",
      });
    }
    if (
      data.name === undefined &&
      data.password === undefined &&
      data.isActive === undefined &&
      !data.makeManager
    ) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Nothing to update" });
    }
  });
export type StaffUpdateInput = z.infer<typeof staffUpdateSchema>;

export const managerSecretChangeSchema = z
  .object({
    currentManagerCode: z.string().min(1).max(200),
    newManagerCode: staffPinSchema,
    confirmManagerCode: z.string().min(1).max(200),
  })
  .refine((data) => data.newManagerCode === data.confirmManagerCode, {
    path: ["confirmManagerCode"],
    message: "Manager codes do not match",
  });
export type ManagerSecretChangeInput = z.infer<
  typeof managerSecretChangeSchema
>;

// --- Doctors --------------------------------------------------------
/**
 * `codeLetters` is exactly 3 lowercase Latin letters. It is auto-suggested from
 * the Arabic name but ADMIN-EDITABLE, because Arabic-to-Latin romanisation is
 * not deterministic — so it is validated for shape here, never for "correctness".
 */
const codeLettersSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z]{3}$/, "Code letters must be exactly 3 Latin letters (a-z)");

export const doctorCreateSchema = z.object({
  name: z.string().trim().min(2, "Doctor name is required").max(120),
  codeLetters: codeLettersSchema,
});
export type DoctorCreateInput = z.infer<typeof doctorCreateSchema>;

/**
 * Update carries name and/or isActive ONLY. `code`, `codeLetters` and
 * `sequence` are absent by design: they are immutable once issued because
 * cases and printed/spoken references depend on them. Rotation is a separate
 * endpoint that regenerates only the random suffix.
 */
export const doctorUpdateSchema = z.object({
  name: z.string().trim().min(2, "Doctor name is required").max(120).optional(),
  isActive: z.boolean().optional(),
});
export type DoctorUpdateInput = z.infer<typeof doctorUpdateSchema>;

// --- Progress steps -------------------------------------------------
export const progressCreateSchema = z.object({
  stepTitle: z.string().trim().min(2, "Step title is required").max(160),
  description: z.string().trim().max(1000).optional().nullable(),
  completed: z.boolean().default(false),
  order: z.number().int().min(0).optional(),
  // Stage id this step documents; server falls back to the case's current stage
  // when omitted (and null = General / unscoped). Same shape as image stageId.
  stageId: z.string().trim().max(80).optional().nullable(),
});
export type ProgressCreateInput = z.infer<typeof progressCreateSchema>;

export const progressUpdateSchema = z.object({
  stepTitle: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  completed: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
  stageId: z.string().trim().max(80).optional().nullable(),
});
export type ProgressUpdateInput = z.infer<typeof progressUpdateSchema>;

// --- Quick-Add steps (DB-backed per-stage chips) --------------------
export const quickAddStepCreateSchema = z.object({
  collectionId: z.string().trim().min(1).max(80),
  stageId: z.string().trim().min(1).max(80),
  labelEn: z.string().trim().min(1, "English label is required").max(160),
  labelAr: z.string().trim().min(1, "Arabic label is required").max(160),
});
export type QuickAddStepCreateInput = z.infer<typeof quickAddStepCreateSchema>;

export const quickAddStepUpdateSchema = z
  .object({
    labelEn: z.string().trim().min(1, "English label is required").max(160).optional(),
    labelAr: z.string().trim().min(1, "Arabic label is required").max(160).optional(),
    order: z.number().int().min(0).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, "Nothing to update");
export type QuickAddStepUpdateInput = z.infer<typeof quickAddStepUpdateSchema>;

// --- Image upload ---------------------------------------------------
export const uploadRequestSchema = z.object({
  fileName: z.string().min(1).max(200),
  contentType: z
    .string()
    .refine(isAllowedImageType, `Only ${ALLOWED_IMAGE_LABEL} images are allowed`),
  // Declared size — validated here to reject before issuing a presigned URL.
  // The real object size is re-verified at confirm time (S-M6).
  fileSize: z
    .number()
    .int()
    .positive()
    .max(MAX_IMAGE_BYTES, "Image exceeds the 15MB limit"),
  caseId: z.string().min(1),
});
export type UploadRequestInput = z.infer<typeof uploadRequestSchema>;

export const imageAttachSchema = z.object({
  caseId: z.string().min(1),
  // The public URL is no longer stored/sent — the client only reports the
  // storage object key, which the server signs on demand (S-M3).
  key: z.string().min(1),
  caption: z.string().trim().max(200).optional().nullable(),
  // Stage id this image documents; server falls back to the case's current
  // stage when omitted (and null = General).
  stageId: z.string().trim().max(80).optional().nullable(),
});
export type ImageAttachInput = z.infer<typeof imageAttachSchema>;

// --- Portfolio ("Our Work" showcase) --------------------------------

// Folder CRUD (admin-managed portfolio_folders). Order is server-assigned on
// create (append) and changed via reorder; not part of the create payload.
export const folderCreateSchema = z.object({
  labelEn: z.string().trim().min(1, "English name is required").max(120),
  labelAr: z.string().trim().min(1, "Arabic name is required").max(120),
});
export type FolderCreateInput = z.infer<typeof folderCreateSchema>;

export const folderUpdateSchema = z
  .object({
    labelEn: z.string().trim().min(1).max(120).optional(),
    labelAr: z.string().trim().min(1).max(120).optional(),
    order: z.number().int().min(0).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, "Nothing to update");
export type FolderUpdateInput = z.infer<typeof folderUpdateSchema>;

export const portfolioItemCreateSchema = z.object({
  // DB-backed folder link — the folder each item belongs to.
  folderId: z.string().cuid("A folder is required"),
  titleEn: z.string().trim().min(1, "English title is required").max(160),
  titleAr: z.string().trim().min(1, "Arabic title is required").max(160),
  descriptionEn: z
    .string()
    .trim()
    .min(1, "English description is required")
    .max(2000),
  descriptionAr: z
    .string()
    .trim()
    .min(1, "Arabic description is required")
    .max(2000),
  // Optional on create — the route appends to the end of the folder when omitted.
  order: z.number().int().min(0).optional(),
});
export type PortfolioItemCreateInput = z.infer<typeof portfolioItemCreateSchema>;

export const portfolioItemUpdateSchema = portfolioItemCreateSchema
  .partial()
  .refine((d) => Object.keys(d).length > 0, "Nothing to update");
export type PortfolioItemUpdateInput = z.infer<typeof portfolioItemUpdateSchema>;

// Image metadata sent alongside a multipart upload. The file's bytes are
// validated server-side (size + magic-byte sniff); these dimensions are
// client-measured and used only for gallery layout.
export const portfolioImageMetaSchema = z.object({
  width: z.coerce.number().int().positive().max(20000),
  height: z.coerce.number().int().positive().max(20000),
});
export type PortfolioImageMetaInput = z.infer<typeof portfolioImageMetaSchema>;

// --- Case groups / stage-sets / stages (admin lifecycle management) --
export const caseGroupCreateSchema = z.object({
  labelEn: z.string().trim().min(1, "English name is required").max(120),
  labelAr: z.string().trim().min(1, "Arabic name is required").max(120),
});
export type CaseGroupCreateInput = z.infer<typeof caseGroupCreateSchema>;

export const caseGroupUpdateSchema = z
  .object({
    labelEn: z.string().trim().min(1).max(120).optional(),
    labelAr: z.string().trim().min(1).max(120).optional(),
    order: z.number().int().min(0).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, "Nothing to update");
export type CaseGroupUpdateInput = z.infer<typeof caseGroupUpdateSchema>;

export const stageSetCreateSchema = z.object({
  type: z.enum(["REGULAR", "DIGITAL"]),
  labelEn: z.string().trim().min(1, "English name is required").max(120),
  labelAr: z.string().trim().min(1, "Arabic name is required").max(120),
});
export type StageSetCreateInput = z.infer<typeof stageSetCreateSchema>;

export const stageSetUpdateSchema = z
  .object({
    labelEn: z.string().trim().min(1).max(120).optional(),
    labelAr: z.string().trim().min(1).max(120).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, "Nothing to update");
export type StageSetUpdateInput = z.infer<typeof stageSetUpdateSchema>;

export const caseStageCreateSchema = z.object({
  labelEn: z.string().trim().min(1, "English name is required").max(120),
  labelAr: z.string().trim().min(1, "Arabic name is required").max(120),
});
export type CaseStageCreateInput = z.infer<typeof caseStageCreateSchema>;

/**
 * Overdue threshold for a stage, in MINUTES.
 *
 * `.nullable()` is the switch-off value and is meaningfully different from
 * omitting the key: null clears an existing threshold, absent leaves it alone.
 * Floor of 15 = the 0.25 h the UI offers as its smallest step; ceiling of
 * 1,000,000 min (~2 years) is a sanity bound, not a policy.
 */
const overdueAfterMinutesSchema = z
  .number()
  .int("Use whole minutes")
  .min(15, "Must be at least 0.25 hours")
  .max(1_000_000)
  .nullable();

// stageKey is immutable — only labels, order and the overdue threshold are
// editable.
export const caseStageUpdateSchema = z
  .object({
    labelEn: z.string().trim().min(1).max(120).optional(),
    labelAr: z.string().trim().min(1).max(120).optional(),
    order: z.number().int().min(0).optional(),
    overdueAfterMinutes: overdueAfterMinutesSchema.optional(),
  })
  .refine((d) => Object.keys(d).length > 0, "Nothing to update");
export type CaseStageUpdateInput = z.infer<typeof caseStageUpdateSchema>;

// ------------------------------------------------------------------
// Stage-overdue notifications (admin only)
// ------------------------------------------------------------------

/**
 * Target for a read/mute mutation: either an explicit list of cases or every
 * currently-overdue one.
 *
 * Only case ids cross the wire. The stage and the visit timestamp that complete
 * a notification's identity are resolved server-side from the case row (see
 * applyNoticeState), so a caller cannot address a notification that does not
 * exist or forge state for a stage a case has already left.
 */
const noticeTargetShape = {
  caseIds: z.array(z.string().min(1).max(64)).max(500).optional(),
  all: z.boolean().optional(),
};

const requireTarget = (d: { caseIds?: string[]; all?: boolean }) =>
  d.all === true || (d.caseIds?.length ?? 0) > 0;

export const noticeReadSchema = z
  .object(noticeTargetShape)
  .refine(requireTarget, "Nothing to mark read");
export type NoticeReadInput = z.infer<typeof noticeReadSchema>;

export const noticeMuteSchema = z
  .object({ ...noticeTargetShape, muted: z.boolean() })
  .refine(requireTarget, "Nothing to mute or unmute");
export type NoticeMuteInput = z.infer<typeof noticeMuteSchema>;
