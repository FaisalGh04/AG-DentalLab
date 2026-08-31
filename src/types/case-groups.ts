import type { CaseWorkflowType } from "@prisma/client";

/** A stage within a stage-set, as shown on the admin management page. */
export interface CaseStageNode {
  id: string;
  /** Immutable reference key that live case data resolves against. Never edited. */
  stageKey: string;
  labelEn: string;
  labelAr: string;
  order: number;
  /**
   * Overdue notification threshold in MINUTES, or null when this stage does not
   * alert. The editor shows and accepts HOURS; minutes is what crosses the wire
   * and what the DB stores, so the two never drift through a float.
   */
  overdueAfterMinutes: number | null;
  /** Total live references (current stage + hidden + progress + images). >0 blocks delete. */
  inUseCount: number;
}

/** A group's Regular or Digital workflow (stage-set). */
export interface CaseStageSetNode {
  id: string;
  type: CaseWorkflowType;
  labelEn: string;
  labelAr: string;
  order: number;
  /** Live cases whose collectionId == this set (blocks set delete). */
  caseCount: number;
  stages: CaseStageNode[];
}

export interface CaseGroupNode {
  id: string;
  labelEn: string;
  labelAr: string;
  order: number;
  stageSets: CaseStageSetNode[];
}

export interface CaseGroupTree {
  groups: CaseGroupNode[];
}

/** Per-reference live-usage breakdown for a single stage (delete guard). */
export interface StageInUseBreakdown {
  current: number;
  hidden: number;
  progress: number;
  images: number;
  total: number;
}
