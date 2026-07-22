import type { NextRequest } from "next/server";
import { apiOk, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { folderCreateSchema } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/folders — the DB-backed folder list, in display order. Used by
 * the item form's folder dropdown, the admin list's group/filter, and the
 * Manage-Folders dialog.
 */
export async function GET(req: NextRequest) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const folders = await prisma.portfolioFolder.findMany({
      orderBy: { order: "asc" },
      select: { id: true, labelEn: true, labelAr: true, order: true },
    });

    return apiOk({ folders });
  } catch (err) {
    return handleApiError(err);
  }
}

/** POST /api/admin/folders — create a folder, appended to the end of the order. */
export async function POST(req: NextRequest) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const input = folderCreateSchema.parse(await req.json());

    // Append: one past the current max order (handles gaps left by deletes).
    const last = await prisma.portfolioFolder.findFirst({
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const order = last ? last.order + 1 : 0;

    const created = await prisma.portfolioFolder.create({
      data: { labelEn: input.labelEn, labelAr: input.labelAr, order },
      select: { id: true, labelEn: true, labelAr: true, order: true },
    });

    return apiOk(created, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
