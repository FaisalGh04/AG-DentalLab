import { z } from "zod";
import { formatTrackingId } from "@/lib/tracking-id-format";
import { isValidCaseTypeForCategory } from "@/lib/case-types";

export const CaseStatusEnum = z.enum([
  "RECEIVED",
  "IN_PROGRESS",
  "PRODUCTION",
  "COMPLETED",
]);

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
  currentStatus: CaseStatusEnum.default("RECEIVED"),
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
});
export type ProgressCreateInput = z.infer<typeof progressCreateSchema>;

export const progressUpdateSchema = z.object({
  stepTitle: z.string().trim().min(2).max(160).optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  completed: z.boolean().optional(),
  order: z.number().int().min(0).optional(),
});
export type ProgressUpdateInput = z.infer<typeof progressUpdateSchema>;

// --- Image upload ---------------------------------------------------
export const uploadRequestSchema = z.object({
  fileName: z.string().min(1).max(200),
  contentType: z
    .string()
    .regex(/^image\/(png|jpe?g|webp|avif)$/, "Only image files are allowed"),
  caseId: z.string().min(1),
});
export type UploadRequestInput = z.infer<typeof uploadRequestSchema>;

export const imageAttachSchema = z.object({
  caseId: z.string().min(1),
  imageUrl: z.string().url(),
  key: z.string().min(1),
  caption: z.string().trim().max(200).optional().nullable(),
  // Lifecycle stage this image documents; server falls back to the case's
  // current status when omitted.
  stage: CaseStatusEnum.optional().nullable(),
});
export type ImageAttachInput = z.infer<typeof imageAttachSchema>;
