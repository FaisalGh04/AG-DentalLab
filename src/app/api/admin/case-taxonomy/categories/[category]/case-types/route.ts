import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { caseTypeCreateSchema } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ category: string }> };

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const category = (await params).category;
    const categoryExists = await prisma.caseCategoryConfig.findUnique({
      where: { category },
      select: { category: true },
    });
    if (!categoryExists) return apiError("Category not found", 404);

    const input = caseTypeCreateSchema.parse(await req.json());
    const last = await prisma.caseTypeOption.findFirst({
      where: { category },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    try {
      const created = await prisma.caseTypeOption.create({
        data: {
          category,
          name: input.name,
          order: last ? last.order + 1 : 0,
        },
      });
      return apiOk(created, 201);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return apiError("That case type already exists in this category.", 409);
      }
      throw err;
    }
  } catch (err) {
    return handleApiError(err);
  }
}
