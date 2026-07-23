import type { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { apiOk, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { caseGroupCreateSchema } from "@/lib/validations";
import { buildCaseGroupTree } from "@/lib/case-groups-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/case-groups — full group → stage-set → stage tree + usage. */
export async function GET(req: NextRequest) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;
    return apiOk(await buildCaseGroupTree());
  } catch (err) {
    return handleApiError(err);
  }
}

/** POST /api/admin/case-groups — create a group, appended to the end. */
export async function POST(req: NextRequest) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const input = caseGroupCreateSchema.parse(await req.json());
    const last = await prisma.caseGroup.findFirst({
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const created = await prisma.caseGroup.create({
      data: {
        labelEn: input.labelEn,
        labelAr: input.labelAr,
        order: last ? last.order + 1 : 0,
      },
    });
    revalidatePath("/track");
    return apiOk(created, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
