import type { NextRequest } from "next/server";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { progressCreateSchema } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/admin/cases/:id/progress — add a production step. */
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const { id: caseId } = await params;
    const kase = await prisma.patientCase.findUnique({ where: { id: caseId } });
    if (!kase) return apiError("Case not found", 404);

    const input = progressCreateSchema.parse(await req.json());

    // Default order = append to end.
    let order = input.order;
    if (order === undefined) {
      const last = await prisma.caseProgress.findFirst({
        where: { caseId },
        orderBy: { order: "desc" },
        select: { order: true },
      });
      order = (last?.order ?? 0) + 1;
    }

    // Tag with the requested stage, or the case's current stage by default
    // (null when no collection/stage is chosen yet → shown as "General").
    const stageId =
      input.stageId !== undefined ? input.stageId : kase.currentStageId;

    const step = await prisma.caseProgress.create({
      data: {
        caseId,
        stepTitle: input.stepTitle,
        description: input.description ?? null,
        completed: input.completed,
        order,
        stageId,
      },
    });

    return apiOk({ id: step.id }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
