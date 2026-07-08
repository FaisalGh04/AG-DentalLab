-- Scope production steps per stage: add a nullable stage id to case_progress,
-- same pattern as case_images.stage_id. Existing rows are test data and simply
-- get stage_id = NULL (the "General" / unscoped bucket) — no backfill needed.

ALTER TABLE "case_progress" ADD COLUMN "stage_id" TEXT;

CREATE INDEX "case_progress_case_id_stage_id_idx" ON "case_progress"("case_id", "stage_id");
