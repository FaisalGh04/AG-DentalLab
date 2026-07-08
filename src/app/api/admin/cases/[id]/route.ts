import type { NextRequest } from "next/server";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { revalidateTag } from "next/cache";
import { getCaseById } from "@/lib/case-service";
import { prisma } from "@/lib/prisma";
import { caseUpdateSchema } from "@/lib/validations";
import { normalizeName } from "@/lib/utils";
import { deleteObject } from "@/lib/s3";
import { firstStageId, normalizeLifecycle } from "@/lib/production-templates";

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

    // Resolve the lifecycle selection. Switching collection resets the current
    // stage (to the new collection's first) and hidden list unless the client
    // sent explicit values. Everything is validated + isCompleted re-derived.
    const collectionId =
      input.collectionId !== undefined ? input.collectionId : existing.collectionId;
    const collectionChanged =
      input.collectionId !== undefined &&
      input.collectionId !== existing.collectionId;
    const currentStageId =
      input.currentStageId !== undefined
        ? input.currentStageId
        : collectionChanged
          ? firstStageId(collectionId)
          : existing.currentStageId;
    const hiddenStageIds =
      input.hiddenStageIds !== undefined
        ? input.hiddenStageIds
        : collectionChanged
          ? []
          : existing.hiddenStageIds;
    const life = normalizeLifecycle(collectionId, currentStageId, hiddenStageIds);

    const updated = await prisma.patientCase.update({
      where: { id },
      data: {
        patientFirstName: firstName,
        patientLastName: lastName,
        patientFullNameNorm: norm,
        doctorName: input.doctorName ?? existing.doctorName,
        caseType: input.caseType ?? existing.caseType,
        category: input.category ?? existing.category,
        collectionId: life.collectionId,
        currentStageId: life.currentStageId,
        hiddenStageIds: life.hiddenStageIds,
        isCompleted: life.isCompleted,
        estimatedCompletionDate:
          input.estimatedCompletionDate !== undefined
            ? input.estimatedCompletionDate
              ? new Date(input.estimatedCompletionDate)
              : null
            : existing.estimatedCompletionDate,
        notes: input.notes !== undefined ? input.notes : existing.notes,
      },
    });

    // Status may have changed → refresh the cached dashboard counts.
    revalidateTag("cases");

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
    revalidateTag("cases");

    return apiOk({ id });
  } catch (err) {
    return handleApiError(err);
  }
}
