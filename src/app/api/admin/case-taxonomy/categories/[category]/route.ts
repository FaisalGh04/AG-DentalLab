import type { NextRequest } from "next/server";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { caseCategoryConfigUpdateSchema } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ category: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const category = (await params).category;
    const existing = await prisma.caseCategoryConfig.findUnique({ where: { category } });
    if (!existing) return apiError("Category not found", 404);

    const input = caseCategoryConfigUpdateSchema.parse(await req.json());
    const updated = await prisma.caseCategoryConfig.update({
      where: { category },
      data: input,
    });
    return apiOk(updated);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const category = (await params).category;
    const existing = await prisma.caseCategoryConfig.findUnique({
      where: { category },
      include: { _count: { select: { caseTypes: true } } },
    });
    if (!existing) return apiError("Category not found", 404);

    const caseCount = await prisma.patientCase.count({ where: { category } });
    if (caseCount > 0) {
      return apiError(`This category is used by ${caseCount} case(s).`, 409);
    }
    if (existing._count.caseTypes > 0) {
      return apiError("Delete its case types before deleting this category.", 409);
    }

    await prisma.caseCategoryConfig.delete({ where: { category } });
    return apiOk({ category });
  } catch (err) {
    return handleApiError(err);
  }
}
