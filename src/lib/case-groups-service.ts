import { prisma } from "@/lib/prisma";
import type {
  CaseGroupNode,
  CaseGroupTree,
  StageInUseBreakdown,
} from "@/types/case-groups";

/**
 * Full group -> stage-set -> stage tree for the admin management page, with live
 * usage annotations so the UI can pre-disable destructive actions:
 *   - per stage: inUse breakdown (current stage / hidden / progress / images)
 *   - per stage-set: caseCount (live cases whose collectionId == set.id)
 *
 * Computed in 4 queries total (tree + cases + progress + images) and joined in
 * memory — no per-stage query fan-out.
 */
export async function buildCaseGroupTree(): Promise<CaseGroupTree> {
  const [groups, cases, progress, images] = await Promise.all([
    prisma.caseGroup.findMany({
      orderBy: { order: "asc" },
      include: {
        stageSets: {
          orderBy: [{ type: "asc" }, { order: "asc" }],
          include: { stages: { orderBy: { order: "asc" } } },
        },
      },
    }),
    prisma.patientCase.findMany({
      select: { collectionId: true, currentStageId: true, hiddenStageIds: true },
    }),
    prisma.caseProgress.findMany({
      where: { stageId: { not: null } },
      select: { stageId: true, case: { select: { collectionId: true } } },
    }),
    prisma.caseImage.findMany({
      where: { stageId: { not: null } },
      select: { stageId: true, case: { select: { collectionId: true } } },
    }),
  ]);

  // Key by `${collectionId}::${stageKey}` → per-reference counts.
  type Counts = { current: number; hidden: number; progress: number; images: number };
  const useMap = new Map<string, Counts>();
  const bump = (
    collectionId: string | null,
    stageKey: string | null,
    field: keyof Counts,
  ) => {
    if (!collectionId || !stageKey) return;
    const k = `${collectionId}::${stageKey}`;
    const e = useMap.get(k) ?? { current: 0, hidden: 0, progress: 0, images: 0 };
    e[field] += 1;
    useMap.set(k, e);
  };

  const caseCountBySet = new Map<string, number>();
  for (const c of cases) {
    if (c.collectionId) {
      caseCountBySet.set(c.collectionId, (caseCountBySet.get(c.collectionId) ?? 0) + 1);
    }
    bump(c.collectionId, c.currentStageId, "current");
    for (const h of c.hiddenStageIds) bump(c.collectionId, h, "hidden");
  }
  for (const p of progress) bump(p.case.collectionId, p.stageId, "progress");
  for (const i of images) bump(i.case.collectionId, i.stageId, "images");

  const nodes: CaseGroupNode[] = groups.map((g) => ({
    id: g.id,
    labelEn: g.labelEn,
    labelAr: g.labelAr,
    order: g.order,
    stageSets: g.stageSets.map((s) => ({
      id: s.id,
      type: s.type,
      labelEn: s.labelEn,
      labelAr: s.labelAr,
      order: s.order,
      caseCount: caseCountBySet.get(s.id) ?? 0,
      stages: s.stages.map((st) => {
        const c = useMap.get(`${s.id}::${st.stageKey}`);
        const inUseCount = c ? c.current + c.hidden + c.progress + c.images : 0;
        return {
          id: st.id,
          stageKey: st.stageKey,
          labelEn: st.labelEn,
          labelAr: st.labelAr,
          order: st.order,
          inUseCount,
        };
      }),
    })),
  }));

  return { groups: nodes };
}

/**
 * Exact live-usage breakdown for ONE stage, used by the delete guard. Scoped by
 * collectionId (= the stage's set id) AND stageKey, so repeated keys like
 * "received" across sets never false-match. All four refs block deletion.
 */
export async function stageInUseBreakdown(
  stageSetId: string,
  stageKey: string,
): Promise<StageInUseBreakdown> {
  const [current, hidden, progress, images] = await Promise.all([
    prisma.patientCase.count({
      where: { collectionId: stageSetId, currentStageId: stageKey },
    }),
    prisma.patientCase.count({
      where: { collectionId: stageSetId, hiddenStageIds: { has: stageKey } },
    }),
    prisma.caseProgress.count({
      where: { stageId: stageKey, case: { collectionId: stageSetId } },
    }),
    prisma.caseImage.count({
      where: { stageId: stageKey, case: { collectionId: stageSetId } },
    }),
  ]);
  return { current, hidden, progress, images, total: current + hidden + progress + images };
}

/** Live cases whose collectionId points at this stage-set (blocks set deletion). */
export async function stageSetCaseCount(stageSetId: string): Promise<number> {
  return prisma.patientCase.count({ where: { collectionId: stageSetId } });
}
