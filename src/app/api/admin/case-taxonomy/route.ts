import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { getCaseTaxonomy } from "@/lib/case-taxonomy-service";
import { prisma } from "@/lib/prisma";
import { caseCategoryCreateSchema } from "@/lib/validations";

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
    const last = await prisma.caseCategoryConfig.findFirst({
      orderBy: { order: "desc" },
      select: { order: true },
    });
    try {
      const created = await prisma.caseCategoryConfig.create({
        data: { ...input, order: last ? last.order + 1 : 0 },
      });
      return apiOk(created, 201);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return apiError("That category key already exists.", 409);
      }
      throw err;
    }
  } catch (err) {
    return handleApiError(err);
  }
}
