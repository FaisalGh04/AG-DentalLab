-- Phase C: retire the legacy PortfolioFolder enum now that folder_id is fully
-- backfilled (Phase A/B verified 0 unlinked rows). DESTRUCTIVE — a fresh pg_dump
-- backup was taken immediately before applying this.
--
--   * make portfolio_items.folder_id required
--   * drop the old enum column portfolio_items.folder (auto-removes its index,
--     but Prisma emits the explicit DropIndex first)
--   * drop the now-unused PortfolioFolder enum type
--
-- The Folder → PortfolioFolder model rename is code-only (table stays
-- portfolio_folders via @@map; FK name unchanged) and produces no SQL here.

-- DropIndex
DROP INDEX "portfolio_items_folder_order_idx";

-- AlterTable
ALTER TABLE "portfolio_items" DROP COLUMN "folder",
ALTER COLUMN "folder_id" SET NOT NULL;

-- DropEnum
DROP TYPE "PortfolioFolder";
