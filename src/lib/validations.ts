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

export const caseCreateSchema = caseInputBaseSchema.superRefine((data, ctx) => {
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
