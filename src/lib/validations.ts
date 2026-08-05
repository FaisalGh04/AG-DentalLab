import { z } from "zod";
import { formatTrackingId } from "@/lib/tracking-id-format";
import { isValidCaseTypeForCategory } from "@/lib/case-types";
import {
  MAX_IMAGE_BYTES,
  ALLOWED_IMAGE_LABEL,
  isAllowedImageType,
} from "@/lib/upload-constants";

export const CaseCategoryEnum = z.enum([
  "IMPLANT",
  "C_AND_B",
  "PRESSABLE_CERAMIC",
  "VACUUM_FORMER",
  "SPECIAL_TRAY",
  "RESIN_MODEL",
  "EXTERNAL_LABORATORY_SERVICES",
  "DENTAL_EQUIPMENT",
  "GYPSUM_MODEL",
  "FLEX_DENTURE",
]);

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
  caseType: z.string().trim().min(2, "Case type is required").max(160),
  category: CaseCategoryEnum,
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
 * receivedBy is WRITE-ONCE: it lives on the create schema only, never on the
 * base, so `caseInputBaseSchema.partial()` below cannot pick it up. That is
 * enforcement layers 1 + 2 — `CaseUpdateInput` has no such property (TS won't
 * compile a client that sends it), and because zod objects are non-strict,
 * caseUpdateSchema.parse() silently strips an injected receivedBy off a crafted
 * body. Layers 3 + 4 are the 422 guard and the omitted Prisma field in
 * src/app/api/admin/cases/[id]/route.ts.
 *
 * The value is only shape-checked here. It used to be a compile-time
 * z.enum(RECEIVED_BY_OPTIONS), but StaffMember is now the single source of
 * truth and a DB-driven list cannot be a zod enum — so membership is validated
 * at runtime in the POST route via isActiveStaffName(). That runtime check is a
 * REAL backstop, not just UI convenience: without it any string would pass.
 *
 * `.extend()` has to happen before `.superRefine()` — the latter returns a
 * ZodEffects, which has no .extend().
 */
const caseCreateBaseSchema = caseInputBaseSchema.extend({
  receivedBy: z
    .string({ required_error: "Received by is required" })
    .trim()
    .min(1, "Received by is required")
    .max(120),
});

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

export const caseCreateSchema = caseCreateBaseSchema.superRefine((data, ctx) => {
  if (!isValidCaseTypeForCategory(data.category, data.caseType)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["caseType"],
      message: "Select a case type that belongs to the selected category",
    });
  }
});
export type CaseCreateInput = z.infer<typeof caseCreateSchema>;

export const caseUpdateSchema = caseInputBaseSchema.partial().superRefine(
  (data, ctx) => {
    if (
      data.category &&
      data.caseType &&
      !isValidCaseTypeForCategory(data.category, data.caseType)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["caseType"],
        message: "Select a case type that belongs to the selected category",
      });
    }
  },
);
export type CaseUpdateInput = z.infer<typeof caseUpdateSchema>;

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

// stageKey is immutable — only labels + order are editable.
export const caseStageUpdateSchema = z
  .object({
    labelEn: z.string().trim().min(1).max(120).optional(),
    labelAr: z.string().trim().min(1).max(120).optional(),
    order: z.number().int().min(0).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, "Nothing to update");
export type CaseStageUpdateInput = z.infer<typeof caseStageUpdateSchema>;
