-- Preserve every legacy category value while allowing future DB-backed keys.
-- The application field and database column stay named `category`; only their
-- PostgreSQL storage type changes from the closed enum to text.
ALTER TABLE "case_type_options"
  DROP CONSTRAINT "case_type_options_category_fkey";

ALTER TABLE "patient_cases"
  ALTER COLUMN "category" TYPE TEXT USING "category"::TEXT;

ALTER TABLE "case_category_configs"
  ALTER COLUMN "category" TYPE TEXT USING "category"::TEXT;

ALTER TABLE "case_type_options"
  ALTER COLUMN "category" TYPE TEXT USING "category"::TEXT;

ALTER TABLE "case_type_options"
  ADD CONSTRAINT "case_type_options_category_fkey"
  FOREIGN KEY ("category") REFERENCES "case_category_configs"("category")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Every existing patient_cases.category value was seeded into the config table
-- by the preceding taxonomy migration, so this adds referential protection
-- without rewriting any case data.
ALTER TABLE "patient_cases"
  ADD CONSTRAINT "patient_cases_category_fkey"
  FOREIGN KEY ("category") REFERENCES "case_category_configs"("category")
  ON DELETE RESTRICT ON UPDATE CASCADE;

DROP TYPE "CaseCategory";
