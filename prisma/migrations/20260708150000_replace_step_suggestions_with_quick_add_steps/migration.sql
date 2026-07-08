-- Move per-stage Quick-Add steps from the static production-templates.ts arrays
-- into a DB-backed table that becomes the single source of truth. This makes every
-- chip (built-in + custom) fully editable/deletable. Collections & Stages stay static.
--
-- 1) Create the table.  2) Seed every built-in step (generated from
-- production-templates.ts).  3) Carry over any custom chips from the previous
-- step_suggestions table.  4) Drop step_suggestions (superseded).

CREATE TABLE "stage_quick_add_steps" (
    "id" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "label_en" TEXT NOT NULL,
    "label_ar" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stage_quick_add_steps_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stage_quick_add_steps_collection_id_stage_id_label_en_key" ON "stage_quick_add_steps"("collection_id", "stage_id", "label_en");

CREATE INDEX "stage_quick_add_steps_collection_id_stage_id_idx" ON "stage_quick_add_steps"("collection_id", "stage_id");

-- Seed built-in Quick-Add steps (one row per production-templates.ts step).
INSERT INTO "stage_quick_add_steps" ("id", "collection_id", "stage_id", "label_en", "label_ar", "order", "created_at", "updated_at") VALUES
('seed-zirconia-crown-bridge-received-0', 'zirconia-crown-bridge', 'received', 'Received', 'الاستلام', 0, now(), now()),
('seed-zirconia-crown-bridge-casting-prep-0', 'zirconia-crown-bridge', 'casting-prep', 'Cast impression (type4)', 'صب القياس (type4)', 0, now(), now()),
('seed-zirconia-crown-bridge-casting-prep-1', 'zirconia-crown-bridge', 'casting-prep', 'Dowel Pin', 'Dowel Pin', 1, now(), now()),
('seed-zirconia-crown-bridge-casting-prep-2', 'zirconia-crown-bridge', 'casting-prep', 'Cast type3', 'صب type3', 2, now(), now()),
('seed-zirconia-crown-bridge-casting-prep-3', 'zirconia-crown-bridge', 'casting-prep', 'Mounting analogs & trimming model', 'تركيب المطابق وقص الموديل', 3, now(), now()),
('seed-zirconia-crown-bridge-casting-prep-4', 'zirconia-crown-bridge', 'casting-prep', 'Sawing & preparing model', 'نشر الموديل وتجهيزه', 4, now(), now()),
('seed-zirconia-crown-bridge-cad-cam-0', 'zirconia-crown-bridge', 'cad-cam', 'CAD design + try-in', 'مرحلة التصميم (CAD) + بروفا', 0, now(), now()),
('seed-zirconia-crown-bridge-cad-cam-1', 'zirconia-crown-bridge', 'cad-cam', 'Block milling (CAM) + centering', 'خراطة البلوك (CAM) + centering', 1, now(), now()),
('seed-zirconia-crown-bridge-finishing-0', 'zirconia-crown-bridge', 'finishing', 'Finishing', 'الفينيشينج', 0, now(), now()),
('seed-zirconia-crown-bridge-stain-glaze-0', 'zirconia-crown-bridge', 'stain-glaze', 'Stain & Glaze', 'Stain & Glaze', 0, now(), now()),
('seed-zirconia-crown-bridge-packaging-delivery-0', 'zirconia-crown-bridge', 'packaging-delivery', 'Packaging & delivery', 'التغليف والتسليم', 0, now(), now()),
('seed-zirconia-on-implant-received-0', 'zirconia-on-implant', 'received', 'Received', 'الاستلام', 0, now(), now()),
('seed-zirconia-on-implant-casting-prep-0', 'zirconia-on-implant', 'casting-prep', 'Verifying parts & ordering lab analog from supplier', 'التأكد من القطع والتواصل مع الشركة وطلب lab analog', 0, now(), now()),
('seed-zirconia-on-implant-casting-prep-1', 'zirconia-on-implant', 'casting-prep', 'Artificial gingiva', 'اللثة الصناعية', 1, now(), now()),
('seed-zirconia-on-implant-casting-prep-2', 'zirconia-on-implant', 'casting-prep', 'Casting (type4/type3)', 'الصب (type4/type3)', 2, now(), now()),
('seed-zirconia-on-implant-casting-prep-3', 'zirconia-on-implant', 'casting-prep', 'Ordering tie base/abutment', 'طلب tie base/abutment', 3, now(), now()),
('seed-zirconia-on-implant-casting-prep-4', 'zirconia-on-implant', 'casting-prep', 'Preparing model & mounting analogs', 'تجهيز الموديل وتركيب المطابق', 4, now(), now()),
('seed-zirconia-on-implant-cad-cam-0', 'zirconia-on-implant', 'cad-cam', 'CAD design + try-in', 'مرحلة التصميم (CAD) + بروفا', 0, now(), now()),
('seed-zirconia-on-implant-cad-cam-1', 'zirconia-on-implant', 'cad-cam', 'Block milling (CAM)', 'خراطة البلوك (CAM)', 1, now(), now()),
('seed-zirconia-on-implant-finishing-0', 'zirconia-on-implant', 'finishing', 'Finishing', 'الفينيشينج', 0, now(), now()),
('seed-zirconia-on-implant-stain-glaze-0', 'zirconia-on-implant', 'stain-glaze', 'Stain & glaze + bonding teeth to implant', 'Stain & Glaze + إلصاق الأسنان بالزرعة', 0, now(), now()),
('seed-zirconia-on-implant-packaging-delivery-0', 'zirconia-on-implant', 'packaging-delivery', 'Packaging & delivery', 'التغليف والتسليم', 0, now(), now()),
('seed-metal-pfm-crown-bridge-received-0', 'metal-pfm-crown-bridge', 'received', 'Received', 'الاستلام', 0, now(), now()),
('seed-metal-pfm-crown-bridge-casting-prep-0', 'metal-pfm-crown-bridge', 'casting-prep', 'Cast impression (type4)', 'صب القياس (type4)', 0, now(), now()),
('seed-metal-pfm-crown-bridge-casting-prep-1', 'metal-pfm-crown-bridge', 'casting-prep', 'Dowel Pin', 'Dowel Pin', 1, now(), now()),
('seed-metal-pfm-crown-bridge-casting-prep-2', 'metal-pfm-crown-bridge', 'casting-prep', 'Cast type3', 'صب type3', 2, now(), now()),
('seed-metal-pfm-crown-bridge-casting-prep-3', 'metal-pfm-crown-bridge', 'casting-prep', 'Mounting analogs & trimming model', 'تركيب المطابق وقص الموديل', 3, now(), now()),
('seed-metal-pfm-crown-bridge-casting-prep-4', 'metal-pfm-crown-bridge', 'casting-prep', 'Sawing model (3-6)', 'نشر الموديل (3-6)', 4, now(), now()),
('seed-metal-pfm-crown-bridge-cad-design-0', 'metal-pfm-crown-bridge', 'cad-design', 'CAD design', 'مرحلة التصميم (CAD)', 0, now(), now()),
('seed-metal-pfm-crown-bridge-try-in-digital-0', 'metal-pfm-crown-bridge', 'try-in-digital', 'Try-in — for digital cases', 'عمل بروفا (Try-in) — للحالات الرقمية', 0, now(), now()),
('seed-metal-pfm-crown-bridge-design-metal-laser-0', 'metal-pfm-crown-bridge', 'design-metal-laser', 'CAD design', 'مرحلة التصميم (CAD)', 0, now(), now()),
('seed-metal-pfm-crown-bridge-design-metal-laser-1', 'metal-pfm-crown-bridge', 'design-metal-laser', 'Metal laser fabrication (7-8)', 'عمل المعدن بالليزر (7-8)', 1, now(), now()),
('seed-metal-pfm-crown-bridge-metal-finishing-0', 'metal-pfm-crown-bridge', 'metal-finishing', 'Metal finishing', 'الفينيشينج للمعدن', 0, now(), now()),
('seed-metal-pfm-crown-bridge-stain-glaze-0', 'metal-pfm-crown-bridge', 'stain-glaze', 'Stain & Glaze', 'Stain & Glaze', 0, now(), now()),
('seed-metal-pfm-crown-bridge-packaging-delivery-0', 'metal-pfm-crown-bridge', 'packaging-delivery', 'Packaging & delivery', 'التغليف والتسليم', 0, now(), now()),
('seed-veneer-received-0', 'veneer', 'received', 'Received', 'الاستلام', 0, now(), now()),
('seed-veneer-casting-prep-0', 'veneer', 'casting-prep', 'Receiving impression & casting', 'استلام الطبعة وصب القياس', 0, now(), now()),
('seed-veneer-casting-prep-1', 'veneer', 'casting-prep', 'Preparing model', 'تجهيز الموديل', 1, now(), now()),
('seed-veneer-cad-cam-0', 'veneer', 'cad-cam', 'CAD design', 'مرحلة التصميم (CAD)', 0, now(), now()),
('seed-veneer-cad-cam-1', 'veneer', 'cad-cam', 'Waxing & casting rings', 'تشميع وصب الرينجات', 1, now(), now()),
('seed-veneer-cad-cam-2', 'veneer', 'cad-cam', 'Pressing block (ingot)', 'كبس البلوك (ingot)', 2, now(), now()),
('seed-veneer-divesting-cleaning-0', 'veneer', 'divesting-cleaning', 'Divesting & cleaning', 'رش وتنظيف', 0, now(), now()),
('seed-veneer-fitting-finishing-0', 'veneer', 'fitting-finishing', 'Fitting & finishing', 'تقعيد وفينيشينج', 0, now(), now()),
('seed-veneer-fitting-finishing-1', 'veneer', 'fitting-finishing', 'Stain & glaze', 'stain & glaze', 1, now(), now()),
('seed-veneer-packaging-delivery-0', 'veneer', 'packaging-delivery', 'Packaging & delivery', 'التغليف والتسليم', 0, now(), now()),
('seed-retainer-night-sport-guard-received-0', 'retainer-night-sport-guard', 'received', 'Received', 'الاستلام', 0, now(), now()),
('seed-retainer-night-sport-guard-casting-cleaning-pressing-0', 'retainer-night-sport-guard', 'casting-cleaning-pressing', 'Cast impression (type4)', 'صب القياس (type4)', 0, now(), now()),
('seed-retainer-night-sport-guard-casting-cleaning-pressing-1', 'retainer-night-sport-guard', 'casting-cleaning-pressing', 'Cleaning edges & preparation', 'تنظيف الحواف والتجهيز', 1, now(), now()),
('seed-retainer-night-sport-guard-casting-cleaning-pressing-2', 'retainer-night-sport-guard', 'casting-cleaning-pressing', 'Vacuum-pressing impression', 'كبس القياس على الفاكيوم', 2, now(), now()),
('seed-retainer-night-sport-guard-trimming-finishing-0', 'retainer-night-sport-guard', 'trimming-finishing', 'Trimming & finishing', 'القص والفينيشينج', 0, now(), now()),
('seed-retainer-night-sport-guard-packaging-delivery-0', 'retainer-night-sport-guard', 'packaging-delivery', 'Packaging & delivery', 'التغليف والتسليم', 0, now(), now()),
('seed-bleaching-trays-received-0', 'bleaching-trays', 'received', 'Received', 'الاستلام', 0, now(), now()),
('seed-bleaching-trays-prep-pressing-0', 'bleaching-trays', 'prep-pressing', 'Cast impression (type4)', 'صب القياس (type4)', 0, now(), now()),
('seed-bleaching-trays-prep-pressing-1', 'bleaching-trays', 'prep-pressing', 'Cleaning edges', 'تنظيف الحواف', 1, now(), now()),
('seed-bleaching-trays-prep-pressing-2', 'bleaching-trays', 'prep-pressing', 'Making spacers', 'عمل السبيسرز (Spacers)', 2, now(), now()),
('seed-bleaching-trays-prep-pressing-3', 'bleaching-trays', 'prep-pressing', 'Vacuum-pressing', 'الكبس على الفاكيوم', 3, now(), now()),
('seed-bleaching-trays-finishing-0', 'bleaching-trays', 'finishing', 'Finishing', 'الفينيشينج', 0, now(), now()),
('seed-bleaching-trays-packaging-delivery-0', 'bleaching-trays', 'packaging-delivery', 'Packaging & delivery', 'التغليف والتسليم', 0, now(), now()),
('seed-digital-cases-digital-file-received-0', 'digital-cases', 'digital-file-received', 'Digital File Received', 'استلام الملف الرقمي', 0, now(), now()),
('seed-digital-cases-resin-model-0', 'digital-cases', 'resin-model', 'Making full resin model', 'عمل موديل كامل من الريزن', 0, now(), now()),
('seed-digital-cases-try-in-0', 'digital-cases', 'try-in', 'Doing a try-in', 'عمل بروفا (Try-in)', 0, now(), now()),
('seed-digital-cases-cad-cam-0', 'digital-cases', 'cad-cam', 'CAD design', 'مرحلة التصميم (CAD)', 0, now(), now()),
('seed-digital-cases-cad-cam-1', 'digital-cases', 'cad-cam', 'Milling/laser (CAM)', 'خراطة/ليزر (CAM)', 1, now(), now()),
('seed-digital-cases-finishing-0', 'digital-cases', 'finishing', 'Finishing', 'الفينيشينج', 0, now(), now()),
('seed-digital-cases-stain-glaze-0', 'digital-cases', 'stain-glaze', 'Stain & Glaze', 'Stain & Glaze', 0, now(), now()),
('seed-digital-cases-packaging-delivery-0', 'digital-cases', 'packaging-delivery', 'Packaging & delivery', 'التغليف والتسليم', 0, now(), now());

-- Carry over previously-saved custom chips (from the old step_suggestions table).
-- labelEn = labelAr = the stored title; appended after the built-in steps. Skip any
-- whose English label already exists as a built-in step for the same stage.
INSERT INTO "stage_quick_add_steps" ("id", "collection_id", "stage_id", "label_en", "label_ar", "order", "created_at", "updated_at")
SELECT
    'sugg-' || s."id",
    s."collection_id",
    s."stage_id",
    s."title",
    s."title",
    100 + (row_number() OVER (PARTITION BY s."collection_id", s."stage_id" ORDER BY s."created_at"))::int,
    s."created_at",
    now()
FROM "step_suggestions" s
WHERE NOT EXISTS (
    SELECT 1 FROM "stage_quick_add_steps" q
    WHERE q."collection_id" = s."collection_id"
      AND q."stage_id" = s."stage_id"
      AND q."label_en" = s."title"
);

-- The old suggestions table is superseded by stage_quick_add_steps.
DROP TABLE "step_suggestions";
