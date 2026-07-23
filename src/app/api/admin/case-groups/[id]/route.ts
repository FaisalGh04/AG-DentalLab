import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { caseGroupUpdateSchema } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/admin/case-groups/[id] — rename (labelEn/labelAr) and/or reorder. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const { id } = await params;
    const existing = await prisma.caseGroup.findUnique({ where: { id } });
    if (!existing) return apiError("Group not found", 404);

    const input = caseGroupUpdateSchema.parse(await req.json());
    const updated = await prisma.caseGroup.update({ where: { id }, data: input });
    revalidatePath("/track");
    return apiOk(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * DELETE /api/admin/case-groups/[id] — delete an empty group. Blocked (409) when it
 * still has stage-sets: the FK is ON DELETE RESTRICT, so Postgres raises P2003.
 */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const { id } = await params;
    const existing = await prisma.caseGroup.findUnique({ where: { id } });
    if (!existing) return apiError("Group not found", 404);

    try {
      await prisma.caseGroup.delete({ where: { id } });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2003"
      ) {
        return apiError(
          "This group still has a Regular/Digital workflow. Delete its stage-sets first.",
          409,
        );
      }
      throw err;
    }

    revalidatePath("/track");
    return apiOk({ id });
  } catch (err) {
    return handleApiError(err);
  }
}
