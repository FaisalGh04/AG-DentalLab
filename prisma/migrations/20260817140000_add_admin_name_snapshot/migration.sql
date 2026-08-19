-- Per-stage actor attribution.
--
-- ADDITIVE ONLY: one nullable column. No table is created, dropped or renamed,
-- no existing column changes type or nullability, and no row is rewritten.
-- Every audit row written before this migration keeps its exact current
-- contents and simply carries NULL here.
--
-- WHY THIS COLUMN AND NOT A NEW TABLE. case_action_logs is already the
-- immutable, in-transaction record of stage entries: it holds case_id,
-- from_stage_id, to_stage_id, outcome, created_at and admin_email, and
-- src/lib/case-service.ts already derives the per-case stage history from it.
-- A separate transitions table would duplicate all of that and create a second
-- source of truth that could silently drift from the audit trail. The only
-- datum missing for "who moved this case into this stage" was the admin's
-- DISPLAY NAME.
--
-- It is stored as a SNAPSHOT rather than resolved through admin_email at read
-- time, matching staff_name_snapshot and patient_cases.received_by: renaming an
-- admin must not rewrite history. admin_email remains the stable identifier.

ALTER TABLE "case_action_logs"
  ADD COLUMN IF NOT EXISTS "admin_name_snapshot" TEXT;
