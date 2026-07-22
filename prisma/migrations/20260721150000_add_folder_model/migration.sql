-- Phase A of the enum → DB-backed folder migration. ADDITIVE ONLY:
--   * creates the portfolio_folders table (the new Folder model)
--   * adds a NULLABLE folder_id FK column to portfolio_items
-- The existing PortfolioFolder enum and portfolio_items.folder column are LEFT
-- UNTOUCHED. A separate one-time script (prisma/backfill-folders.ts) seeds the 8
-- folder rows and populates folder_id from each item's enum value. A LATER phase
-- makes folder_id required and drops the enum + column. No existing row is
-- modified by this migration.

-- CreateTable
CREATE TABLE "portfolio_folders" (
    "id" TEXT NOT NULL,
    "label_en" TEXT NOT NULL,
    "label_ar" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolio_folders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "portfolio_folders_order_idx" ON "portfolio_folders"("order");

-- AlterTable: add the nullable FK column (nullable keeps this additive — no
-- backfill here, so no NOT NULL violation on existing rows).
ALTER TABLE "portfolio_items" ADD COLUMN "folder_id" TEXT;

-- CreateIndex: new access path; the old [folder, order] index is kept as-is.
CREATE INDEX "portfolio_items_folder_id_order_idx" ON "portfolio_items"("folder_id", "order");

-- AddForeignKey: ON DELETE RESTRICT — a folder that still has items cannot be
-- deleted (admin must empty/reassign first).
ALTER TABLE "portfolio_items"
    ADD CONSTRAINT "portfolio_items_folder_id_fkey"
    FOREIGN KEY ("folder_id") REFERENCES "portfolio_folders"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
