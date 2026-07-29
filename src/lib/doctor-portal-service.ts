// PUBLIC doctor portal lookup.
//
// This is the project's second unauthenticated data surface, and a wider one
// than the single-case tracker: one code returns EVERY case a doctor has. The
// select list below is therefore explicit and narrow — never `include`, never a
// spread of the row — so a column added to PatientCase later cannot silently
// start appearing in a public response.

import { prisma } from "@/lib/prisma";
import { redactName } from "@/lib/utils";
import type { PublicDoctorCaseDTO, PublicDoctorPortalDTO } from "@/types/case";

/**
 * EXPLICIT allow-list of columns that may leave the server for a doctor card.
 * Everything absent here is excluded by construction, not by remembering to
 * strip it: notes, receivedBy, stage history, internal ids, progress, images.
 */
const CARD_SELECT = {
  trackingId: true,
  patientFirstName: true,
  patientLastName: true,
  caseType: true,
  category: true,
  collectionId: true,
  currentStageId: true,
  isCompleted: true,
  estimatedCompletionDate: true,
} as const;

/** Cap a single response. A portal page never needs more than this at once. */
const MAX_CASES = 200;

export interface DoctorPortalQuery {
  archived?: boolean;
  /** Patient-name filter, matched server-side against patientFullNameNorm. */
  q?: string;
}

/**
 * Look up a doctor by public code and return their cases.
 *
 * Returns null for: unknown code, and for a DEACTIVATED doctor. Both map to the
 * same "not found" response upstream, so deactivating a doctor genuinely turns
 * their portal off and the response never reveals which case applied.
 *
 * Only cases with doctorId set appear — a free-text one-off doctor is not on
 * the roster and has no portal.
 */
export async function getDoctorPortal(
  code: string,
  query: DoctorPortalQuery = {},
): Promise<PublicDoctorPortalDTO | null> {
  const doctor = await prisma.doctor.findUnique({
    where: { code },
    select: { id: true, name: true, isActive: true },
  });
  if (!doctor || !doctor.isActive) return null;

  const archived = query.archived === true;
  const q = query.q?.trim().toLowerCase();

  const where = {
    doctorId: doctor.id,
    isCompleted: archived,
    ...(q ? { patientFullNameNorm: { contains: q } } : {}),
  };

  const [rows, activeCount, archivedCount] = await Promise.all([
    prisma.patientCase.findMany({
      where,
      // Newest first, matching the single-case tracker's sense of recency.
      orderBy: { createdAt: "desc" },
      take: MAX_CASES,
      select: CARD_SELECT,
    }),
    // Counts are unfiltered by the search box so the tab labels stay stable
    // while typing.
    prisma.patientCase.count({ where: { doctorId: doctor.id, isCompleted: false } }),
    prisma.patientCase.count({ where: { doctorId: doctor.id, isCompleted: true } }),
  ]);

  const cases: PublicDoctorCaseDTO[] = rows.map((c) => ({
    trackingId: c.trackingId,
    // Redacted to "First L." server-side — the full surname must never leave
    // the server for an unauthenticated lookup (S-M2), exactly as the
    // single-case tracker does it.
    patientName: redactName(c.patientFirstName, c.patientLastName),
    caseType: c.caseType,
    category: c.category,
    collectionId: c.collectionId,
    currentStageId: c.currentStageId,
    isCompleted: c.isCompleted,
    estimatedCompletionDate: c.estimatedCompletionDate?.toISOString() ?? null,
  }));

  return { doctorName: doctor.name, activeCount, archivedCount, cases };
}
