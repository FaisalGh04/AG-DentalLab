import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { quickAddStepUpdateSchema } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH /api/admin/quick-add-steps/:id — rename a chip (labelEn/labelAr) and/or
 * reorder it. Affects the shared suggestion list for the (collection, stage);
 * does NOT touch CaseProgress rows already logged with the old label.
 */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const { id } = await params;
    const existing = await prisma.stageQuickAddStep.findUnique({ where: { id } });
    if (!existing) return apiError("Quick-add step not found", 404);

    const input = quickAddStepUpdateSchema.parse(await req.json());

    try {
      const updated = await prisma.stageQuickAddStep.update({
        where: { id },
        data: {
          labelEn: input.labelEn ?? existing.labelEn,
          labelAr: input.labelAr ?? existing.labelAr,
          order: input.order ?? existing.order,
        },
      });
      return apiOk(updated);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return apiError(
          "Another chip in this stage already uses that English label",
          409,
        );
      }
      throw e;
    }
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * DELETE /api/admin/quick-add-steps/:id — remove a chip from the suggestion list.
 * Historical CaseProgress steps that used this chip's label are left untouched.
 */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const { id } = await params;
    const existing = await prisma.stageQuickAddStep.findUnique({ where: { id } });
    if (!existing) return apiError("Quick-add step not found", 404);

    await prisma.stageQuickAddStep.delete({ where: { id } });
    return apiOk({ id });
  } catch (err) {
    return handleApiError(err);
  }
}
