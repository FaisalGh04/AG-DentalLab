-- Public "Our Work" portfolio — admin-managed showcase for the landing page,
-- independent of the patient-case tables. Two tables: portfolio_items (bilingual
-- copy + folder + order) and portfolio_images (storage key + intrinsic size +
-- order), one-to-many. No rows are inserted here — a separate one-time script
-- (prisma/seed-portfolio.ts) migrates the original static gallery into these
-- tables so nothing is lost.

-- CreateEnum
CREATE TYPE "PortfolioFolder" AS ENUM ('ZIRCONIA_CROWNS', 'ZIRCONIA_BRIDGES', 'VENEERS', 'PFM', 'INLAY', 'ONLAY', 'PMMA', 'IMPLANT_SOLUTIONS');

-- CreateTable
CREATE TABLE "portfolio_items" (
    "id" TEXT NOT NULL,
    "folder" "PortfolioFolder" NOT NULL,
    "title_en" TEXT NOT NULL,
    "title_ar" TEXT NOT NULL,
    "description_en" TEXT NOT NULL,
    "description_ar" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolio_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_images" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portfolio_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "portfolio_items_folder_order_idx" ON "portfolio_items"("folder", "order");

-- CreateIndex
CREATE INDEX "portfolio_images_item_id_order_idx" ON "portfolio_images"("item_id", "order");

-- AddForeignKey
ALTER TABLE "portfolio_images" ADD CONSTRAINT "portfolio_images_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "portfolio_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
