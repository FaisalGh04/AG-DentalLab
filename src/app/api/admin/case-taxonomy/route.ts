import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { getCaseTaxonomy } from "@/lib/case-taxonomy-service";
import { prisma } from "@/lib/prisma";
import {
  caseCategoryCreateSchema,
  caseCategoryKeySchema,
} from "@/lib/validations";
import { generateCaseCategoryKey } from "@/lib/case-category-key";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;
    return apiOk(await getCaseTaxonomy());
  } catch (err) {
    console.error("[case-taxonomy] failed to load taxonomy:", err);
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const input = caseCategoryCreateSchema.parse(await req.json());
    const category = generateCaseCategoryKey(input.labelEn);
    const parsedCategory = caseCategoryKeySchema.safeParse(category);
    if (!parsedCategory.success) {
      return apiError(
        "The English label cannot produce a valid category key. Use English letters or numbers.",
        422,
      );
    }
    const last = await prisma.caseCategoryConfig.findFirst({
      orderBy: { order: "desc" },
      select: { order: true },
    });
    try {
      const created = await prisma.caseCategoryConfig.create({
        data: {
          category: parsedCategory.data,
          ...input,
          order: last ? last.order + 1 : 0,
        },
      });
      return apiOk(created, 201);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return apiError(
          "A category with this generated key already exists. Use a different English label.",
          409,
        );
      }
      throw err;
    }
  } catch (err) {
    return handleApiError(err);
  }
}
