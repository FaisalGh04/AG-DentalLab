import { z } from "zod";

export const CaseStatusEnum = z.enum([
  "RECEIVED",
  "IN_PROGRESS",
  "PRODUCTION",
  "COMPLETED",
]);

export const CaseCategoryEnum = z.enum([
  "FIXED_RESTORATIONS",
  "IMPLANT_SOLUTIONS",
  "ORAL_APPLIANCES",
  "DIGITAL_DENTISTRY",
]);

// --- Public search --------------------------------------------------
export const searchSchema = z.object({
  patientName: z
    .string()
    .trim()
    .min(2, "Enter at least 2 characters")
    .max(120, "Name is too long"),
});
export type SearchInput = z.infer<typeof searchSchema>;

// --- Admin login ----------------------------------------------------
export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type LoginInput = z.infer<typeof loginSchema>;

// --- Case create / update ------------------------------------------
export const caseCreateSchema = z.object({
  patientFirstName: z.string().trim().min(1, "First name is required").max(80),
  patientLastName: z.string().trim().min(1, "Last name is required").max(80),
  doctorName: z.string().trim().min(2, "Doctor name is required").max(120),
  caseType: z.string().trim().min(2, "Case type is required").max(160),
  category: CaseCategoryEnum,
  currentStatus: CaseStatusEnum.default("RECEIVED"),
  estimatedCompletionDate: z
    .string()
    .datetime()
    .or(z.string().length(0))
    .nullable()
    .optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
});
export type CaseCreateInput = z.infer<typeof caseCreateSchema>;

export const caseUpdateSchema = caseCreateSchema.partial();
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
});
export type ImageAttachInput = z.infer<typeof imageAttachSchema>;
