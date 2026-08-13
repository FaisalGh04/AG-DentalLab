import type { NextRequest } from "next/server";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { CaseCategoryEnum, caseTypeCreateSchema } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ category: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const parsedCategory = CaseCategoryEnum.safeParse((await params).category);
    if (!parsedCategory.success) return apiError("Category not found", 404);

    const input = caseTypeCreateSchema.parse(await req.json());
    const last = await prisma.caseTypeOption.findFirst({
      where: { category: parsedCategory.data },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const created = await prisma.caseTypeOption.create({
      data: {
        category: parsedCategory.data,
        name: input.name,
        order: last ? last.order + 1 : 0,
      },
    });
    return apiOk(created, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
