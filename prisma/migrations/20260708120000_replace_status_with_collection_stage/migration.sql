-- Replace the fixed CaseStatus lifecycle (RECEIVED/IN_PROGRESS/PRODUCTION/
-- COMPLETED) with the dynamic Collection -> Stage model. Existing rows are test
-- data; the dropped status/stage columns are not preserved.

-- patient_cases: drop the old status, add collection/stage fields + the derived
-- isCompleted flag used for archive + dashboard filtering.
DROP INDEX IF EXISTS "patient_cases_current_status_idx";

ALTER TABLE "patient_cases"
  DROP COLUMN "current_status",
  ADD COLUMN "collection_id" TEXT,
  ADD COLUMN "current_stage_id" TEXT,
  ADD COLUMN "hidden_stage_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "is_completed" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "patient_cases_is_completed_idx" ON "patient_cases"("is_completed");

-- case_images: retag images by a dynamic stage id instead of the CaseStatus enum.
DROP INDEX IF EXISTS "case_images_case_id_stage_idx";

ALTER TABLE "case_images"
  DROP COLUMN "stage",
  ADD COLUMN "stage_id" TEXT;

CREATE INDEX "case_images_case_id_stage_id_idx" ON "case_images"("case_id", "stage_id");

-- The enum is no longer referenced by any column.
DROP TYPE "CaseStatus";
