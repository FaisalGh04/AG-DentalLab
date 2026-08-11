-- Persisted global switch for the staff + manager confirmation layer.
-- Additive and fail-safe: the seeded singleton starts enabled, and all existing
-- action-log rows are explicitly classified as not bypassed.

-- AlterEnum
ALTER TYPE "CaseActionType" ADD VALUE 'STAFF_CONFIRMATION_ENABLED';
ALTER TYPE "CaseActionType" ADD VALUE 'STAFF_CONFIRMATION_DISABLED';

-- AlterTable
ALTER TABLE "case_action_logs"
ADD COLUMN "protection_bypassed" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "admin_security_settings" (
  "id" TEXT NOT NULL DEFAULT 'global',
  "staff_confirmation_enabled" BOOLEAN NOT NULL DEFAULT true,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "admin_security_settings_pkey" PRIMARY KEY ("id")
);

-- Seed the one global row. Application reads and writes only this id.
INSERT INTO "admin_security_settings" (
  "id",
  "staff_confirmation_enabled",
  "updated_at"
)
VALUES ('global', true, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
