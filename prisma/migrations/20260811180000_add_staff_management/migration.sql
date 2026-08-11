-- Manager-only Staff Management access and audit actions.
-- Additive: no existing staff, manager secrets, cases, or action logs change.

ALTER TYPE "CaseActionType" ADD VALUE 'STAFF_MANAGEMENT_ACCESS';
ALTER TYPE "CaseActionType" ADD VALUE 'STAFF_CREATED';
ALTER TYPE "CaseActionType" ADD VALUE 'STAFF_UPDATED';
ALTER TYPE "CaseActionType" ADD VALUE 'STAFF_DEACTIVATED';
ALTER TYPE "CaseActionType" ADD VALUE 'STAFF_REACTIVATED';
ALTER TYPE "CaseActionType" ADD VALUE 'STAFF_MANAGER_ASSIGNED';
ALTER TYPE "CaseActionType" ADD VALUE 'MANAGER_SECRET_UPDATED';

CREATE TABLE "staff_management_sessions" (
  "id" TEXT NOT NULL,
  "token_hash" CHAR(64) NOT NULL,
  "admin_id" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "staff_management_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "staff_management_sessions_token_hash_key"
ON "staff_management_sessions"("token_hash");

CREATE INDEX "staff_management_sessions_admin_id_expires_at_idx"
ON "staff_management_sessions"("admin_id", "expires_at");

CREATE INDEX "staff_management_sessions_expires_at_idx"
ON "staff_management_sessions"("expires_at");

ALTER TABLE "staff_management_sessions"
ADD CONSTRAINT "staff_management_sessions_admin_id_fkey"
FOREIGN KEY ("admin_id") REFERENCES "admins"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
