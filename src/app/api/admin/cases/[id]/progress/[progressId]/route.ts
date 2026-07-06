import type { NextRequest } from "next/server";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { progressUpdateSchema } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; progressId: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const { id: caseId, progressId } = await params;
    const step = await prisma.caseProgress.findFirst({
      where: { id: progressId, caseId },
    });
    if (!step) return apiError("Step not found", 404);

    const input = progressUpdateSchema.parse(await req.json());
    await prisma.caseProgress.update({
      where: { id: progressId },
      data: {
        stepTitle: input.stepTitle ?? step.stepTitle,
        description:
          input.description !== undefined ? input.description : step.description,
        completed: input.completed ?? step.completed,
        order: input.order ?? step.order,
      },
    });

    return apiOk({ id: progressId });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const { id: caseId, progressId } = await params;
    const step = await prisma.caseProgress.findFirst({
      where: { id: progressId, caseId },
    });
    if (!step) return apiError("Step not found", 404);

    await prisma.caseProgress.delete({ where: { id: progressId } });
    return apiOk({ id: progressId });
  } catch (err) {
    return handleApiError(err);
  }
}
