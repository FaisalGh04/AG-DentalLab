import { unstable_cache } from "next/cache";
import { Prisma, type CaseCategory } from "@prisma/client";
import { prisma } from "./prisma";
import { formatTrackingId } from "@/lib/tracking-id-format";
import { redactName } from "@/lib/utils";
import type {
  PublicCaseDTO,
  AdminCaseListResponse,
  AdminCaseListItem,
  AdminCaseDTO,
} from "@/types/case";

/**
 * PUBLIC search by tracking ID. Returns a sanitized DTO with no internal ids.
 * Intentionally NOT cached — patients must always see live, accurate status.
 */
export async function searchByTrackingId(
  rawTrackingId: string,
): Promise<PublicCaseDTO | null> {
  const trackingId = formatTrackingId(rawTrackingId);

  const found = await prisma.patientCase.findUnique({
    where: { trackingId },
    include: {
      progress: { orderBy: { order: "asc" } },
      images: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!found) return null;

  const dto: PublicCaseDTO = {
    trackingId: found.trackingId,
    // Redacted to "First L." server-side (S-M2): the full surname must never
    // leave the server for an unauthenticated tracking-ID lookup.
    patientName: redactName(found.patientFirstName, found.patientLastName),
    doctorName: found.doctorName,
    caseType: found.caseType,
    category: found.category,
    collectionId: found.collectionId,
    currentStageId: found.currentStageId,
    hiddenStageIds: found.hiddenStageIds,
    isCompleted: found.isCompleted,
    estimatedCompletionDate:
      found.estimatedCompletionDate?.toISOString() ?? null,
    // Internal lab `notes` (shade/special instructions) are intentionally NOT
    // exposed on the public tracker (S-M2).
    progress: found.progress.map((p) => ({
      id: p.id,
      stepTitle: p.stepTitle,
      description: p.description,
      completed: p.completed,
      order: p.order,
      stageId: p.stageId,
      createdAt: p.createdAt.toISOString(),
    })),
    images: found.images.map((i) => ({
      id: i.id,
      imageUrl: i.imageUrl,
      caption: i.caption,
      stageId: i.stageId,
      createdAt: i.createdAt.toISOString(),
    })),
  };
  return dto;
}

// ------------------------------------------------------------------
// ADMIN queries
// ------------------------------------------------------------------

export interface AdminListParams {
  q?: string;
  category?: CaseCategory;
  page?: number;
  pageSize?: number;
  archived?: boolean; // completed archive
}

// Columns selected for admin list rows (list + recent share this shape).
const ADMIN_LIST_SELECT = {
  id: true,
  trackingId: true,
  patientFirstName: true,
  patientLastName: true,
  doctorName: true,
  caseType: true,
  category: true,
  collectionId: true,
  currentStageId: true,
  hiddenStageIds: true,
  isCompleted: true,
  estimatedCompletionDate: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { progress: true, images: true } },
} satisfies Prisma.PatientCaseSelect;

export async function listCases(
  params: AdminListParams,
): Promise<AdminCaseListResponse> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));

  const where: Prisma.PatientCaseWhereInput = {};
  if (params.category) where.category = params.category;

  // Completed cases live ONLY in the Archive; "All Cases" never shows them.
  where.isCompleted = params.archived === true;

  if (params.q) {
    const q = params.q.trim();
    where.OR = [
      { patientFullNameNorm: { contains: q.toLowerCase() } },
      { trackingId: { contains: q.toUpperCase() } },
      { doctorName: { contains: q, mode: "insensitive" } },
      { caseType: { contains: q, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.patientCase.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: ADMIN_LIST_SELECT,
    }),
    prisma.patientCase.count({ where }),
  ]);

  return {
    items: items.map((c) => ({
      ...c,
      estimatedCompletionDate: c.estimatedCompletionDate?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getCaseById(id: string): Promise<AdminCaseDTO | null> {
  const c = await prisma.patientCase.findUnique({
    where: { id },
    include: {
      progress: { orderBy: { order: "asc" } },
      images: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!c) return null;

  return {
    id: c.id,
    trackingId: c.trackingId,
    patientFirstName: c.patientFirstName,
    patientLastName: c.patientLastName,
    doctorName: c.doctorName,
    caseType: c.caseType,
    category: c.category,
    collectionId: c.collectionId,
    currentStageId: c.currentStageId,
    hiddenStageIds: c.hiddenStageIds,
    isCompleted: c.isCompleted,
    estimatedCompletionDate: c.estimatedCompletionDate?.toISOString() ?? null,
    notes: c.notes,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    progress: c.progress.map((p) => ({
      id: p.id,
      stepTitle: p.stepTitle,
      description: p.description,
      completed: p.completed,
      order: p.order,
      stageId: p.stageId,
      createdAt: p.createdAt.toISOString(),
    })),
    images: c.images.map((i) => ({
      id: i.id,
      imageUrl: i.imageUrl,
      caption: i.caption,
      stageId: i.stageId,
      createdAt: i.createdAt.toISOString(),
    })),
  };
}

async function computeDashboardStats() {
  // Buckets for the dynamic collection/stage model:
  //  - completed:   isCompleted = true
  //  - unassigned:  no collection chosen yet
  //  - active:      everything else (in a collection, not yet completed)
  const [total, completed, unassigned] = await Promise.all([
    prisma.patientCase.count(),
    prisma.patientCase.count({ where: { isCompleted: true } }),
    prisma.patientCase.count({ where: { collectionId: null } }),
  ]);
  const active = total - completed - unassigned;
  return { total, active, completed, unassigned };
}

/**
 * Dashboard count badges. Cached ~30s in Next's Data Cache and tagged "cases"
 * so it's revalidated immediately whenever a case is created/updated/deleted
 * (see the case API routes). Global counts tolerate brief cross-session
 * staleness; the admin's own actions reflect instantly via revalidateTag.
 */
export const getDashboardStats = unstable_cache(
  computeDashboardStats,
  ["dashboard-stats"],
  { revalidate: 30, tags: ["cases"] },
);

/**
 * Most-recently-updated cases for the dashboard. Unlike listCases this skips
 * the total COUNT (the dashboard never paginates), saving one round-trip.
 */
export async function listRecentCases(
  limit = 6,
): Promise<AdminCaseListItem[]> {
  const items = await prisma.patientCase.findMany({
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: ADMIN_LIST_SELECT,
  });
  return items.map((c) => ({
    ...c,
    estimatedCompletionDate: c.estimatedCompletionDate?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));
}
