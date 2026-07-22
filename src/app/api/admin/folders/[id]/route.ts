import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { folderUpdateSchema } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/admin/folders/[id] — rename (labelEn/labelAr) and/or reorder. */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const { id } = await params;
    const existing = await prisma.portfolioFolder.findUnique({ where: { id } });
    if (!existing) return apiError("Folder not found", 404);

    const input = folderUpdateSchema.parse(await req.json());

    const updated = await prisma.portfolioFolder.update({
      where: { id },
      data: input,
      select: { id: true, labelEn: true, labelAr: true, order: true },
    });

    return apiOk(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * DELETE /api/admin/folders/[id] — remove an empty folder. Blocked (409) if it
 * still has items: the FK is ON DELETE RESTRICT, so Postgres raises P2003 and the
 * admin is told to move/delete the folder's items first.
 */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const { id } = await params;
    const existing = await prisma.portfolioFolder.findUnique({ where: { id } });
    if (!existing) return apiError("Folder not found", 404);

    try {
      await prisma.portfolioFolder.delete({ where: { id } });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2003"
      ) {
        return apiError(
          "This folder still has cases. Move or delete them before deleting the folder.",
          409,
        );
      }
      throw err;
    }

    return apiOk({ id });
  } catch (err) {
    return handleApiError(err);
  }
}
