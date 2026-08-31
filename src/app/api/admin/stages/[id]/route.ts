import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { getClientIp } from "@/lib/ratelimit";
import { resolveActingAdmin } from "@/lib/admin-accounts";
import { auditNoticeActions } from "@/lib/notification-audit";
import { prisma } from "@/lib/prisma";
import { caseStageUpdateSchema } from "@/lib/validations";
import { stageInUseBreakdown } from "@/lib/case-groups-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH /api/admin/stages/[id] — rename (labelEn/labelAr), reorder, and/or set
 * the overdue notification threshold. The stageKey is immutable (live case data
 * resolves against it) and never changes.
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
      select: {
        id: true,
        stageKey: true,
        labelEn: true,
        labelAr: true,
        order: true,
        overdueAfterMinutes: true,
      },
    });

    // Audited because it changes when every case in this stage starts alerting
    // — a silent edit here would make a later "why did nobody get warned?"
    // unanswerable. Compared against the stored value so a no-op save (the
    // inline editor sends every field) writes nothing.
    if (
      input.overdueAfterMinutes !== undefined &&
      input.overdueAfterMinutes !== existing.overdueAfterMinutes
    ) {
      const session = await auth();
      const actingAdmin = await resolveActingAdmin(session?.user?.id);
      await auditNoticeActions([
        {
          action: "STAGE_OVERDUE_DURATION_UPDATED",
          // No case: this is workflow configuration, not a case event. The
          // stage is identified by its key in to_stage_id.
          stageKey: updated.stageKey,
          adminEmail: actingAdmin?.email ?? session?.user?.email ?? null,
          adminName: actingAdmin?.displayName ?? null,
          ip: getClientIp(req.headers),
        },
      ]);
    }

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
