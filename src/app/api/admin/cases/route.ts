import type { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { apiOk, apiError, handleApiError, rateLimited } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { auth } from "@/auth";
import { listCases } from "@/lib/case-service";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/ratelimit";
import { verifyConfirmation } from "@/lib/staff-auth";
import { buildActionLog } from "@/lib/case-audit";
import { caseCreateSchema, confirmationSchema } from "@/lib/validations";
import { isProductionCategory } from "@/lib/case-types";
import { isActiveCaseType } from "@/lib/case-taxonomy-service";
import {
  deriveLegacyTaxonomy,
  findInvalidToothEntry,
  toothItemsCreateInput,
} from "@/lib/case-tooth-items";
import { normalizeName } from "@/lib/utils";
import { resolveActingAdmin } from "@/lib/admin-accounts";
import { generateUniqueTrackingId } from "@/lib/tracking-id";
import { firstStageId, normalizeLifecycle } from "@/lib/production-templates";
import { getLifecycleConfig } from "@/lib/lifecycle";
import { getStaffConfirmationEnabled } from "@/lib/security-settings";

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
      category: sp.get("category") || undefined,
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
    const protectionEnabled = await getStaffConfirmationEnabled();
    const confirmation = protectionEnabled
      ? confirmationSchema.parse(body?.confirmation)
      : null;

    // ---- Resolve the treatment plan -> the taxonomy this case is filed under
    //
    // Two shapes are accepted. `toothItems` is what the current form sends and
    // is the SOURCE OF TRUTH when present; the legacy single pair is still
    // accepted on its own so nothing that has not moved over breaks.
    //
    // caseCreateSchema has already proved the shape (1-32, no duplicate teeth,
    // 1-4 entries each, and that at least one of the two shapes is present), so
    // what is left is the part that needs the database: taxonomy membership.
    const toothItems = input.toothItems;
    let category: string;
    let caseType: string;

    if (toothItems && toothItems.length > 0) {
      const invalid = await findInvalidToothEntry(toothItems);
      if (invalid) {
        return apiError(
          `Select an active case type that belongs to the selected category (${invalid.category} / ${invalid.caseType}).`,
          422,
        );
      }
      // DERIVED SERVER-SIDE, never read off the body: a crafted request cannot
      // make the tooth list say one thing and the case row another.
      const legacy = deriveLegacyTaxonomy(toothItems);
      if (!legacy) {
        return apiError("Each selected tooth needs at least one case type.", 422);
      }
      category = legacy.category;
      caseType = legacy.caseType;
    } else {
      // Non-null by caseCreateSchema's superRefine, which requires this pair
      // whenever toothItems is absent.
      category = input.category as string;
      caseType = input.caseType as string;
      if (!(await isActiveCaseType(category, caseType))) {
        return apiError(
          "Select an active case type that belongs to the selected category.",
          422,
        );
      }
    }

    // Production categories require a workflow on create (backstop for the form).
    // Keyed on the RESOLVED category, so a tooth-based case is judged by the
    // same rule as a legacy one.
    if (isProductionCategory(category) && !input.collectionId) {
      return apiError("A workflow is required for this category.", 422);
    }

    // Creation normally requires staff confirmation. An explicit global setting
    // can bypass it, but changing that setting always remains manager-gated.
    const ip = getClientIp(req.headers);
    const session = await auth();

    // receivedBy is DERIVED FROM THE SIGNED-IN ADMIN, never from the request
    // body. It used to be picked by the operator from the StaffMember roster and
    // validated with isActiveStaffName(); both are gone. `caseCreateSchema` does
    // not contain receivedBy, so a client-supplied one is already stripped by
    // .parse() above and can never reach this variable — a forged value in
    // DevTools or a direct API call changes nothing.
    //
    // resolveActingAdmin reads the Admin ROW (not the JWT claims) and applies
    // the name-then-email fallback in one place; see its doc comment for why.
    // The SAME resolved identity also attributes the initial stage entry in the
    // audit row below, so receivedBy and the first stage actor can never
    // disagree about who logged the case in.
    const actingAdmin = await resolveActingAdmin(session?.user?.id);
    const receivedBy = actingAdmin?.displayName ?? "";
    if (!actingAdmin) {
      // requireAdmin() already proved a session exists, so this means the Admin
      // row was deleted mid-session. Refuse rather than write an empty
      // attribution into a record that can never be corrected.
      return apiError("Could not determine the signed-in admin.", 401);
    }
    const check = confirmation
      ? await verifyConfirmation(confirmation, ip)
      : null;

    if (check && !check.ok) {
      // Log the failed attempt (never the attempted secret) — this is the
      // brute-force signal. No case exists yet, so caseId stays null.
      await prisma.caseActionLog.create({
        data: buildActionLog({
          caseId: null,
          trackingId: null,
          action: "CASE_CREATED",
          outcome: check.reason === "locked" ? "LOCKED_OUT" : "CONFIRMATION_FAILED",
          staffId: confirmation?.staffId,
          // Recorded on failures too: a run of failed SINGLE-FACTOR attempts is
          // the brute-force signal that matters most, that path having only one
          // secret behind it.
          singleFactor: check.singleFactor,
          adminEmail: actingAdmin?.email ?? session?.user?.email ?? null,
          adminName: actingAdmin?.displayName ?? null,
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

    // The case and its audit line are written together. Bypassed actions remain
    // visible in the trail through protectionBypassed.
    const created = await prisma.$transaction(async (tx) => {
      const row = await tx.patientCase.create({
        data: {
        trackingId,
        patientFirstName: input.patientFirstName,
        patientLastName: input.patientLastName,
        patientFullNameNorm: norm,
        doctorName: input.doctorName,
        // Roster link, or null for a free-text one-off doctor.
        doctorId: input.doctorId ?? null,
        // Write-once — the only place received_by is ever set, and it comes
        // from the session above, never from `input`. See the PATCH route,
        // which rejects any later attempt to change it.
        receivedBy,
        // LEGACY SNAPSHOT. Derived above from the tooth plan when there is
        // one; see deriveLegacyTaxonomy for why it is the lowest-numbered
        // tooth's first entry. Kept so the All Cases table, public tracking and
        // the taxonomy usage counts keep reading one pair, as they always have.
        caseType,
        category,
        collectionId: life.collectionId,
        currentStageId: life.currentStageId,
        // Starts the overdue clock. Mirrors the CASE_CREATED audit row written
        // just below — same instant, same meaning — so the derived cache and
        // the audit log agree from the case's very first row.
        currentStageEnteredAt: life.currentStageId ? new Date() : null,
        hiddenStageIds: life.hiddenStageIds,
        isCompleted: life.isCompleted,
          estimatedCompletionDate: input.estimatedCompletionDate
            ? new Date(input.estimatedCompletionDate)
            : null,
          notes: input.notes ?? null,
          // Nested create: the teeth land in the same statement as the case, so
          // a case can never exist for an instant without its plan.
          ...(toothItems && toothItems.length > 0
            ? { toothItems: { create: toothItemsCreateInput(toothItems) } }
            : {}),
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
          staffId: check?.ok ? check.staffId : null,
          staffName: check?.ok ? check.staffName : null,
          usedBreakGlass: check?.ok ? check.usedBreakGlass : false,
          singleFactor: check?.ok ? check.singleFactor : false,
          protectionBypassed: !protectionEnabled,
          adminEmail: actingAdmin?.email ?? session?.user?.email ?? null,
          adminName: actingAdmin?.displayName ?? null,
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
