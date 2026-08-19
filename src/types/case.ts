/** Progress step as returned to any client. */
export interface ProgressDTO {
  id: string;
  stepTitle: string;
  description: string | null;
  completed: boolean;
  order: number;
  /** Stage id (from the case's collection) this step documents; null = General. */
  stageId: string | null;
  createdAt: string;
}

/** A DB-backed, editable Quick-Add step chip, scoped to a (collection, stage). */
export interface QuickAddStepDTO {
  id: string;
  stageId: string;
  labelEn: string;
  labelAr: string;
  order: number;
}

/** Image as returned to any client. */
export interface ImageDTO {
  id: string;
  imageUrl: string;
  caption: string | null;
  /** Stage id (from the case's collection) this image documents; null = General. */
  stageId: string | null;
  createdAt: string;
}

/**
 * One recorded ENTRY into a stage, derived from CaseActionLog. A case can enter
 * the same stage more than once (revert, then advance again), so this is a flat
 * chronological list of visits rather than one row per stage — the UI shows the
 * latest per stage in the list and the full run in the viewer.
 *
 * ADMIN-ONLY. Deliberately absent from PublicCaseDTO: internal operational
 * timing, same boundary that already excludes `notes` (S-M2) and `receivedBy`.
 */
export interface StageVisitDTO {
  stageId: string;
  /** When the case entered this stage = the confirmed transition's createdAt. */
  enteredAt: string;
  action: "CASE_CREATED" | "STAGE_CHANGED" | "COLLECTION_CHANGED";
  /** Who confirmed it, snapshotted at the time. Null on pre-audit rows. */
  staffName: string | null;
  /**
   * The signed-in ADMIN who performed the transition, snapshotted. Distinct
   * from staffName: that is the StaffMember who supplied a confirmation PIN,
   * which is null whenever the confirmation gate is disabled. This is the
   * account that actually made the change and is always recorded.
   * Null on rows written before the admin_name_snapshot column existed.
   */
  adminName: string | null;
  /** Stable identifier for that admin. Null on pre-audit rows. */
  adminEmail: string | null;
}

/**
 * Who moved the case into the stage it is in NOW, and when.
 *
 * `isFallback` marks a case with no usable transition row — the value is then
 * PatientCase.receivedBy (the original receiver) and `enteredAt` is null,
 * so the UI can say "original receiver" instead of implying a stage entry that
 * was never recorded.
 */
export interface CurrentStageActorDTO {
  name: string;
  email: string | null;
  enteredAt: string | null;
  isFallback: boolean;
}

/**
 * ONE category + case type pair recorded on a tooth.
 *
 * Both are SNAPSHOTS of the taxonomy keys at write time, the same rule
 * PatientCase.caseType follows: deactivating or renaming an option must never
 * rewrite what a past case says it was.
 */
export interface ToothCaseTypeEntryDTO {
  id: string;
  category: string;
  caseType: string;
  order: number;
}

/** One selected tooth (Universal Numbering, 1-32) and its 1-4 entries. */
export interface ToothItemDTO {
  id: string;
  toothNumber: number;
  order: number;
  entries: ToothCaseTypeEntryDTO[];
}

/** The production-template fields shared by public + admin case DTOs. */
export interface CaseLifecycleFields {
  collectionId: string | null;
  currentStageId: string | null;
  hiddenStageIds: string[];
  isCompleted: boolean;
}

/**
 * ONE treatment on a tooth, as the PUBLIC tracker sees it.
 *
 * Strictly NARROWER than ToothCaseTypeEntryDTO. Deliberately excluded:
 *   id       — no internal identifier leaves the server
 *   order    — a rendering detail; the array is already in order
 *   category — the taxonomy KEY is internal; the labels below say the same
 *              thing to a human without exposing the enum the admin filters on
 */
export interface PublicToothEntryDTO {
  categoryLabelEn: string;
  categoryLabelAr: string;
  caseType: string;
}

/** One treated tooth on the public tracker: its number and its treatments. */
export interface PublicToothItemDTO {
  toothNumber: number;
  entries: PublicToothEntryDTO[];
}

/**
 * PUBLIC tracking result. Deliberately omits the internal DB id and any
 * data doctors shouldn't see beyond what they need to track a case.
 */
export interface PublicCaseDTO extends CaseLifecycleFields {
  trackingId: string;
  patientName: string;
  doctorName: string;
  caseType: string;
  category: string;
  categoryLabelEn: string;
  categoryLabelAr: string;
  estimatedCompletionDate: string | null;
  /**
   * Which teeth the lab is treating, and what on each. EMPTY for cases with no
   * per-tooth plan (every case created before that feature) — the tracker shows
   * a short note instead of a chart, never a broken or empty one.
   */
  toothItems: PublicToothItemDTO[];
  // Internal lab `notes` are intentionally NOT part of the public DTO (S-M2).
  progress: ProgressDTO[];
  images: ImageDTO[];
}

/**
 * PUBLIC doctor-portal CARD. Strictly NARROWER than PublicCaseDTO.
 *
 * Deliberately EXCLUDED, and each for a reason:
 *   progress[] / images[] — not needed on a card, and loading them for N cases
 *                           multiplies both exposure and payload. The single-case
 *                           tracker still serves them when a card is opened.
 *   notes                 — internal lab instructions (S-M2), never public
 *   receivedBy            — internal intake attribution
 *   stageHistory          — internal operational timing
 *   doctorId / any id     — no internal identifiers leave the server
 *   hiddenStageIds        — per-case display config, not needed for a card
 *
 * patientName is redacted to "First L." by the same rule the single-case
 * tracker uses. collectionId is present ONLY so the client can resolve a stage
 * LABEL from the lifecycle config it already holds; it is already public on
 * PublicCaseDTO, so it is not a new exposure.
 */
export interface PublicDoctorCaseDTO {
  trackingId: string;
  patientName: string;
  caseType: string;
  category: string;
  collectionId: string | null;
  currentStageId: string | null;
  isCompleted: boolean;
  estimatedCompletionDate: string | null;
}

/** One page of a doctor's portal. The doctor name appears once, in the header. */
export interface PublicDoctorPortalDTO {
  doctorName: string;
  activeCount: number;
  archivedCount: number;
  /** Either the active list or the archive, depending on the request. */
  cases: PublicDoctorCaseDTO[];
}

/** ADMIN case (full detail, includes id). */
export interface AdminCaseDTO extends CaseLifecycleFields {
  id: string;
  trackingId: string;
  patientFirstName: string;
  patientLastName: string;
  doctorName: string;
  /** Roster link, or null for a free-text one-off doctor. Admin-only. */
  doctorId: string | null;
  /**
   * Who logged this case into the system, at intake. Write-once, and required
   * at the DB level as of Phase B. Admin-only — deliberately absent from
   * PublicCaseDTO.
   */
  receivedBy: string;
  caseType: string;
  category: string;
  estimatedCompletionDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  progress: ProgressDTO[];
  images: ImageDTO[];
  /**
   * Chronological stage entries derived from the audit log. EMPTY for cases
   * whose transitions predate the staff-auth feature — nothing was recorded
   * then, so the UI must say "not recorded" rather than imply a blank.
   */
  stageHistory: StageVisitDTO[];
  /**
   * Per-tooth treatment plan. EMPTY for legacy cases created before this
   * feature — that is not an error state, and the UI must fall back to the
   * `category` / `caseType` pair above rather than showing nothing.
   */
  toothItems: ToothItemDTO[];
  /**
   * Who moved the case into its CURRENT stage. Derived from stageHistory, with
   * a documented fallback to receivedBy for cases that predate the audit log.
   * receivedBy itself is preserved unchanged as the original receiver.
   */
  currentStageActor: CurrentStageActorDTO;
  _count?: { progress: number; images: number };
}

export interface AdminCaseListItem extends CaseLifecycleFields {
  id: string;
  trackingId: string;
  patientFirstName: string;
  patientLastName: string;
  doctorName: string;
  receivedBy: string;
  caseType: string;
  category: string;
  estimatedCompletionDate: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { progress: number; images: number };
}

export interface AdminCaseListResponse {
  items: AdminCaseListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
