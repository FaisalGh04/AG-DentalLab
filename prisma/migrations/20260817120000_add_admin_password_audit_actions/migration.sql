-- Admin ACCOUNT password management: audit vocabulary only.
--
-- ADDITIVE ONLY. This migration adds enum values and changes no table, column,
-- constraint or row. Existing audit rows keep their current action/outcome and
-- are unaffected; nothing is renamed or removed.
--
-- The five new CaseActionType values cover password management for rows in the
-- `admins` table (the NextAuth login credentials). They are deliberately
-- separate from MANAGER_SECRET_UPDATED, which concerns the staff-layer manager
-- code — conflating the two would make the trail ambiguous about which secret
-- actually changed.
--
-- BLOCKED is a new CaseActionOutcome for a request that was correctly
-- authenticated AND correctly manager-confirmed but refused on policy grounds
-- (e.g. attempting to reset the owner through the non-owner endpoint). Reusing
-- CONFIRMATION_FAILED there would record a falsehood: the confirmation passed.
--
-- ON `ALTER TYPE ... ADD VALUE` AND TRANSACTIONS: PostgreSQL 12+ permits this
-- inside a transaction block provided the new value is not USED in the same
-- transaction. This migration only declares the values — the first rows using
-- them are written later, by the application — so it is safe under the
-- transaction Prisma Migrate wraps around it. Supabase runs PostgreSQL 15+.
--
-- IF NOT EXISTS makes the migration re-runnable against a database where a
-- value was already added by hand.

ALTER TYPE "CaseActionType" ADD VALUE IF NOT EXISTS 'ADMIN_PASSWORD_RESET';
ALTER TYPE "CaseActionType" ADD VALUE IF NOT EXISTS 'ADMIN_PASSWORD_RESET_FAILED';
ALTER TYPE "CaseActionType" ADD VALUE IF NOT EXISTS 'ADMIN_PASSWORD_RESET_BLOCKED';
ALTER TYPE "CaseActionType" ADD VALUE IF NOT EXISTS 'OWNER_PASSWORD_CHANGED';
ALTER TYPE "CaseActionType" ADD VALUE IF NOT EXISTS 'OWNER_PASSWORD_CHANGE_FAILED';

ALTER TYPE "CaseActionOutcome" ADD VALUE IF NOT EXISTS 'BLOCKED';
