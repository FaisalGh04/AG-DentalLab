import type { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { apiOk, apiError, handleApiError, rateLimited } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { auth } from "@/auth";
import { listCases } from "@/lib/case-service";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/ratelimit";
import { isActiveStaffName } from "@/lib/staff";
import { verifyConfirmation } from "@/lib/staff-auth";
import { buildActionLog } from "@/lib/case-audit";
import { caseCreateSchema, confirmationSchema } from "@/lib/validations";
import { isProductionCategory } from "@/lib/case-types";
import { normalizeName } from "@/lib/utils";
import { generateUniqueTrackingId } from "@/lib/tracking-id";
import { firstStageId, normalizeLifecycle } from "@/lib/production-templates";
import { getLifecycleConfig } from "@/lib/lifecycle";
import type { CaseCategory } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/admin/cases — list + filter + paginate. */
export async function GET(req: NextRequest) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const sp = req.nextUrl.searchParams;
    const data = await listCases({
      q: sp.get("q") ?? undefined,
      category: (sp.get("category") as CaseCategory) || undefined,
      archived: sp.get("archived") === "true",
      page: sp.get("page") ? Number(sp.get("page")) : 1,
      pageSize: sp.get("pageSize") ? Number(sp.get("pageSize")) : 20,
    });
    return apiOk(data);
  } catch (err) {
    return handleApiError(err);
  }
}

/** POST /api/admin/cases — create a case. */
export async function POST(req: NextRequest) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const body = await req.json();
    const input = caseCreateSchema.parse(body);
    const confirmation = confirmationSchema.parse(body?.confirmation);

    // Production categories require a workflow on create (backstop for the form).
    if (isProductionCategory(input.category) && !input.collectionId) {
      return apiError("A workflow is required for this category.", 422);
    }

    // receivedBy membership is checked at RUNTIME against the staff roster —
    // the schema only shape-checks it, since StaffMember is now the source of
    // truth and a DB-driven list cannot be a compile-time zod enum.
    if (!(await isActiveStaffName(input.receivedBy))) {
      return apiError("Select a valid staff member for Received By.", 422);
    }

    // Creation is ALWAYS gated — no diff to inspect.
    const ip = getClientIp(req.headers);
    const session = await auth();
    const check = await verifyConfirmation(confirmation, ip);

    if (!check.ok) {
      // Log the failed attempt (never the attempted secret) — this is the
      // brute-force signal. No case exists yet, so caseId stays null.
      await prisma.caseActionLog.create({
        data: buildActionLog({
          caseId: null,
          trackingId: null,
          action: "CASE_CREATED",
          outcome: check.reason === "locked" ? "LOCKED_OUT" : "CONFIRMATION_FAILED",
          staffId: confirmation.staffId,
          adminEmail: session?.user?.email ?? null,
          ip,
        }),
      });
      if (check.reason === "throttled") {
        return rateLimited(check.retryAfter ?? Date.now() + 60_000);
      }
      // ONE generic message: never reveal which factor was wrong.
      return apiError("Confirmation failed.", 401);
    }

    const norm = normalizeName(input.patientFirstName, input.patientLastName);
    const trackingId = await generateUniqueTrackingId();

    // If a collection is chosen, default the current stage to its first stage
    // (unless the client sent one). Normalize + derive isCompleted server-side.
    const config = await getLifecycleConfig();
    const life = normalizeLifecycle(
      config,
      input.collectionId,
      input.currentStageId ?? firstStageId(config, input.collectionId),
      input.hiddenStageIds,
    );

    // The case and its log line are written together: a confirmed action must
    // never exist without its audit record, and vice versa.
    const created = await prisma.$transaction(async (tx) => {
      const row = await tx.patientCase.create({
        data: {
        trackingId,
        patientFirstName: input.patientFirstName,
        patientLastName: input.patientLastName,
        patientFullNameNorm: norm,
        doctorName: input.doctorName,
        // Write-once — the only place received_by is ever set. See the PATCH
        // route, which rejects any later attempt to change it.
        receivedBy: input.receivedBy,
        caseType: input.caseType,
        category: input.category,
        collectionId: life.collectionId,
        currentStageId: life.currentStageId,
        hiddenStageIds: life.hiddenStageIds,
        isCompleted: life.isCompleted,
          estimatedCompletionDate: input.estimatedCompletionDate
            ? new Date(input.estimatedCompletionDate)
            : null,
          notes: input.notes ?? null,
        },
      });

      await tx.caseActionLog.create({
        data: buildActionLog({
          caseId: row.id,
          trackingId: row.trackingId,
          action: "CASE_CREATED",
          outcome: "SUCCESS",
          change: {
            action: "CASE_CREATED",
            from: {
              collectionId: null,
              currentStageId: null,
              hiddenStageIds: [],
              isCompleted: false,
            },
            to: {
              collectionId: life.collectionId,
              currentStageId: life.currentStageId,
              hiddenStageIds: life.hiddenStageIds,
              isCompleted: life.isCompleted,
            },
          },
          staffId: check.staffId,
          staffName: check.staffName,
          usedBreakGlass: check.usedBreakGlass,
          adminEmail: session?.user?.email ?? null,
          ip,
        }),
      });

      return row;
    });

    // New case → refresh the cached dashboard counts.
    revalidateTag("cases");

    return apiOk({ id: created.id, trackingId: created.trackingId }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
