import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { quickAddStepCreateSchema } from "@/lib/validations";
import { getStage } from "@/lib/production-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/quick-add-steps?collectionId=...
 * Returns every Quick-Add chip for a collection, ordered by stage then `order`.
 * The ProgressManager filters by the stage it's viewing.
 */
export async function GET(req: NextRequest) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const collectionId = req.nextUrl.searchParams.get("collectionId");
    if (!collectionId) return apiOk([]);

    const rows = await prisma.stageQuickAddStep.findMany({
      where: { collectionId },
      orderBy: [{ stageId: "asc" }, { order: "asc" }],
      select: { id: true, stageId: true, labelEn: true, labelAr: true, order: true },
    });
    return apiOk(rows);
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * POST /api/admin/quick-add-steps — create a Quick-Add chip. Idempotent: if a
 * chip with the same English label already exists for the (collection, stage) it
 * is returned as-is (so the custom-step form can call this without erroring on
 * repeats). Appends after existing chips.
 */
export async function POST(req: NextRequest) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const input = quickAddStepCreateSchema.parse(await req.json());

    // The collection/stage must be a real one from production-templates.ts.
    if (!getStage(input.collectionId, input.stageId)) {
      return apiError("Unknown collection or stage", 422);
    }

    const existing = await prisma.stageQuickAddStep.findUnique({
      where: {
        collectionId_stageId_labelEn: {
          collectionId: input.collectionId,
          stageId: input.stageId,
          labelEn: input.labelEn,
        },
      },
    });
    if (existing) return apiOk(existing, 200);

    const last = await prisma.stageQuickAddStep.findFirst({
      where: { collectionId: input.collectionId, stageId: input.stageId },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    try {
      const created = await prisma.stageQuickAddStep.create({
        data: {
          collectionId: input.collectionId,
          stageId: input.stageId,
          labelEn: input.labelEn,
          labelAr: input.labelAr,
          order: (last?.order ?? -1) + 1,
        },
      });
      return apiOk(created, 201);
    } catch (e) {
      // Lost a race on the unique constraint — return the winner.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        const row = await prisma.stageQuickAddStep.findUnique({
          where: {
            collectionId_stageId_labelEn: {
              collectionId: input.collectionId,
              stageId: input.stageId,
              labelEn: input.labelEn,
            },
          },
        });
        if (row) return apiOk(row, 200);
      }
      throw e;
    }
  } catch (err) {
    return handleApiError(err);
  }
}
