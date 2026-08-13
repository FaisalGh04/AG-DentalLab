import type { NextRequest } from "next/server";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import {
  CaseCategoryEnum,
  caseCategoryConfigUpdateSchema,
} from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ category: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const parsedCategory = CaseCategoryEnum.safeParse((await params).category);
    if (!parsedCategory.success) return apiError("Category not found", 404);

    const input = caseCategoryConfigUpdateSchema.parse(await req.json());
    const updated = await prisma.caseCategoryConfig.update({
      where: { category: parsedCategory.data },
      data: input,
    });
    return apiOk(updated);
  } catch (err) {
    return handleApiError(err);
  }
}
