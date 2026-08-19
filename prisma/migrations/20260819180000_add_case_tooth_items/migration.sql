-- Per-tooth treatment items for a case.
--
-- ADDITIVE ONLY: two new tables. No existing table is altered, no column is
-- dropped, renamed or re-typed, and not one existing row is rewritten.
-- patient_cases.category and patient_cases.case_type keep their current values
-- and their current meaning (the legacy single-value snapshot), so every
-- existing reader — the All Cases table, public tracking, taxonomy usage
-- counts — behaves exactly as before this migration.
--
-- Cases created before this migration simply have no rows here. The UI treats
-- that as "legacy" and keeps showing category/case_type; it never invents
-- tooth data that was not recorded.
--
-- WHY TWO TABLES rather than one with a JSON column: the entries are queried
-- and validated per pair (category + case type must exist in the ACTIVE
-- taxonomy), and a tooth can carry up to four of them. A relational shape keeps
-- that checkable and indexable; a JSON blob would make it neither.

CREATE TABLE IF NOT EXISTS "case_tooth_items" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "tooth_number" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_tooth_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "case_tooth_case_types" (
    "id" TEXT NOT NULL,
    "tooth_item_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "case_type" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "case_tooth_case_types_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "case_tooth_items_case_id_idx" ON "case_tooth_items"("case_id");

-- One row per tooth per case. Multiple treatments on the same tooth are
-- entries in case_tooth_case_types, never duplicate tooth rows.
CREATE UNIQUE INDEX IF NOT EXISTS "case_tooth_items_case_id_tooth_number_key" ON "case_tooth_items"("case_id", "tooth_number");

CREATE INDEX IF NOT EXISTS "case_tooth_case_types_tooth_item_id_idx" ON "case_tooth_case_types"("tooth_item_id");

-- CASCADE on both: these rows describe one case and are meaningless without it.
-- Deliberately unlike case_action_logs, which uses SET NULL so the audit trail
-- survives a deleted case.
ALTER TABLE "case_tooth_items"
  ADD CONSTRAINT "case_tooth_items_case_id_fkey"
  FOREIGN KEY ("case_id") REFERENCES "patient_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "case_tooth_case_types"
  ADD CONSTRAINT "case_tooth_case_types_tooth_item_id_fkey"
  FOREIGN KEY ("tooth_item_id") REFERENCES "case_tooth_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
