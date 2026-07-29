-- Staff confirmation layer, phase 1. ADDITIVE ONLY:
--   * 3 new enums   (ManagerSecretKind, CaseActionType, CaseActionOutcome)
--   * 3 new tables  (staff_members, manager_secrets, case_action_logs)
--   * 2 new FKs on case_action_logs, both ON DELETE SET NULL
--
-- NOTHING on patient_cases is altered. The PatientCase.actionLogs relation in
-- schema.prisma is a Prisma-level back-relation only — the FK column lives on
-- case_action_logs. patient_cases appears below exactly once, as the REFERENCES
-- target of that FK, never as an ALTER target.
--
-- SET NULL (not CASCADE) on both FKs is deliberate: deleting a case or a staff
-- member must never erase the audit trail. tracking_id_snapshot and
-- staff_name_snapshot keep a log row readable after its parent is gone.
--
-- No seeding here — staff PINs, the manager code and the break-glass code are
-- written by prisma/seed-staff.ts, which prompts interactively. No secret is
-- ever committed, logged, or placed in a migration.
--
-- Lock note: adding the case_id FK briefly takes a ShareRowExclusiveLock on
-- patient_cases to validate existing rows. The table is tiny (4 rows), so this
-- is effectively instant, but it is not a zero-lock operation.
-- SQL is verbatim from `prisma migrate diff` canonical output.

-- CreateEnum
CREATE TYPE "ManagerSecretKind" AS ENUM ('PRIMARY', 'BREAK_GLASS');

-- CreateEnum
CREATE TYPE "CaseActionType" AS ENUM ('CASE_CREATED', 'STAGE_CHANGED', 'COLLECTION_CHANGED', 'STAGE_VISIBILITY_CHANGED');

-- CreateEnum
CREATE TYPE "CaseActionOutcome" AS ENUM ('SUCCESS', 'CONFIRMATION_FAILED', 'LOCKED_OUT');

-- CreateTable
CREATE TABLE "staff_members" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pin_hash" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "failed_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manager_secrets" (
    "id" TEXT NOT NULL,
    "kind" "ManagerSecretKind" NOT NULL,
    "code_hash" TEXT NOT NULL,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manager_secrets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_action_logs" (
    "id" TEXT NOT NULL,
    "case_id" TEXT,
    "tracking_id_snapshot" TEXT,
    "action" "CaseActionType" NOT NULL,
    "outcome" "CaseActionOutcome" NOT NULL DEFAULT 'SUCCESS',
    "from_collection_id" TEXT,
    "to_collection_id" TEXT,
    "from_stage_id" TEXT,
    "to_stage_id" TEXT,
    "hidden_before" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hidden_after" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_completed_before" BOOLEAN,
    "is_completed_after" BOOLEAN,
    "staff_id" TEXT,
    "staff_name_snapshot" TEXT,
    "used_break_glass" BOOLEAN NOT NULL DEFAULT false,
    "admin_email" TEXT,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_action_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_members_name_key" ON "staff_members"("name");

-- CreateIndex
CREATE INDEX "staff_members_is_active_order_idx" ON "staff_members"("is_active", "order");

-- CreateIndex
CREATE UNIQUE INDEX "manager_secrets_kind_key" ON "manager_secrets"("kind");

-- CreateIndex
CREATE INDEX "case_action_logs_case_id_created_at_idx" ON "case_action_logs"("case_id", "created_at");

-- CreateIndex
CREATE INDEX "case_action_logs_created_at_idx" ON "case_action_logs"("created_at");

-- CreateIndex
CREATE INDEX "case_action_logs_outcome_created_at_idx" ON "case_action_logs"("outcome", "created_at");

-- AddForeignKey
ALTER TABLE "case_action_logs" ADD CONSTRAINT "case_action_logs_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "patient_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_action_logs" ADD CONSTRAINT "case_action_logs_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

