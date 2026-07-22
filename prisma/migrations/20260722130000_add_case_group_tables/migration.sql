-- Phase 1 of the case-group migration. ADDITIVE ONLY:
--   * new CaseWorkflowType enum (REGULAR | DIGITAL)
--   * new tables case_groups, case_stage_sets, case_stages
--   * nullable case_stage_id FK column on stage_quick_add_steps
-- Nothing on patient_cases / case_progress / case_images is touched. The static
-- production-templates.ts stays the source of truth until a later phase; these
-- tables are seeded (prisma/seed-case-groups.ts) as an id-preserving mirror.
-- SQL is verbatim from `prisma migrate diff` canonical output.

-- CreateEnum
CREATE TYPE "CaseWorkflowType" AS ENUM ('REGULAR', 'DIGITAL');

-- AlterTable
ALTER TABLE "stage_quick_add_steps" ADD COLUMN     "case_stage_id" TEXT;

-- CreateTable
CREATE TABLE "case_groups" (
    "id" TEXT NOT NULL,
    "label_en" TEXT NOT NULL,
    "label_ar" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_stage_sets" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "type" "CaseWorkflowType" NOT NULL,
    "label_en" TEXT NOT NULL,
    "label_ar" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_stage_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_stages" (
    "id" TEXT NOT NULL,
    "stage_set_id" TEXT NOT NULL,
    "stage_key" TEXT NOT NULL,
    "label_en" TEXT NOT NULL,
    "label_ar" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_stages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "case_groups_order_idx" ON "case_groups"("order");

-- CreateIndex
CREATE INDEX "case_stage_sets_group_id_idx" ON "case_stage_sets"("group_id");

-- CreateIndex
CREATE UNIQUE INDEX "case_stage_sets_group_id_type_key" ON "case_stage_sets"("group_id", "type");

-- CreateIndex
CREATE INDEX "case_stages_stage_set_id_order_idx" ON "case_stages"("stage_set_id", "order");

-- CreateIndex
CREATE UNIQUE INDEX "case_stages_stage_set_id_stage_key_key" ON "case_stages"("stage_set_id", "stage_key");

-- CreateIndex
CREATE INDEX "stage_quick_add_steps_case_stage_id_idx" ON "stage_quick_add_steps"("case_stage_id");

-- AddForeignKey
ALTER TABLE "stage_quick_add_steps" ADD CONSTRAINT "stage_quick_add_steps_case_stage_id_fkey" FOREIGN KEY ("case_stage_id") REFERENCES "case_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_stage_sets" ADD CONSTRAINT "case_stage_sets_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "case_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_stages" ADD CONSTRAINT "case_stages_stage_set_id_fkey" FOREIGN KEY ("stage_set_id") REFERENCES "case_stage_sets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
