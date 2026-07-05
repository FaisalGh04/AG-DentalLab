import type { CaseStatus, CaseCategory } from "@prisma/client";

/** Progress step as returned to any client. */
export interface ProgressDTO {
  id: string;
  stepTitle: string;
  description: string | null;
  completed: boolean;
  order: number;
  createdAt: string;
}

/** Image as returned to any client. */
export interface ImageDTO {
  id: string;
  imageUrl: string;
  caption: string | null;
  createdAt: string;
}

/**
 * PUBLIC tracking result. Deliberately omits the internal DB id and any
 * data doctors shouldn't see beyond what they need to track a case.
 */
export interface PublicCaseDTO {
  trackingId: string;
  patientName: string;
  doctorName: string;
  caseType: string;
  category: CaseCategory;
  currentStatus: CaseStatus;
  estimatedCompletionDate: string | null;
  notes: string | null;
  progress: ProgressDTO[];
}

/** ADMIN case (full detail, includes id). */
export interface AdminCaseDTO {
  id: string;
  trackingId: string;
  patientFirstName: string;
  patientLastName: string;
  doctorName: string;
  caseType: string;
  category: CaseCategory;
  currentStatus: CaseStatus;
  estimatedCompletionDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  progress: ProgressDTO[];
  images: ImageDTO[];
  _count?: { progress: number; images: number };
}

export interface AdminCaseListItem {
  id: string;
  trackingId: string;
  patientFirstName: string;
  patientLastName: string;
  doctorName: string;
  caseType: string;
  category: CaseCategory;
  currentStatus: CaseStatus;
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
