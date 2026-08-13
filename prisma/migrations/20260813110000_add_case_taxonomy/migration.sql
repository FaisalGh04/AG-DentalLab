-- Keep the existing CaseCategory enum stable. Editable labels and type choices
-- live in additive tables; PatientCase.case_type remains a historical snapshot.
CREATE TABLE "case_category_configs" (
    "category" "CaseCategory" NOT NULL,
    "label_en" TEXT NOT NULL,
    "label_ar" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "case_category_configs_pkey" PRIMARY KEY ("category")
);

CREATE TABLE "case_type_options" (
    "id" TEXT NOT NULL,
    "category" "CaseCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "case_type_options_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "case_category_configs_order_idx"
    ON "case_category_configs"("order");
CREATE UNIQUE INDEX "case_type_options_category_name_key"
    ON "case_type_options"("category", "name");
CREATE INDEX "case_type_options_category_is_active_order_idx"
    ON "case_type_options"("category", "is_active", "order");
ALTER TABLE "case_type_options"
    ADD CONSTRAINT "case_type_options_category_fkey"
    FOREIGN KEY ("category") REFERENCES "case_category_configs"("category")
    ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "case_category_configs"
    ("category", "label_en", "label_ar", "order", "updated_at")
VALUES
    ('IMPLANT', 'Implant', 'زراعة', 0, CURRENT_TIMESTAMP),
    ('C_AND_B', 'C&B', 'تيجان وجسور', 1, CURRENT_TIMESTAMP),
    ('PRESSABLE_CERAMIC', 'Pressable Ceramic', 'سيراميك مضغوط', 2, CURRENT_TIMESTAMP),
    ('VACUUM_FORMER', 'Vacuum Former', 'تشكيل بالتفريغ', 3, CURRENT_TIMESTAMP),
    ('SPECIAL_TRAY', 'Special Tray', 'ملعقة خاصة', 4, CURRENT_TIMESTAMP),
    ('RESIN_MODEL', 'Resin Model', 'نموذج راتنجي', 5, CURRENT_TIMESTAMP),
    ('EXTERNAL_LABORATORY_SERVICES', 'External Laboratory Services', 'خدمات مخبرية خارجية', 6, CURRENT_TIMESTAMP),
    ('DENTAL_EQUIPMENT', 'Dental Equipment', 'معدات الأسنان', 7, CURRENT_TIMESTAMP),
    ('GYPSUM_MODEL', 'Gypsum Model', 'نموذج جبسي', 8, CURRENT_TIMESTAMP),
    ('FLEX_DENTURE', 'Flex. Denture', 'طقم مرن', 9, CURRENT_TIMESTAMP);

INSERT INTO "case_type_options"
    ("id", "category", "name", "order", "updated_at")
VALUES
    ('cto_implant_00', 'IMPLANT', 'Ivoclar Prime ZSR', 0, CURRENT_TIMESTAMP),
    ('cto_implant_01', 'IMPLANT', 'Ivoclar Prime ZCR', 1, CURRENT_TIMESTAMP),
    ('cto_implant_02', 'IMPLANT', 'Ivoclar Prime FZSR', 2, CURRENT_TIMESTAMP),
    ('cto_implant_03', 'IMPLANT', 'Ivoclar Prime FZCR', 3, CURRENT_TIMESTAMP),
    ('cto_implant_04', 'IMPLANT', 'Ivoclar Prime PZSR', 4, CURRENT_TIMESTAMP),
    ('cto_implant_05', 'IMPLANT', 'Ivoclar Prime PZCR', 5, CURRENT_TIMESTAMP),
    ('cto_implant_06', 'IMPLANT', 'Laser NF SR', 6, CURRENT_TIMESTAMP),
    ('cto_implant_07', 'IMPLANT', 'Laser NF CR', 7, CURRENT_TIMESTAMP),
    ('cto_implant_08', 'IMPLANT', 'Laser NF FSR', 8, CURRENT_TIMESTAMP),
    ('cto_implant_09', 'IMPLANT', 'Laser NF FCR', 9, CURRENT_TIMESTAMP),
    ('cto_implant_10', 'IMPLANT', 'PMMA SR/CR', 10, CURRENT_TIMESTAMP),
    ('cto_implant_11', 'IMPLANT', 'PMMA FSR/FCR', 11, CURRENT_TIMESTAMP),
    ('cto_implant_12', 'IMPLANT', 'G-CAM SR/CR', 12, CURRENT_TIMESTAMP),
    ('cto_implant_13', 'IMPLANT', 'G-CAM FSR/FCR', 13, CURRENT_TIMESTAMP),
    ('cto_implant_14', 'IMPLANT', 'Titanium Bar System', 14, CURRENT_TIMESTAMP),
    ('cto_implant_15', 'IMPLANT', 'Resin Try In SR', 15, CURRENT_TIMESTAMP),
    ('cto_implant_16', 'IMPLANT', 'Resin Try In CR', 16, CURRENT_TIMESTAMP),
    ('cto_implant_17', 'IMPLANT', 'Resin Bar SR', 17, CURRENT_TIMESTAMP),
    ('cto_implant_18', 'IMPLANT', 'ZSR', 18, CURRENT_TIMESTAMP),
    ('cto_implant_19', 'IMPLANT', 'ZCR', 19, CURRENT_TIMESTAMP),
    ('cto_implant_20', 'IMPLANT', 'ZIR/CH/SR', 20, CURRENT_TIMESTAMP),
    ('cto_implant_21', 'IMPLANT', 'ZIR/CH/CR', 21, CURRENT_TIMESTAMP),
    ('cto_implant_22', 'IMPLANT', 'Custom Abutment', 22, CURRENT_TIMESTAMP),
    ('cto_implant_23', 'IMPLANT', 'Ni Free Bar', 23, CURRENT_TIMESTAMP),
    ('cto_implant_24', 'IMPLANT', 'Acrylic NG', 24, CURRENT_TIMESTAMP),
    ('cto_implant_25', 'IMPLANT', 'Surgical Guides', 25, CURRENT_TIMESTAMP),
    ('cto_implant_26', 'IMPLANT', 'Zir', 26, CURRENT_TIMESTAMP);

INSERT INTO "case_type_options"
    ("id", "category", "name", "order", "updated_at")
VALUES
    ('cto_cb_00', 'C_AND_B', 'Ivoclar Prime ZiR', 0, CURRENT_TIMESTAMP),
    ('cto_cb_01', 'C_AND_B', 'Ivoclar Prime PZIR', 1, CURRENT_TIMESTAMP),
    ('cto_cb_02', 'C_AND_B', 'Laser NF', 2, CURRENT_TIMESTAMP),
    ('cto_cb_03', 'C_AND_B', 'Acrylic Temporary', 3, CURRENT_TIMESTAMP),
    ('cto_cb_04', 'C_AND_B', 'Printed Resin', 4, CURRENT_TIMESTAMP),
    ('cto_cb_05', 'C_AND_B', 'PMMA Milled', 5, CURRENT_TIMESTAMP),
    ('cto_cb_06', 'C_AND_B', 'G-CAM', 6, CURRENT_TIMESTAMP),
    ('cto_cb_07', 'C_AND_B', 'Maryland Zirkon Bridge', 7, CURRENT_TIMESTAMP),
    ('cto_cb_08', 'C_AND_B', 'Maryland Bridge Laser NF W/Cer', 8, CURRENT_TIMESTAMP),
    ('cto_cb_09', 'C_AND_B', 'ZIR Post Core', 9, CURRENT_TIMESTAMP),
    ('cto_cb_10', 'C_AND_B', 'Metal Post Core', 10, CURRENT_TIMESTAMP),
    ('cto_cb_11', 'C_AND_B', 'Metal Try In', 11, CURRENT_TIMESTAMP),
    ('cto_cb_12', 'C_AND_B', 'Resin Try In', 12, CURRENT_TIMESTAMP),
    ('cto_cb_13', 'C_AND_B', 'Temp. Printed Resin', 13, CURRENT_TIMESTAMP),
    ('cto_cb_14', 'C_AND_B', 'ZIR/CH', 14, CURRENT_TIMESTAMP),
    ('cto_cb_15', 'C_AND_B', 'Laser NICr', 15, CURRENT_TIMESTAMP);

INSERT INTO "case_type_options"
    ("id", "category", "name", "order", "updated_at")
VALUES
    ('cto_press_00', 'PRESSABLE_CERAMIC', 'E-max Onlay', 0, CURRENT_TIMESTAMP),
    ('cto_press_01', 'PRESSABLE_CERAMIC', 'E-max Inlay', 1, CURRENT_TIMESTAMP),
    ('cto_press_02', 'PRESSABLE_CERAMIC', 'E-max Veneer', 2, CURRENT_TIMESTAMP),
    ('cto_press_03', 'PRESSABLE_CERAMIC', 'E-max Crown', 3, CURRENT_TIMESTAMP);

INSERT INTO "case_type_options"
    ("id", "category", "name", "order", "updated_at")
VALUES
    ('cto_vacuum_00', 'VACUUM_FORMER', 'Night Guard 2mm', 0, CURRENT_TIMESTAMP),
    ('cto_vacuum_01', 'VACUUM_FORMER', 'Night Guard 1.5mm', 1, CURRENT_TIMESTAMP),
    ('cto_vacuum_02', 'VACUUM_FORMER', 'Retainer Crystal Plate 1mm', 2, CURRENT_TIMESTAMP),
    ('cto_vacuum_03', 'VACUUM_FORMER', 'Retainer Crystal Plate 1.5mm', 3, CURRENT_TIMESTAMP),
    ('cto_vacuum_04', 'VACUUM_FORMER', 'Mouth Guard 3.5mm', 4, CURRENT_TIMESTAMP),
    ('cto_vacuum_05', 'VACUUM_FORMER', 'Sport Guard 5mm', 5, CURRENT_TIMESTAMP),
    ('cto_vacuum_06', 'VACUUM_FORMER', 'Bleaching Tray', 6, CURRENT_TIMESTAMP),
    ('cto_vacuum_07', 'VACUUM_FORMER', 'Hard NG 2mm', 7, CURRENT_TIMESTAMP);

INSERT INTO "case_type_options"
    ("id", "category", "name", "order", "updated_at")
VALUES
    ('cto_tray_00', 'SPECIAL_TRAY', 'Light Cure Plate', 0, CURRENT_TIMESTAMP);

INSERT INTO "case_type_options"
    ("id", "category", "name", "order", "updated_at")
VALUES
    ('cto_resin_00', 'RESIN_MODEL', '1/4 Arch Model', 0, CURRENT_TIMESTAMP),
    ('cto_resin_01', 'RESIN_MODEL', '1/2 Arch Model', 1, CURRENT_TIMESTAMP),
    ('cto_resin_02', 'RESIN_MODEL', 'Full Arch Model', 2, CURRENT_TIMESTAMP),
    ('cto_resin_03', 'RESIN_MODEL', 'Special Tray', 3, CURRENT_TIMESTAMP),
    ('cto_resin_04', 'RESIN_MODEL', 'Full Arch Jig Trial', 4, CURRENT_TIMESTAMP);

INSERT INTO "case_type_options"
    ("id", "category", "name", "order", "updated_at")
VALUES
    ('cto_external_00', 'EXTERNAL_LABORATORY_SERVICES', 'Laser NF C&B', 0, CURRENT_TIMESTAMP),
    ('cto_external_01', 'EXTERNAL_LABORATORY_SERVICES', 'Laser NF / Implant', 1, CURRENT_TIMESTAMP),
    ('cto_external_02', 'EXTERNAL_LABORATORY_SERVICES', 'Zirkon Milled', 2, CURRENT_TIMESTAMP),
    ('cto_external_03', 'EXTERNAL_LABORATORY_SERVICES', 'Zirkon C&B', 3, CURRENT_TIMESTAMP),
    ('cto_external_04', 'EXTERNAL_LABORATORY_SERVICES', 'Titanium Bar System', 4, CURRENT_TIMESTAMP),
    ('cto_external_05', 'EXTERNAL_LABORATORY_SERVICES', 'PMMA Temp C&B', 5, CURRENT_TIMESTAMP);

INSERT INTO "case_type_options"
    ("id", "category", "name", "order", "updated_at")
VALUES
    ('cto_equipment_00', 'DENTAL_EQUIPMENT', 'Ivoclar Programat P310 Furnace', 0, CURRENT_TIMESTAMP),
    ('cto_equipment_01', 'DENTAL_EQUIPMENT', 'Ivoclar Programat EP 3010 Press Furnace', 1, CURRENT_TIMESTAMP),
    ('cto_equipment_02', 'DENTAL_EQUIPMENT', 'Optical 3D Scanner Vinyl', 2, CURRENT_TIMESTAMP),
    ('cto_equipment_03', 'DENTAL_EQUIPMENT', 'ASIGA MAX UV 3D Printer', 3, CURRENT_TIMESTAMP),
    ('cto_equipment_04', 'DENTAL_EQUIPMENT', 'Renfert Tripla Electric Welding Machine', 4, CURRENT_TIMESTAMP);

INSERT INTO "case_type_options"
    ("id", "category", "name", "order", "updated_at")
VALUES
    ('cto_gypsum_00', 'GYPSUM_MODEL', 'Study with Base', 0, CURRENT_TIMESTAMP),
    ('cto_gypsum_01', 'GYPSUM_MODEL', 'Study without Base', 1, CURRENT_TIMESTAMP);

INSERT INTO "case_type_options"
    ("id", "category", "name", "order", "updated_at")
VALUES
    ('cto_flex_00', 'FLEX_DENTURE', 'Full Denture U OR L', 0, CURRENT_TIMESTAMP),
    ('cto_flex_01', 'FLEX_DENTURE', 'Partial Denture', 1, CURRENT_TIMESTAMP);
