import type { NextRequest } from "next/server";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { getCaseById, invalidateSearchCache } from "@/lib/case-service";
import { prisma } from "@/lib/prisma";
import { caseUpdateSchema } from "@/lib/validations";
import { normalizeName } from "@/lib/utils";
import { deleteObject } from "@/lib/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const { id } = await params;
    const found = await getCaseById(id);
    if (!found) return apiError("Case not found", 404);
    return apiOk(found);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const { id } = await params;
    const existing = await prisma.patientCase.findUnique({ where: { id } });
    if (!existing) return apiError("Case not found", 404);

    const input = caseUpdateSchema.parse(await req.json());

    const firstName = input.patientFirstName ?? existing.patientFirstName;
    const lastName = input.patientLastName ?? existing.patientLastName;
    const norm = normalizeName(firstName, lastName);

    const updated = await prisma.patientCase.update({
      where: { id },
      data: {
        patientFirstName: firstName,
        patientLastName: lastName,
        patientFullNameNorm: norm,
        doctorName: input.doctorName ?? existing.doctorName,
        caseType: input.caseType ?? existing.caseType,
        category: input.category ?? existing.category,
        currentStatus: input.currentStatus ?? existing.currentStatus,
        estimatedCompletionDate:
          input.estimatedCompletionDate !== undefined
            ? input.estimatedCompletionDate
              ? new Date(input.estimatedCompletionDate)
              : null
            : existing.estimatedCompletionDate,
        notes: input.notes !== undefined ? input.notes : existing.notes,
      },
    });

    // Bust cache for both old and new normalized names.
    await invalidateSearchCache(existing.patientFullNameNorm);
    await invalidateSearchCache(norm);

    return apiOk({ id: updated.id });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const { id } = await params;
    const existing = await prisma.patientCase.findUnique({
      where: { id },
      include: { images: true },
    });
    if (!existing) return apiError("Case not found", 404);

    // Best-effort remove stored objects before deleting the row.
    await Promise.allSettled(
      existing.images
        .filter((i) => i.key)
        .map((i) => deleteObject(i.key as string)),
    );

    await prisma.patientCase.delete({ where: { id } });
    await invalidateSearchCache(existing.patientFullNameNorm);

    return apiOk({ id });
  } catch (err) {
    return handleApiError(err);
  }
}
