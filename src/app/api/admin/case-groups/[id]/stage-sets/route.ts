import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { stageSetCreateSchema } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/case-groups/[id]/stage-sets — add a Regular or Digital workflow
 * to a group. Blocked (409) if the group already has that type (@@unique group+type).
 * Admin-created sets get a fresh id (legacy sets keep their collection kebab id).
 */
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const { id: groupId } = await params;
    const group = await prisma.caseGroup.findUnique({ where: { id: groupId } });
    if (!group) return apiError("Group not found", 404);

    const input = stageSetCreateSchema.parse(await req.json());

    const order = await prisma.caseStageSet.count({ where: { groupId } });
    try {
      const created = await prisma.caseStageSet.create({
        data: {
          id: randomUUID(),
          groupId,
          type: input.type,
          labelEn: input.labelEn,
          labelAr: input.labelAr,
          order,
        },
        select: { id: true, type: true, labelEn: true, labelAr: true, order: true },
      });
      revalidatePath("/track");
      return apiOk(created, 201);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return apiError(
          `This group already has a ${input.type} workflow.`,
          409,
        );
      }
      throw err;
    }
  } catch (err) {
    return handleApiError(err);
  }
}
