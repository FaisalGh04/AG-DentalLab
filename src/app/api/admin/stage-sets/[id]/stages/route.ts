import type { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { caseStageCreateSchema } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/stage-sets/[id]/stages — add a stage to a workflow, appended to
 * the end. stageKey is a fresh, immutable id (never edited) that live case data
 * will resolve against once cases start using this stage.
 */
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const { id: stageSetId } = await params;
    const set = await prisma.caseStageSet.findUnique({ where: { id: stageSetId } });
    if (!set) return apiError("Workflow not found", 404);

    const input = caseStageCreateSchema.parse(await req.json());

    const order = await prisma.caseStage.count({ where: { stageSetId } });
    const created = await prisma.caseStage.create({
      data: {
        stageSetId,
        stageKey: `st-${randomUUID()}`,
        labelEn: input.labelEn,
        labelAr: input.labelAr,
        order,
      },
      select: { id: true, stageKey: true, labelEn: true, labelAr: true, order: true },
    });
    revalidatePath("/track");
    return apiOk(created, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
