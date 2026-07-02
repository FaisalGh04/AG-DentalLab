import { Prisma, type CaseStatus, type CaseCategory } from "@prisma/client";
import { prisma } from "./prisma";
import { cached, invalidate } from "./redis";
import { normalizeQuery } from "./utils";
import type {
  PublicCaseDTO,
  AdminCaseListResponse,
  AdminCaseDTO,
} from "@/types/case";

const PUBLIC_CACHE_TTL = 30; // seconds

function searchCacheKey(norm: string) {
  return `search:${norm}`;
}

/**
 * PUBLIC search by patient full name. Case-insensitive, indexed lookup.
 * Returns a sanitized DTO (no internal ids). Cached briefly in Redis.
 */
export async function searchByPatientName(
  rawQuery: string,
): Promise<PublicCaseDTO | null> {
  const norm = normalizeQuery(rawQuery);
  if (norm.length < 2) return null;

  return cached(searchCacheKey(norm), PUBLIC_CACHE_TTL, async () => {
    // Exact normalized match first (uses the index), then a safe prefix.
    const found =
      (await prisma.patientCase.findFirst({
        where: { patientFullNameNorm: norm },
        orderBy: { createdAt: "desc" },
        include: { progress: { orderBy: { order: "asc" } } },
      })) ??
      (await prisma.patientCase.findFirst({
        where: { patientFullNameNorm: { startsWith: norm } },
        orderBy: { createdAt: "desc" },
        include: { progress: { orderBy: { order: "asc" } } },
      }));

    if (!found) return null;

    const dto: PublicCaseDTO = {
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
    };
    return dto;
  });
}

/** Invalidate the public search cache for a given full name. */
export async function invalidateSearchCache(fullNameNorm: string) {
  await invalidate(searchCacheKey(fullNameNorm));
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
      createdAt: i.createdAt.toISOString(),
    })),
  };
}

export async function getDashboardStats() {
  const [total, received, inProgress, production, completed] =
    await Promise.all([
      prisma.patientCase.count(),
      prisma.patientCase.count({ where: { currentStatus: "RECEIVED" } }),
      prisma.patientCase.count({ where: { currentStatus: "IN_PROGRESS" } }),
      prisma.patientCase.count({ where: { currentStatus: "PRODUCTION" } }),
      prisma.patientCase.count({ where: { currentStatus: "COMPLETED" } }),
    ]);
  return { total, received, inProgress, production, completed };
}
