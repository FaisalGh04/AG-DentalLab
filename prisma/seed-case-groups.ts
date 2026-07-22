/**
 * Phase 1 seed: mirror the static case lifecycle (src/lib/production-templates.ts)
 * into the DB-backed CaseGroup / CaseStageSet / CaseStage tables, PRESERVING every
 * id so live case data keeps resolving, then backfill StageQuickAddStep.caseStageId.
 * Run ONCE after the additive migration `20260722130000_add_case_group_tables`.
 *
 * Everything is derived from PRODUCTION_COLLECTIONS (the source of truth) — only the
 * group grouping + Digital/Regular type assignment is added here, per the approved
 * mapping:
 *   - each collection becomes a CaseStageSet with id = the legacy collection id
 *   - each stage becomes a CaseStage with stage_key = the legacy stage id
 *   - `digital-cases` folds under the Zirconia C&B group as its DIGITAL set
 *   - every other collection is its group's REGULAR set
 *   - `try-in-digital` stays inside the Metal/PFM REGULAR set for now (its move to a
 *     Metal Digital set is Phase 4, not this faithful mirror)
 *
 * Idempotent: groups matched by labelEn, stage-sets by their (preserved) id, stages
 * by (stageSetId, stageKey); quick-add rows updated only where caseStageId IS NULL.
 * Re-running is a no-op once complete. Does NOT touch patient_cases / case_progress /
 * case_images, and does not change any app behavior.
 *
 * Run once:  npx tsx prisma/seed-case-groups.ts   (or: npm run db:seed-case-groups)
 */
import { PrismaClient, type CaseWorkflowType } from "@prisma/client";
import { PRODUCTION_COLLECTIONS } from "../src/lib/production-templates";

const prisma = new PrismaClient();

// The 6 groups, in display order. Labels are the approved group names (EN) with the
// Arabic taken from the corresponding collection.
const GROUPS = [
  { key: "zirconia-cb", labelEn: "Zirconia Crown & Bridge", labelAr: "زركون — تاج / جسر" },
  { key: "implant", labelEn: "Zirconia on Implant", labelAr: "زركون على زرعة" },
  { key: "metal-pfm", labelEn: "Metal / PFM Crown & Bridge", labelAr: "المعدن — تاج / جسر" },
  { key: "veneer", labelEn: "Veneer", labelAr: "الفينير" },
  {
    key: "retainer-guard",
    labelEn: "Retainer / Night & Sport Guard",
    labelAr: "ريتينر / Night Guard / Sport Guard",
  },
  { key: "bleaching", labelEn: "Bleaching Trays", labelAr: "قوالب التبييض" },
] as const;

// Legacy collection id -> which group it belongs to + its workflow type.
const SET_MAPPING: Record<string, { groupKey: string; type: CaseWorkflowType }> = {
  "zirconia-crown-bridge": { groupKey: "zirconia-cb", type: "REGULAR" },
  "digital-cases": { groupKey: "zirconia-cb", type: "DIGITAL" }, // folded per approval
  "zirconia-on-implant": { groupKey: "implant", type: "REGULAR" },
  "metal-pfm-crown-bridge": { groupKey: "metal-pfm", type: "REGULAR" },
  veneer: { groupKey: "veneer", type: "REGULAR" },
  "retainer-night-sport-guard": { groupKey: "retainer-guard", type: "REGULAR" },
  "bleaching-trays": { groupKey: "bleaching", type: "REGULAR" },
};

async function main() {
  // 1. Ensure the 6 groups (idempotent by labelEn), remembering key -> id.
  const groupIdByKey = new Map<string, string>();
  for (let i = 0; i < GROUPS.length; i++) {
    const g = GROUPS[i]!;
    let group = await prisma.caseGroup.findFirst({ where: { labelEn: g.labelEn } });
    if (!group) {
      group = await prisma.caseGroup.create({
        data: { labelEn: g.labelEn, labelAr: g.labelAr, order: i },
      });
      console.log(`  + group[${i}] "${g.labelEn}" (${group.id})`);
    } else {
      console.log(`  = group[${i}] "${g.labelEn}" exists (${group.id})`);
    }
    groupIdByKey.set(g.key, group.id);
  }

  // 2. Ensure stage-sets (id = legacy collection id) and their stages.
  let setsCreated = 0;
  let stagesCreated = 0;
  for (const collection of PRODUCTION_COLLECTIONS) {
    const mapping = SET_MAPPING[collection.id];
    if (!mapping) throw new Error(`No group mapping for collection "${collection.id}"`);
    const groupId = groupIdByKey.get(mapping.groupKey);
    if (!groupId) throw new Error(`No group for key "${mapping.groupKey}"`);

    let set = await prisma.caseStageSet.findUnique({ where: { id: collection.id } });
    if (!set) {
      // Append within its group (robust for partial re-runs).
      const order = await prisma.caseStageSet.count({ where: { groupId } });
      set = await prisma.caseStageSet.create({
        data: {
          id: collection.id, // PRESERVED — PatientCase.collection_id resolves to this
          groupId,
          type: mapping.type,
          labelEn: collection.en,
          labelAr: collection.ar,
          order,
        },
      });
      setsCreated++;
      console.log(`  + set "${collection.id}" -> ${mapping.groupKey}/${mapping.type}`);
    }

    for (let s = 0; s < collection.stages.length; s++) {
      const stage = collection.stages[s]!;
      const existing = await prisma.caseStage.findUnique({
        where: { stageSetId_stageKey: { stageSetId: set.id, stageKey: stage.id } },
      });
      if (!existing) {
        await prisma.caseStage.create({
          data: {
            stageSetId: set.id,
            stageKey: stage.id, // PRESERVED — case/progress/image stage_id resolves to this
            labelEn: stage.en,
            labelAr: stage.ar,
            order: s,
          },
        });
        stagesCreated++;
      }
    }
  }

  // 3. Backfill StageQuickAddStep.caseStageId by matching (collectionId, stageId) ->
  //    CaseStage (stageSetId = collectionId, stageKey = stageId). Only NULLs touched.
  let backfilled = 0;
  const stages = await prisma.caseStage.findMany({
    select: { id: true, stageSetId: true, stageKey: true },
  });
  for (const st of stages) {
    const res = await prisma.stageQuickAddStep.updateMany({
      where: { collectionId: st.stageSetId, stageId: st.stageKey, caseStageId: null },
      data: { caseStageId: st.id },
    });
    backfilled += res.count;
  }

  // 4. Report + assertions.
  const [groupCount, setCount, stageCount, totalChips, orphanChips] = await Promise.all([
    prisma.caseGroup.count(),
    prisma.caseStageSet.count(),
    prisma.caseStage.count(),
    prisma.stageQuickAddStep.count(),
    prisma.stageQuickAddStep.count({ where: { caseStageId: null } }),
  ]);

  console.log(
    `\n✔ groups=${groupCount} sets=${setCount} stages=${stageCount} ` +
      `(created this run: sets ${setsCreated}, stages ${stagesCreated}). ` +
      `quick-add chips: ${totalChips} total, backfilled ${backfilled} this run, ${orphanChips} still unlinked.`,
  );
  if (orphanChips > 0) {
    throw new Error(
      `${orphanChips} StageQuickAddStep row(s) did not match a CaseStage — investigate before proceeding.`,
    );
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
