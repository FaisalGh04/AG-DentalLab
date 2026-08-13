import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { caseTypeInUseCount } from "@/lib/case-taxonomy-service";
import { caseTypeUpdateSchema } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const { id } = await params;
    const existing = await prisma.caseTypeOption.findUnique({ where: { id } });
    if (!existing) return apiError("Case type not found", 404);

    const input = caseTypeUpdateSchema.parse(await req.json());
    try {
      return apiOk(
        await prisma.caseTypeOption.update({ where: { id }, data: input }),
      );
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

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const { id } = await params;
    const existing = await prisma.caseTypeOption.findUnique({ where: { id } });
    if (!existing) return apiError("Case type not found", 404);

    const inUseCount = await caseTypeInUseCount(
      existing.category,
      existing.name,
    );
    if (inUseCount > 0) {
      return apiError(
        `This case type is used by ${inUseCount} case(s). Deactivate it instead.`,
        409,
      );
    }

    await prisma.caseTypeOption.delete({ where: { id } });
    return apiOk({ id });
  } catch (err) {
    return handleApiError(err);
  }
}
