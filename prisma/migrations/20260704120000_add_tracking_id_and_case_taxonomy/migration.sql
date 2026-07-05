DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CaseStatus') THEN
    CREATE TYPE "CaseStatus" AS ENUM (
      'RECEIVED',
      'IN_PROGRESS',
      'PRODUCTION',
      'COMPLETED'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CaseCategory') THEN
    CREATE TYPE "CaseCategory" AS ENUM (
      'IMPLANT',
      'C_AND_B',
      'PRESSABLE_CERAMIC',
      'VACUUM_FORMER',
      'SPECIAL_TRAY',
      'RESIN_MODEL',
      'EXTERNAL_LABORATORY_SERVICES',
      'DENTAL_EQUIPMENT',
      'GYPSUM_MODEL',
      'FLEX_DENTURE'
    );
  ELSIF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'CaseCategory'
      AND e.enumlabel = 'IMPLANT'
  ) THEN
    ALTER TYPE "CaseCategory" RENAME TO "CaseCategory_old";

    CREATE TYPE "CaseCategory" AS ENUM (
      'IMPLANT',
      'C_AND_B',
      'PRESSABLE_CERAMIC',
      'VACUUM_FORMER',
      'SPECIAL_TRAY',
      'RESIN_MODEL',
      'EXTERNAL_LABORATORY_SERVICES',
      'DENTAL_EQUIPMENT',
      'GYPSUM_MODEL',
      'FLEX_DENTURE'
    );

    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'patient_cases') THEN
      ALTER TABLE "patient_cases"
        ALTER COLUMN "category" TYPE "CaseCategory"
        USING (
          CASE "category"::text
            WHEN 'IMPLANT_SOLUTIONS' THEN 'IMPLANT'
            WHEN 'ORAL_APPLIANCES' THEN 'VACUUM_FORMER'
            WHEN 'DIGITAL_DENTISTRY' THEN 'RESIN_MODEL'
            ELSE 'C_AND_B'
          END
        )::"CaseCategory";
    END IF;

    DROP TYPE "CaseCategory_old";
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "admins" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password_hash" TEXT NOT NULL,
  "name" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "patient_cases" (
  "id" TEXT NOT NULL,
  "tracking_id" TEXT NOT NULL,
  "patient_first_name" TEXT NOT NULL,
  "patient_last_name" TEXT NOT NULL,
  "patient_full_name_norm" TEXT NOT NULL,
  "doctor_name" TEXT NOT NULL,
  "case_type" TEXT NOT NULL,
  "category" "CaseCategory" NOT NULL,
  "current_status" "CaseStatus" NOT NULL DEFAULT 'RECEIVED',
  "estimated_completion_date" TIMESTAMP(3),
  "notes" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "patient_cases_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "patient_cases"
  ADD COLUMN IF NOT EXISTS "tracking_id" TEXT;

UPDATE "patient_cases"
SET "tracking_id" = 'AG-' || upper(substr(translate(md5("id" || "created_at"::text), '01abcdef', '23ABCDEFG'), 1, 6))
WHERE "tracking_id" IS NULL;

ALTER TABLE "patient_cases"
  ALTER COLUMN "tracking_id" SET NOT NULL;

CREATE TABLE IF NOT EXISTS "case_progress" (
  "id" TEXT NOT NULL,
  "case_id" TEXT NOT NULL,
  "step_title" TEXT NOT NULL,
  "description" TEXT,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "case_progress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "case_images" (
  "id" TEXT NOT NULL,
  "case_id" TEXT NOT NULL,
  "image_url" TEXT NOT NULL,
  "key" TEXT,
  "caption" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "case_images_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "admins_email_key" ON "admins"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "patient_cases_tracking_id_key" ON "patient_cases"("tracking_id");
CREATE INDEX IF NOT EXISTS "patient_cases_patient_full_name_norm_idx" ON "patient_cases"("patient_full_name_norm");
CREATE INDEX IF NOT EXISTS "patient_cases_tracking_id_idx" ON "patient_cases"("tracking_id");
CREATE INDEX IF NOT EXISTS "patient_cases_current_status_idx" ON "patient_cases"("current_status");
CREATE INDEX IF NOT EXISTS "patient_cases_created_at_idx" ON "patient_cases"("created_at");
CREATE INDEX IF NOT EXISTS "patient_cases_doctor_name_idx" ON "patient_cases"("doctor_name");
CREATE INDEX IF NOT EXISTS "case_progress_case_id_idx" ON "case_progress"("case_id");
CREATE INDEX IF NOT EXISTS "case_images_case_id_idx" ON "case_images"("case_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'case_progress_case_id_fkey'
  ) THEN
    ALTER TABLE "case_progress"
      ADD CONSTRAINT "case_progress_case_id_fkey"
      FOREIGN KEY ("case_id") REFERENCES "patient_cases"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'case_images_case_id_fkey'
  ) THEN
    ALTER TABLE "case_images"
      ADD CONSTRAINT "case_images_case_id_fkey"
      FOREIGN KEY ("case_id") REFERENCES "patient_cases"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
