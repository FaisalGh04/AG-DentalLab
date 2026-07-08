import type { CaseCategory } from "@prisma/client";

/** Progress step as returned to any client. */
export interface ProgressDTO {
  id: string;
  stepTitle: string;
  description: string | null;
  completed: boolean;
  order: number;
  /** Stage id (from the case's collection) this step documents; null = General. */
  stageId: string | null;
  createdAt: string;
}

/** A DB-backed, editable Quick-Add step chip, scoped to a (collection, stage). */
export interface QuickAddStepDTO {
  id: string;
  stageId: string;
  labelEn: string;
  labelAr: string;
  order: number;
}

/** Image as returned to any client. */
export interface ImageDTO {
  id: string;
  imageUrl: string;
  caption: string | null;
  /** Stage id (from the case's collection) this image documents; null = General. */
  stageId: string | null;
  createdAt: string;
}

/** The production-template fields shared by public + admin case DTOs. */
export interface CaseLifecycleFields {
  collectionId: string | null;
  currentStageId: string | null;
  hiddenStageIds: string[];
  isCompleted: boolean;
}

/**
 * PUBLIC tracking result. Deliberately omits the internal DB id and any
 * data doctors shouldn't see beyond what they need to track a case.
 */
export interface PublicCaseDTO extends CaseLifecycleFields {
  trackingId: string;
  patientName: string;
  doctorName: string;
  caseType: string;
  category: CaseCategory;
  estimatedCompletionDate: string | null;
  notes: string | null;
  progress: ProgressDTO[];
  images: ImageDTO[];
}

/** ADMIN case (full detail, includes id). */
export interface AdminCaseDTO extends CaseLifecycleFields {
  id: string;
  trackingId: string;
  patientFirstName: string;
  patientLastName: string;
  doctorName: string;
  caseType: string;
  category: CaseCategory;
  estimatedCompletionDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  progress: ProgressDTO[];
  images: ImageDTO[];
  _count?: { progress: number; images: number };
}

export interface AdminCaseListItem extends CaseLifecycleFields {
  id: string;
  trackingId: string;
  patientFirstName: string;
  patientLastName: string;
  doctorName: string;
  caseType: string;
  category: CaseCategory;
  estimatedCompletionDate: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { progress: number; images: number };
}

export interface AdminCaseListResponse {
  items: AdminCaseListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
