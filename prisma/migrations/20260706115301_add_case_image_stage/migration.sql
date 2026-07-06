-- AlterTable
ALTER TABLE "case_images" ADD COLUMN     "stage" "CaseStatus";

-- CreateIndex
CREATE INDEX "case_images_case_id_stage_idx" ON "case_images"("case_id", "stage");

-- Backfill: tag any pre-existing images with their case's current lifecycle
-- stage, so images uploaded before this column existed are not left stranded.
UPDATE "case_images" AS ci
SET "stage" = pc."current_status"
FROM "patient_cases" AS pc
WHERE ci."case_id" = pc."id" AND ci."stage" IS NULL;
