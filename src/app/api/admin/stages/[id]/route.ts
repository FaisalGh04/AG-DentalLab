import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { caseStageUpdateSchema } from "@/lib/validations";
import { stageInUseBreakdown } from "@/lib/case-groups-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH /api/admin/stages/[id] — rename (labelEn/labelAr) and/or reorder. The
 * stageKey is immutable (live case data resolves against it) and never changes.
 */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const { id } = await params;
    const existing = await prisma.caseStage.findUnique({ where: { id } });
    if (!existing) return apiError("Stage not found", 404);

    const input = caseStageUpdateSchema.parse(await req.json());
    const updated = await prisma.caseStage.update({
      where: { id },
      data: input,
      select: { id: true, stageKey: true, labelEn: true, labelAr: true, order: true },
    });
    revalidatePath("/track");
    return apiOk(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * DELETE /api/admin/stages/[id] — delete a stage. BLOCKED (409) when any live case
 * references it (current stage, hidden, logged progress, or a tagged photo) —
 * checked by (stageSetId, stageKey). Its quick-add chips cascade away with it.
 */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const { id } = await params;
    const stage = await prisma.caseStage.findUnique({ where: { id } });
    if (!stage) return apiError("Stage not found", 404);

    const b = await stageInUseBreakdown(stage.stageSetId, stage.stageKey);
    if (b.total > 0) {
      const parts: string[] = [];
      if (b.current) parts.push(`the current stage of ${b.current} case(s)`);
      if (b.hidden) parts.push(`hidden on ${b.hidden} case(s)`);
      if (b.progress) parts.push(`referenced by ${b.progress} logged step(s)`);
      if (b.images) parts.push(`tagged on ${b.images} photo(s)`);
      return apiError(
        `Can't delete "${stage.labelEn}" — it's ${parts.join(", ")}. Advance or reassign those cases first.`,
        409,
        b,
      );
    }

    await prisma.caseStage.delete({ where: { id } });
    revalidatePath("/track");
    return apiOk({ id });
  } catch (err) {
    return handleApiError(err);
  }
}
