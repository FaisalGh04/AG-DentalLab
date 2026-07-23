import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { stageSetUpdateSchema } from "@/lib/validations";
import { stageSetCaseCount } from "@/lib/case-groups-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/admin/stage-sets/[id] — rename the workflow's labels. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const { id } = await params;
    const existing = await prisma.caseStageSet.findUnique({ where: { id } });
    if (!existing) return apiError("Workflow not found", 404);

    const input = stageSetUpdateSchema.parse(await req.json());
    const updated = await prisma.caseStageSet.update({
      where: { id },
      data: input,
      select: { id: true, type: true, labelEn: true, labelAr: true, order: true },
    });
    revalidatePath("/track");
    return apiOk(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * DELETE /api/admin/stage-sets/[id] — delete a workflow. Blocked (409) when it
 * still has stages, or when any live case is on it (collectionId == this set).
 */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const { id } = await params;
    const existing = await prisma.caseStageSet.findUnique({ where: { id } });
    if (!existing) return apiError("Workflow not found", 404);

    const [stageCount, caseCount] = await Promise.all([
      prisma.caseStage.count({ where: { stageSetId: id } }),
      stageSetCaseCount(id),
    ]);

    if (stageCount > 0 || caseCount > 0) {
      const parts: string[] = [];
      if (caseCount > 0) parts.push(`${caseCount} case(s) are on it`);
      if (stageCount > 0) parts.push(`it has ${stageCount} stage(s)`);
      return apiError(
        `Can't delete this workflow — ${parts.join(" and ")}. Move those cases and delete the stages first.`,
        409,
        { stageCount, caseCount },
      );
    }

    await prisma.caseStageSet.delete({ where: { id } });
    revalidatePath("/track");
    return apiOk({ id });
  } catch (err) {
    return handleApiError(err);
  }
}
