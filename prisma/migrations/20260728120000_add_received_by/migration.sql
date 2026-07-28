-- Phase A of the received-by change. ADDITIVE ONLY:
--   * nullable received_by column on patient_cases
-- NULLABLE AND WITHOUT A DEFAULT ON PURPOSE. received_by records who logged the
-- case into the system; a DEFAULT would write a fabricated attribution onto every
-- pre-existing row. Existing rows stay NULL here and are set to the legacy
-- sentinel ("غير محدد") by prisma/backfill-received-by.ts, run once after this.
--
-- Phase B (separate migration) flips the column to NOT NULL, and may only run
-- once `SELECT count(*) FROM patient_cases WHERE received_by IS NULL` returns 0.
-- The app layer already treats the field as required on create, so no row written
-- after this migration can be NULL.
-- SQL is verbatim from `prisma migrate diff` canonical output.

-- AlterTable
ALTER TABLE "patient_cases" ADD COLUMN     "received_by" TEXT;
