-- Doctor roster, phase 1. ADDITIVE ONLY:
--   * new doctors table
--   * nullable doctor_id column + FK + composite index on patient_cases
--
-- UNLIKE the staff-auth migration, this one DOES touch patient_cases. All three
-- changes are additive and non-destructive:
--   * doctor_id is NULLABLE with no default, so every existing row stays valid
--     and unchanged. NULL means "free-text one-off doctor, not on the roster",
--     which is the correct state for all current rows — they can be linked
--     retroactively from the admin UI later.
--   * doctor_name is NOT touched. It remains required and remains the display
--     value everywhere; doctor_id is only a link, never the source of the name.
--     Renaming a roster doctor must never rewrite what past cases say.
--   * the composite index serves the public doctor portal's one query:
--     WHERE doctor_id = ? AND is_completed = ? ORDER BY created_at DESC.
--
-- ON DELETE SET NULL: removing a doctor from the roster must never delete or
-- orphan their cases — the case keeps its doctor_name snapshot and simply
-- becomes unlinked.
--
-- Lock note: adding the FK takes a brief ShareRowExclusiveLock on patient_cases
-- to validate existing rows, and the index build takes its own lock. At the
-- current row count both are effectively instant, but neither is lock-free.
--
-- No seeding here. The 26 doctors and their generated codes come in phase 2,
-- where the code format (ag-{letters}{sequence}-{random4}) and the editable
-- transliteration are implemented.
-- SQL is verbatim from `prisma migrate diff` canonical output.

-- AlterTable
ALTER TABLE "patient_cases" ADD COLUMN     "doctor_id" TEXT;

-- CreateTable
CREATE TABLE "doctors" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "code_letters" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "code_rotated_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "doctors_code_key" ON "doctors"("code");

-- CreateIndex
CREATE UNIQUE INDEX "doctors_sequence_key" ON "doctors"("sequence");

-- CreateIndex
CREATE INDEX "doctors_is_active_sequence_idx" ON "doctors"("is_active", "sequence");

-- CreateIndex
CREATE INDEX "patient_cases_doctor_id_is_completed_created_at_idx" ON "patient_cases"("doctor_id", "is_completed", "created_at");

-- AddForeignKey
ALTER TABLE "patient_cases" ADD CONSTRAINT "patient_cases_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

