import type { NextRequest } from "next/server";
import { apiOk, apiError, handleApiError, rateLimited } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { auth } from "@/auth";
import { getClientIp } from "@/lib/ratelimit";
import { verifyConfirmation } from "@/lib/staff-auth";
import { detectLifecycleChange, buildActionLog } from "@/lib/case-audit";
import { resolveActingAdmin } from "@/lib/admin-accounts";
import { confirmationSchema } from "@/lib/validations";
import { revalidateTag } from "next/cache";
import { getCaseById } from "@/lib/case-service";
import { prisma } from "@/lib/prisma";
import { caseUpdateSchema } from "@/lib/validations";
import { normalizeName } from "@/lib/utils";
import { deleteObject } from "@/lib/s3";
import { getStaffConfirmationEnabled } from "@/lib/security-settings";
import { firstStageId, normalizeLifecycle } from "@/lib/production-templates";
import { getLifecycleConfig } from "@/lib/lifecycle";
import { isActiveCaseType } from "@/lib/case-taxonomy-service";
import { isProductionCategory } from "@/lib/case-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const { id } = await params;
    const found = await getCaseById(id);
    if (!found) return apiError("Case not found", 404);
    return apiOk(found);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const { id } = await params;

    // Enforcement layer 3 for the write-once receivedBy. caseUpdateSchema would
    // silently strip the key (zod objects are non-strict) and the `data` below
    // never names it — but a silent drop makes a real client bug look like a
    // successful save, so reject loudly instead. Checked BEFORE the row lookup:
    // the request is invalid regardless of whether the case exists, and this
    // avoids a DB round trip (and any existence oracle) on a rejected body.
    const body = await req.json();
    if (body && typeof body === "object" && "receivedBy" in body) {
      return apiError("Received By cannot be changed after creation.", 422);
    }

    const existing = await prisma.patientCase.findUnique({ where: { id } });
    if (!existing) return apiError("Case not found", 404);

    const input = caseUpdateSchema.parse(body);
    const targetCategory = input.category ?? existing.category;
    const targetCaseType = input.caseType ?? existing.caseType;
    const categoryChanged = targetCategory !== existing.category;
    const taxonomyChanged =
      targetCategory !== existing.category ||
      targetCaseType !== existing.caseType;
    if (
      taxonomyChanged &&
      !(await isActiveCaseType(targetCategory, targetCaseType))
    ) {
      return apiError(
        "Select an active case type that belongs to the selected category.",
        422,
      );
    }
    if (
      categoryChanged &&
      isProductionCategory(targetCategory) &&
      !input.collectionId
    ) {
      return apiError("A workflow is required for this category.", 422);
    }
    const ip = getClientIp(req.headers);
    const session = await auth();
    // Server-authoritative actor for the stage entry recorded below. Read from
    // the Admin row, never from the request body, and resolved even for plain
    // edits (cheap, indexed) so the two audit paths cannot diverge.
    const actingAdmin = await resolveActingAdmin(session?.user?.id);

    const firstName = input.patientFirstName ?? existing.patientFirstName;
    const lastName = input.patientLastName ?? existing.patientLastName;
    const norm = normalizeName(firstName, lastName);

    // Resolve the lifecycle selection. Switching collection resets the current
    // stage (to the new collection's first) and hidden list unless the client
    // sent explicit values. Everything is validated + isCompleted re-derived.
    const config = await getLifecycleConfig();
    const collectionId = categoryChanged && !isProductionCategory(targetCategory)
      ? null
      : input.collectionId !== undefined
        ? input.collectionId
        : existing.collectionId;
    const collectionChanged =
      collectionId !== existing.collectionId;
    const currentStageId =
      input.currentStageId !== undefined
        ? input.currentStageId
        : collectionChanged
          ? firstStageId(config, collectionId)
          : existing.currentStageId;
    const hiddenStageIds =
      input.hiddenStageIds !== undefined
        ? input.hiddenStageIds
        : collectionChanged
          ? []
          : existing.hiddenStageIds;
    const life = normalizeLifecycle(config, collectionId, currentStageId, hiddenStageIds);

    // ---- Confirmation gate, keyed on the DIFF, not on the route ----------
    // Plain edits (notes / doctorName / dates) leave the normalized lifecycle
    // identical, so `change` is null and they pass through completely ungated.
    // Only an actual transition demands the two-factor confirmation.
    const change = detectLifecycleChange(existing, life);
    const protectionEnabled = change
      ? await getStaffConfirmationEnabled()
      : true;
    let confirmed: Awaited<ReturnType<typeof verifyConfirmation>> | null = null;

    if (change && protectionEnabled) {
      const parsed = confirmationSchema.safeParse(body?.confirmation);
      if (!parsed.success) {
        return apiError("This change requires confirmation.", 401);
      }
      confirmed = await verifyConfirmation(parsed.data, ip);

      if (!confirmed.ok) {
        await prisma.caseActionLog.create({
          data: buildActionLog({
            caseId: existing.id,
            trackingId: existing.trackingId,
            action: change.action,
            outcome:
              confirmed.reason === "locked" ? "LOCKED_OUT" : "CONFIRMATION_FAILED",
            change,
            staffId: parsed.data.staffId,
            // Recorded on failures too: a run of failed SINGLE-FACTOR attempts
            // is the brute-force signal that matters most, that path having
            // only one secret behind it.
            singleFactor: confirmed.singleFactor,
            adminEmail: actingAdmin?.email ?? session?.user?.email ?? null,
            adminName: actingAdmin?.displayName ?? null,
            ip,
          }),
        });
        if (confirmed.reason === "throttled") {
          return rateLimited(confirmed.retryAfter ?? Date.now() + 60_000);
        }
        return apiError("Confirmation failed.", 401);
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.patientCase.update({
        where: { id },
        data: {
        patientFirstName: firstName,
        patientLastName: lastName,
        patientFullNameNorm: norm,
        doctorName: input.doctorName ?? existing.doctorName,
        // Plain field: retroactively linking a case to a roster doctor is NOT a
        // lifecycle change, so it deliberately does not trigger the gate.
        doctorId: input.doctorId !== undefined ? input.doctorId : existing.doctorId,
        caseType: input.caseType ?? existing.caseType,
        category: input.category ?? existing.category,
        collectionId: life.collectionId,
        currentStageId: life.currentStageId,
        hiddenStageIds: life.hiddenStageIds,
        isCompleted: life.isCompleted,
        estimatedCompletionDate:
          input.estimatedCompletionDate !== undefined
            ? input.estimatedCompletionDate
              ? new Date(input.estimatedCompletionDate)
              : null
            : existing.estimatedCompletionDate,
          notes: input.notes !== undefined ? input.notes : existing.notes,
        },
      });

      // Same transaction as the mutation. Lifecycle changes are logged whether
      // confirmed or explicitly bypassed; ordinary field edits remain unlogged.
      if (change) {
        await tx.caseActionLog.create({
          data: buildActionLog({
            caseId: row.id,
            trackingId: row.trackingId,
            action: change.action,
            outcome: "SUCCESS",
            change,
            staffId: confirmed?.ok ? confirmed.staffId : null,
            staffName: confirmed?.ok ? confirmed.staffName : null,
            usedBreakGlass: confirmed?.ok ? confirmed.usedBreakGlass : false,
            singleFactor: confirmed?.ok ? confirmed.singleFactor : false,
            protectionBypassed: !protectionEnabled,
            adminEmail: actingAdmin?.email ?? session?.user?.email ?? null,
            adminName: actingAdmin?.displayName ?? null,
            ip,
          }),
        });
      }

      return row;
    });

    // Status may have changed → refresh the cached dashboard counts.
    revalidateTag("cases");

    return apiOk({ id: updated.id });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const denied = await requireAdmin(req.headers);
    if (denied) return denied;

    const { id } = await params;
    const existing = await prisma.patientCase.findUnique({
      where: { id },
      include: { images: true },
    });
    if (!existing) return apiError("Case not found", 404);

    // Best-effort remove stored objects before deleting the row.
    await Promise.allSettled(
      existing.images
        .filter((i) => i.key)
        .map((i) => deleteObject(i.key as string)),
    );

    await prisma.patientCase.delete({ where: { id } });
    revalidateTag("cases");

    return apiOk({ id });
  } catch (err) {
    return handleApiError(err);
  }
}
