-- Admin-extensible reusable Quick-Add step titles, scoped to a (collection, stage).
-- Populated when an admin adds a custom production step under a stage, so the
-- title becomes a reusable chip for that stage across all cases of the collection.

CREATE TABLE "step_suggestions" (
    "id" TEXT NOT NULL,
    "collection_id" TEXT NOT NULL,
    "stage_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "step_suggestions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "step_suggestions_collection_id_stage_id_title_key" ON "step_suggestions"("collection_id", "stage_id", "title");

CREATE INDEX "step_suggestions_collection_id_idx" ON "step_suggestions"("collection_id");
