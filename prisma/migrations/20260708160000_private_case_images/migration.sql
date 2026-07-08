-- S-M3: case images are no longer served by a permanent public bucket URL.
-- We now sign the object `key` on demand (via /api/images/[id]), so the stored
-- public URL column is dropped and the key becomes required.
--
-- Safe: every existing row already has a non-null `key` (verified before the
-- migration). If any legacy row had a null key it would need a backfill first.

ALTER TABLE "case_images" ALTER COLUMN "key" SET NOT NULL;
ALTER TABLE "case_images" DROP COLUMN "image_url";
