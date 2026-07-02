import type { NextRequest } from "next/server";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { imageAttachSchema } from "@/lib/validations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** POST — persist an uploaded image's URL against the case. */
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const { id: caseId } = await params;
    const kase = await prisma.patientCase.findUnique({ where: { id: caseId } });
    if (!kase) return apiError("Case not found", 404);

    const body = await req.json();
    const input = imageAttachSchema.parse({ ...body, caseId });

    const image = await prisma.caseImage.create({
      data: {
        caseId,
        imageUrl: input.imageUrl,
        key: input.key,
        caption: input.caption ?? null,
      },
    });

    return apiOk(
      {
        id: image.id,
        imageUrl: image.imageUrl,
        caption: image.caption,
        createdAt: image.createdAt.toISOString(),
      },
      201,
    );
  } catch (err) {
    return handleApiError(err);
  }
}
