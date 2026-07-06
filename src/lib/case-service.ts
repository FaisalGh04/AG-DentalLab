import { Prisma, type CaseStatus, type CaseCategory } from "@prisma/client";
import { prisma } from "./prisma";
import { cached, invalidate } from "./redis";
import { formatTrackingId } from "@/lib/tracking-id-format";
import type {
  PublicCaseDTO,
  AdminCaseListResponse,
  AdminCaseListItem,
  AdminCaseDTO,
} from "@/types/case";

const PUBLIC_CACHE_TTL = 30; // seconds

function trackingCacheKey(trackingId: string) {
  return `track:${trackingId}`;
}

/**
 * PUBLIC search by tracking ID. Returns a sanitized DTO with no internal ids.
 * Cached briefly in Redis.
 */
export async function searchByTrackingId(
  rawTrackingId: string,
): Promise<PublicCaseDTO | null> {
  const trackingId = formatTrackingId(rawTrackingId);

  return cached(trackingCacheKey(trackingId), PUBLIC_CACHE_TTL, async () => {
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
      patientName: `${found.patientFirstName} ${found.patientLastName}`,
      doctorName: found.doctorName,
      caseType: found.caseType,
      category: found.category,
      currentStatus: found.currentStatus,
      estimatedCompletionDate:
        found.estimatedCompletionDate?.toISOString() ?? null,
      notes: found.notes,
      progress: found.progress.map((p) => ({
        id: p.id,
        stepTitle: p.stepTitle,
        description: p.description,
        completed: p.completed,
        order: p.order,
        createdAt: p.createdAt.toISOString(),
      })),
      images: found.images.map((i) => ({
        id: i.id,
        imageUrl: i.imageUrl,
        caption: i.caption,
        stage: i.stage,
        createdAt: i.createdAt.toISOString(),
      })),
    };
    return dto;
  });
}

/** Invalidate the public tracking cache for a given tracking ID. */
export async function invalidateTrackingCache(trackingId: string) {
  await invalidate(trackingCacheKey(trackingId));
}

// ------------------------------------------------------------------
// ADMIN queries
// ------------------------------------------------------------------

export interface AdminListParams {
  q?: string;
  status?: CaseStatus;
  category?: CaseCategory;
  page?: number;
  pageSize?: number;
  archived?: boolean; // completed archive
}

export async function listCases(
  params: AdminListParams,
): Promise<AdminCaseListResponse> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));

  const where: Prisma.PatientCaseWhereInput = {};
  if (params.status) where.currentStatus = params.status;
  if (params.category) where.category = params.category;
  if (params.archived) where.currentStatus = "COMPLETED";
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
      select: {
        id: true,
        trackingId: true,
        patientFirstName: true,
        patientLastName: true,
        doctorName: true,
        caseType: true,
        category: true,
        currentStatus: true,
        estimatedCompletionDate: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { progress: true, images: true } },
      },
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
    currentStatus: c.currentStatus,
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
      createdAt: p.createdAt.toISOString(),
    })),
    images: c.images.map((i) => ({
      id: i.id,
      imageUrl: i.imageUrl,
      caption: i.caption,
      stage: i.stage,
      createdAt: i.createdAt.toISOString(),
    })),
  };
}

export async function getDashboardStats() {
  // One grouped query instead of five separate COUNTs.
  const grouped = await prisma.patientCase.groupBy({
    by: ["currentStatus"],
    _count: { _all: true },
  });
  const countOf = (s: CaseStatus) =>
    grouped.find((g) => g.currentStatus === s)?._count._all ?? 0;
  const received = countOf("RECEIVED");
  const inProgress = countOf("IN_PROGRESS");
  const production = countOf("PRODUCTION");
  const completed = countOf("COMPLETED");
  const total = received + inProgress + production + completed;
  return { total, received, inProgress, production, completed };
}

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
    select: {
      id: true,
      trackingId: true,
      patientFirstName: true,
      patientLastName: true,
      doctorName: true,
      caseType: true,
      category: true,
      currentStatus: true,
      estimatedCompletionDate: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { progress: true, images: true } },
    },
  });
  return items.map((c) => ({
    ...c,
    estimatedCompletionDate: c.estimatedCompletionDate?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));
}
