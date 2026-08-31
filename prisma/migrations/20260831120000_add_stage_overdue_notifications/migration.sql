-- STAGE-OVERDUE NOTIFICATIONS (admin only).
--
-- ADDITIVE ONLY. Two nullable columns, one new table, four new enum values and
-- two indexes. No column is dropped, renamed or retyped, and no existing row
-- changes meaning: every pre-existing stage keeps overdue_after_minutes = NULL
-- (alerting off), which is exactly the legacy behaviour.
--
-- ON `ALTER TYPE ... ADD VALUE` AND TRANSACTIONS: PostgreSQL 12+ permits this
-- inside a transaction block provided the new value is not USED in the same
-- transaction. This migration only declares the values — the first rows using
-- them are written later, by the application — so it is safe under the
-- transaction Prisma Migrate wraps around it. Supabase runs PostgreSQL 15+.
-- IF NOT EXISTS keeps the migration re-runnable.

ALTER TYPE "CaseActionType" ADD VALUE IF NOT EXISTS 'STAGE_OVERDUE_MUTED';
ALTER TYPE "CaseActionType" ADD VALUE IF NOT EXISTS 'STAGE_OVERDUE_UNMUTED';
ALTER TYPE "CaseActionType" ADD VALUE IF NOT EXISTS 'STAGE_OVERDUE_READ_ALL';
ALTER TYPE "CaseActionType" ADD VALUE IF NOT EXISTS 'STAGE_OVERDUE_DURATION_UPDATED';

-- Per-stage threshold, in MINUTES. NULL = no overdue alerts for this stage.
ALTER TABLE "case_stages" ADD COLUMN "overdue_after_minutes" INTEGER;

-- When the case entered its CURRENT stage. Derived cache of the audit log;
-- backfilled below and maintained by the case create/update routes thereafter.
ALTER TABLE "patient_cases" ADD COLUMN "current_stage_entered_at" TIMESTAMP(3);

-- BACKFILL. Uses the SAME rule as getCaseById() in src/lib/case-service.ts:
-- the most recent SUCCESSFUL transition INTO the stage the case is in now.
--   - outcome = SUCCESS        : a failed attempt never actually moved the case
--   - action IN (...)          : STAGE_VISIBILITY_CHANGED writes from == to and
--                                would fabricate a re-entry on every hide/show
--   - to_stage_id = current    : the latest entry into the CURRENT stage, which
--                                is the visit still in progress
-- Cases with no matching row (transitions predating the audit log) keep NULL
-- and are therefore never reported overdue — a case whose entry time is unknown
-- must not be accused of sitting too long.
UPDATE "patient_cases" pc
SET "current_stage_entered_at" = (
  SELECT MAX(l."created_at")
  FROM "case_action_logs" l
  WHERE l."case_id" = pc."id"
    AND l."outcome" = 'SUCCESS'
    AND l."action" IN ('CASE_CREATED', 'STAGE_CHANGED', 'COLLECTION_CHANGED')
    AND l."to_stage_id" = pc."current_stage_id"
)
WHERE pc."current_stage_id" IS NOT NULL;

-- Read/mute state for a derived notification. One row per (case, stage, VISIT):
-- including the entry time means a case that returns to a stage it was muted in
-- gets a fresh, unmuted notification instead of a permanently silenced one.
CREATE TABLE "stage_overdue_notices" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "stage_key" TEXT NOT NULL,
    "stage_entered_at" TIMESTAMP(3) NOT NULL,
    "read_at" TIMESTAMP(3),
    "muted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stage_overdue_notices_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "stage_overdue_notices_case_id_idx" ON "stage_overdue_notices"("case_id");

CREATE UNIQUE INDEX "stage_overdue_notices_case_id_stage_key_stage_entered_at_key"
    ON "stage_overdue_notices"("case_id", "stage_key", "stage_entered_at");

ALTER TABLE "stage_overdue_notices"
    ADD CONSTRAINT "stage_overdue_notices_case_id_fkey"
    FOREIGN KEY ("case_id") REFERENCES "patient_cases"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- THE overdue scan's index: active cases ordered by stage-entry time, so the
-- "entered before <threshold>" range filter never scans completed cases.
CREATE INDEX "patient_cases_is_completed_current_stage_entered_at_idx"
    ON "patient_cases"("is_completed", "current_stage_entered_at");
