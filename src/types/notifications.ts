/**
 * STAGE-OVERDUE NOTIFICATIONS — admin-only DTOs.
 *
 * Deliberately carries no internal identifier beyond `caseId`: a notification
 * is identified by the case it is about, because only a case's CURRENT stage
 * can be overdue, so a case has at most one active notification at a time. The
 * client therefore never sends a stage key or a timestamp back — the server
 * resolves both from the case row, and a client cannot address a notification
 * that does not exist.
 */

export interface OverdueNotificationDTO {
  /** The case this is about. Also the notification's identity — see above. */
  caseId: string;
  trackingId: string;
  /** Full patient name. Admin-only surface, so NOT redacted (cf. PublicCaseDTO). */
  patientName: string;
  /** Stage key (PatientCase.currentStageId), not a CaseStage.id. */
  stageKey: string;
  stageLabelEn: string;
  stageLabelAr: string;
  /** ISO. When the case entered the stage. */
  enteredAt: string;
  /** ISO. enteredAt + the stage's threshold — the moment it went overdue. */
  dueAt: string;
  /** Configured threshold for the stage, in minutes. */
  thresholdMinutes: number;
  /**
   * How far past `dueAt` the case is, in whole minutes, at the moment the
   * server computed the list. Sent as a number rather than a formatted string
   * so the client can render it in the active locale.
   */
  overdueMinutes: number;
  read: boolean;
  muted: boolean;
}

export interface OverdueNotificationsResponse {
  /** Most overdue first. Muted entries are INCLUDED — the UI splits them. */
  items: OverdueNotificationDTO[];
  /** Unmuted + unread. This is the number on the bell badge. */
  unreadCount: number;
  /** Unmuted, read or unread. Drives whether the red alert bar shows at all. */
  activeCount: number;
  mutedCount: number;
  /**
   * True when the scan hit its row cap and some overdue cases are not listed.
   * The UI says so rather than silently under-reporting.
   */
  truncated: boolean;
  /** ISO timestamp the server computed this at, for "as of" display. */
  computedAt: string;
}
