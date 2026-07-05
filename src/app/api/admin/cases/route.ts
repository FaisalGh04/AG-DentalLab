import type { NextRequest } from "next/server";
import { apiOk, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { listCases } from "@/lib/case-service";
import { prisma } from "@/lib/prisma";
import { caseCreateSchema } from "@/lib/validations";
import { normalizeName } from "@/lib/utils";
import { generateUniqueTrackingId } from "@/lib/tracking-id";
import type { CaseStatus, CaseCategory } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/cases — list + filter + paginate. */
export async function GET(req: NextRequest) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const sp = req.nextUrl.searchParams;
    const data = await listCases({
      q: sp.get("q") ?? undefined,
      status: (sp.get("status") as CaseStatus) || undefined,
      category: (sp.get("category") as CaseCategory) || undefined,
      archived: sp.get("archived") === "true",
      page: sp.get("page") ? Number(sp.get("page")) : 1,
      pageSize: sp.get("pageSize") ? Number(sp.get("pageSize")) : 20,
    });
    return apiOk(data);
  } catch (err) {
    return handleApiError(err);
  }
}

/** POST /api/admin/cases — create a case. */
export async function POST(req: NextRequest) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const body = await req.json();
    const input = caseCreateSchema.parse(body);

    const norm = normalizeName(input.patientFirstName, input.patientLastName);
    const trackingId = await generateUniqueTrackingId();
    const created = await prisma.patientCase.create({
      data: {
        trackingId,
        patientFirstName: input.patientFirstName,
        patientLastName: input.patientLastName,
        patientFullNameNorm: norm,
        doctorName: input.doctorName,
        caseType: input.caseType,
        category: input.category,
        currentStatus: input.currentStatus,
        estimatedCompletionDate: input.estimatedCompletionDate
          ? new Date(input.estimatedCompletionDate)
          : null,
        notes: input.notes ?? null,
      },
    });

    return apiOk({ id: created.id, trackingId: created.trackingId }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
