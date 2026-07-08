// AG Dental Lab — production-template collections, stages and quick-add steps.
//
// This is the single source of truth for a case's lifecycle. A case selects a
// Collection and moves through that collection's ordered Stages; each stage
// carries a bilingual (EN/AR) label and its own list of bilingual quick-add
// steps. Stages the lab doesn't need for a given case can be hidden per-case.
//
// Stage `id`s are STABLE identifiers persisted on the case (currentStageId,
// hiddenStageIds) and on images (CaseImage.stageId). Never change an existing
// id — renaming the en/ar labels is safe, changing an id orphans stored data.
// Ids only need to be unique WITHIN a collection.
//
// The admin panel stays English/LTR (see lib/i18n/config.ts `isLocalizedPath`),
// so this file is intentionally NOT wired into the t()/useI18n system; the Arabic
// label lives here so the public tracker (which IS localized) and the bilingual
// quick-add chips can render it directly.
//
// Follows the same static-config pattern as `case-types.ts`.

import type { Locale } from "@/lib/i18n/config";

export interface TemplateStep {
  /** English label (shown first — admin is LTR). */
  en: string;
  /** Arabic label. */
  ar: string;
}

export interface TemplateStage {
  /** Stable id, unique within the collection. Persisted on cases/images. */
  id: string;
  en: string;
  ar: string;
  /** Ordered quick-add steps offered when this stage is the case's current one. */
  steps: readonly TemplateStep[];
}

export interface ProductionCollection {
  /** Stable, kebab-case identifier. Persisted as PatientCase.collectionId. */
  id: string;
  en: string;
  ar: string;
  stages: readonly TemplateStage[];
}

export const PRODUCTION_COLLECTIONS = [
  {
    id: "zirconia-crown-bridge",
    en: "Zirconia Crown & Bridge",
    ar: "زركون — تاج / جسر",
    stages: [
      {
        id: "received",
        en: "Received",
        ar: "الاستلام",
        steps: [{ en: "Received", ar: "الاستلام" }],
      },
      {
        id: "casting-prep",
        en: "Casting & Preparation",
        ar: "الصب والتجهيز",
        steps: [
          { en: "Cast impression (type4)", ar: "صب القياس (type4)" },
          { en: "Dowel Pin", ar: "Dowel Pin" },
          { en: "Cast type3", ar: "صب type3" },
          {
            en: "Mounting analogs & trimming model",
            ar: "تركيب المطابق وقص الموديل",
          },
          { en: "Sawing & preparing model", ar: "نشر الموديل وتجهيزه" },
        ],
      },
      {
        id: "cad-cam",
        en: "CAD & CAM",
        ar: "التصميم والخراطة",
        steps: [
          { en: "CAD design + try-in", ar: "مرحلة التصميم (CAD) + بروفا" },
          {
            en: "Block milling (CAM) + centering",
            ar: "خراطة البلوك (CAM) + centering",
          },
        ],
      },
      {
        id: "finishing",
        en: "Finishing",
        ar: "الفينيشينج",
        steps: [{ en: "Finishing", ar: "الفينيشينج" }],
      },
      {
        id: "stain-glaze",
        en: "Stain & Glaze",
        ar: "التلوين والتزجيج",
        steps: [{ en: "Stain & Glaze", ar: "Stain & Glaze" }],
      },
      {
        id: "packaging-delivery",
        en: "Packaging & Delivery",
        ar: "التغليف والتسليم",
        steps: [{ en: "Packaging & delivery", ar: "التغليف والتسليم" }],
      },
    ],
  },
  {
    id: "zirconia-on-implant",
    en: "Zirconia on Implant",
    ar: "زركون على زرعة",
    stages: [
      {
        id: "received",
        en: "Received",
        ar: "الاستلام",
        steps: [{ en: "Received", ar: "الاستلام" }],
      },
      {
        id: "casting-prep",
        en: "Casting & Preparation",
        ar: "الصب والتجهيز",
        steps: [
          {
            en: "Verifying parts & ordering lab analog from supplier",
            ar: "التأكد من القطع والتواصل مع الشركة وطلب lab analog",
          },
          { en: "Artificial gingiva", ar: "اللثة الصناعية" },
          { en: "Casting (type4/type3)", ar: "الصب (type4/type3)" },
          { en: "Ordering tie base/abutment", ar: "طلب tie base/abutment" },
          {
            en: "Preparing model & mounting analogs",
            ar: "تجهيز الموديل وتركيب المطابق",
          },
        ],
      },
      {
        id: "cad-cam",
        en: "CAD & CAM",
        ar: "التصميم والخراطة",
        steps: [
          { en: "CAD design + try-in", ar: "مرحلة التصميم (CAD) + بروفا" },
          { en: "Block milling (CAM)", ar: "خراطة البلوك (CAM)" },
        ],
      },
      {
        id: "finishing",
        en: "Finishing",
        ar: "الفينيشينج",
        steps: [{ en: "Finishing", ar: "الفينيشينج" }],
      },
      {
        id: "stain-glaze",
        en: "Stain & Glaze",
        ar: "التلوين والتزجيج",
        steps: [
          {
            en: "Stain & glaze + bonding teeth to implant",
            ar: "Stain & Glaze + إلصاق الأسنان بالزرعة",
          },
        ],
      },
      {
        id: "packaging-delivery",
        en: "Packaging & Delivery",
        ar: "التغليف والتسليم",
        steps: [{ en: "Packaging & delivery", ar: "التغليف والتسليم" }],
      },
    ],
  },
  {
    id: "metal-pfm-crown-bridge",
    en: "Metal / PFM Crown & Bridge",
    ar: "المعدن — تاج / جسر",
    stages: [
      {
        id: "received",
        en: "Received",
        ar: "الاستلام",
        steps: [{ en: "Received", ar: "الاستلام" }],
      },
      {
        id: "casting-prep",
        en: "Casting & Preparation",
        ar: "الصب والتجهيز",
        steps: [
          { en: "Cast impression (type4)", ar: "صب القياس (type4)" },
          { en: "Dowel Pin", ar: "Dowel Pin" },
          { en: "Cast type3", ar: "صب type3" },
          {
            en: "Mounting analogs & trimming model",
            ar: "تركيب المطابق وقص الموديل",
          },
          { en: "Sawing model (3-6)", ar: "نشر الموديل (3-6)" },
        ],
      },
      {
        id: "cad-design",
        en: "CAD Design",
        ar: "التصميم (CAD)",
        steps: [{ en: "CAD design", ar: "مرحلة التصميم (CAD)" }],
      },
      {
        id: "try-in-digital",
        en: "Try-in (Digital Cases)",
        ar: "عمل بروفا للحالات الرقمية",
        steps: [
          {
            en: "Try-in — for digital cases",
            ar: "عمل بروفا (Try-in) — للحالات الرقمية",
          },
        ],
      },
      {
        id: "design-metal-laser",
        en: "Design & Metal Laser Fabrication",
        ar: "التصميم وتصنيع المعدن بالليزر",
        steps: [
          { en: "CAD design", ar: "مرحلة التصميم (CAD)" },
          { en: "Metal laser fabrication (7-8)", ar: "عمل المعدن بالليزر (7-8)" },
        ],
      },
      {
        id: "metal-finishing",
        en: "Metal Finishing",
        ar: "الفينيشينج",
        steps: [{ en: "Metal finishing", ar: "الفينيشينج للمعدن" }],
      },
      {
        id: "stain-glaze",
        en: "Stain & Glaze",
        ar: "التلوين والتزجيج",
        steps: [{ en: "Stain & Glaze", ar: "Stain & Glaze" }],
      },
      {
        id: "packaging-delivery",
        en: "Packaging & Delivery",
        ar: "التغليف والتسليم",
        steps: [{ en: "Packaging & delivery", ar: "التغليف والتسليم" }],
      },
    ],
  },
  {
    id: "veneer",
    en: "Veneer",
    ar: "الفينير",
    stages: [
      {
        id: "received",
        en: "Received",
        ar: "الاستلام",
        steps: [{ en: "Received", ar: "الاستلام" }],
      },
      {
        id: "casting-prep",
        en: "Casting & Preparation",
        ar: "الصب والتجهيز",
        steps: [
          {
            en: "Receiving impression & casting",
            ar: "استلام الطبعة وصب القياس",
          },
          { en: "Preparing model", ar: "تجهيز الموديل" },
        ],
      },
      {
        id: "cad-cam",
        en: "CAD & CAM",
        ar: "التصميم والكبس",
        steps: [
          { en: "CAD design", ar: "مرحلة التصميم (CAD)" },
          { en: "Waxing & casting rings", ar: "تشميع وصب الرينجات" },
          { en: "Pressing block (ingot)", ar: "كبس البلوك (ingot)" },
        ],
      },
      {
        id: "divesting-cleaning",
        en: "Divesting & Cleaning",
        ar: "الرش والتنظيف",
        steps: [{ en: "Divesting & cleaning", ar: "رش وتنظيف" }],
      },
      {
        id: "fitting-finishing",
        en: "Fitting & Finishing",
        ar: "التقعيد والفينيشينج",
        steps: [
          { en: "Fitting & finishing", ar: "تقعيد وفينيشينج" },
          { en: "Stain & glaze", ar: "stain & glaze" },
        ],
      },
      {
        id: "packaging-delivery",
        en: "Packaging & Delivery",
        ar: "التغليف والتسليم",
        steps: [{ en: "Packaging & delivery", ar: "التغليف والتسليم" }],
      },
    ],
  },
  {
    id: "retainer-night-sport-guard",
    en: "Retainer / Night & Sport Guard",
    ar: "ريتينر / Night Guard / Sport Guard",
    stages: [
      {
        id: "received",
        en: "Received",
        ar: "الاستلام",
        steps: [{ en: "Received", ar: "الاستلام" }],
      },
      {
        id: "casting-cleaning-pressing",
        en: "Casting, Cleaning & Pressing",
        ar: "الصب والتنظيف وكبس القياس",
        steps: [
          { en: "Cast impression (type4)", ar: "صب القياس (type4)" },
          { en: "Cleaning edges & preparation", ar: "تنظيف الحواف والتجهيز" },
          { en: "Vacuum-pressing impression", ar: "كبس القياس على الفاكيوم" },
        ],
      },
      {
        id: "trimming-finishing",
        en: "Trimming & Finishing",
        ar: "القص والفينيشينج",
        steps: [{ en: "Trimming & finishing", ar: "القص والفينيشينج" }],
      },
      {
        id: "packaging-delivery",
        en: "Packaging & Delivery",
        ar: "التغليف والتسليم",
        steps: [{ en: "Packaging & delivery", ar: "التغليف والتسليم" }],
      },
    ],
  },
  {
    id: "bleaching-trays",
    en: "Bleaching Trays",
    ar: "قوالب التبييض",
    stages: [
      {
        id: "received",
        en: "Received",
        ar: "الاستلام",
        steps: [{ en: "Received", ar: "الاستلام" }],
      },
      {
        id: "prep-pressing",
        en: "Preparation & Pressing",
        ar: "التجهيز والكبس",
        steps: [
          { en: "Cast impression (type4)", ar: "صب القياس (type4)" },
          { en: "Cleaning edges", ar: "تنظيف الحواف" },
          { en: "Making spacers", ar: "عمل السبيسرز (Spacers)" },
          { en: "Vacuum-pressing", ar: "الكبس على الفاكيوم" },
        ],
      },
      {
        id: "finishing",
        en: "Finishing",
        ar: "الفينيشينج",
        steps: [{ en: "Finishing", ar: "الفينيشينج" }],
      },
      {
        id: "packaging-delivery",
        en: "Packaging & Delivery",
        ar: "التغليف والتسليم",
        steps: [{ en: "Packaging & delivery", ar: "التغليف والتسليم" }],
      },
    ],
  },
  {
    id: "digital-cases",
    en: "Digital Cases (Intraoral Scan)",
    ar: "الحالات الرقمية",
    stages: [
      {
        id: "digital-file-received",
        en: "Digital File Received",
        ar: "استلام الملف الرقمي",
        steps: [{ en: "Digital File Received", ar: "استلام الملف الرقمي" }],
      },
      {
        id: "resin-model",
        en: "Resin Model",
        ar: "عمل موديل الريزن",
        steps: [{ en: "Making full resin model", ar: "عمل موديل كامل من الريزن" }],
      },
      {
        id: "try-in",
        en: "Try-in",
        ar: "البروفا",
        steps: [{ en: "Doing a try-in", ar: "عمل بروفا (Try-in)" }],
      },
      {
        id: "cad-cam",
        en: "CAD & CAM",
        ar: "التصميم والخراطة",
        steps: [
          { en: "CAD design", ar: "مرحلة التصميم (CAD)" },
          { en: "Milling/laser (CAM)", ar: "خراطة/ليزر (CAM)" },
        ],
      },
      {
        id: "finishing",
        en: "Finishing",
        ar: "الفينيشينج",
        steps: [{ en: "Finishing", ar: "الفينيشينج" }],
      },
      {
        id: "stain-glaze",
        en: "Stain & Glaze",
        ar: "التلوين والتزجيج",
        steps: [{ en: "Stain & Glaze", ar: "Stain & Glaze" }],
      },
      {
        id: "packaging-delivery",
        en: "Packaging & Delivery",
        ar: "التغليف والتسليم",
        steps: [{ en: "Packaging & delivery", ar: "التغليف والتسليم" }],
      },
    ],
  },
] as const satisfies ReadonlyArray<ProductionCollection>;

/** Ordered list of collection ids for building dropdowns. */
export const COLLECTION_ORDER = PRODUCTION_COLLECTIONS.map((c) => c.id);

/** Look up a collection by its id. */
export function getProductionCollection(id: string | null | undefined) {
  return id ? PRODUCTION_COLLECTIONS.find((c) => c.id === id) : undefined;
}

/** Find a stage (and its index) within a collection. */
export function getStage(
  collectionId: string | null | undefined,
  stageId: string | null | undefined,
) {
  const collection = getProductionCollection(collectionId);
  if (!collection || !stageId) return undefined;
  const index = collection.stages.findIndex((s) => s.id === stageId);
  const stage = index === -1 ? undefined : collection.stages[index];
  return stage ? { stage, index } : undefined;
}

/** The stages that should be shown for a case (collection order minus hidden). */
export function getVisibleStages(
  collectionId: string | null | undefined,
  hiddenStageIds: readonly string[] = [],
): TemplateStage[] {
  const collection = getProductionCollection(collectionId);
  if (!collection) return [];
  const hidden = new Set(hiddenStageIds);
  return collection.stages.filter((s) => !hidden.has(s.id));
}

/** First stage id of a collection (used as the default current stage). */
export function firstStageId(collectionId: string | null | undefined) {
  return getProductionCollection(collectionId)?.stages[0]?.id ?? null;
}

/**
 * A case is "completed" when its current stage is the LAST visible stage of its
 * collection. No collection or no current stage → not completed.
 */
export function computeIsCompleted(
  collectionId: string | null | undefined,
  currentStageId: string | null | undefined,
  hiddenStageIds: readonly string[] = [],
): boolean {
  if (!collectionId || !currentStageId) return false;
  const visible = getVisibleStages(collectionId, hiddenStageIds);
  const last = visible[visible.length - 1];
  return !!last && last.id === currentStageId;
}

export interface NormalizedLifecycle {
  collectionId: string | null;
  currentStageId: string | null;
  hiddenStageIds: string[];
  isCompleted: boolean;
}

/**
 * Validate + normalize a case's lifecycle selection against the config, so bad
 * or stale ids can never be persisted:
 *  - unknown collection → everything cleared
 *  - stage not in the collection → current stage cleared
 *  - hidden ids filtered to real stages, and the current stage is never hidden
 *  - isCompleted recomputed from the result
 */
export function normalizeLifecycle(
  collectionId: string | null | undefined,
  currentStageId: string | null | undefined,
  hiddenStageIds: readonly string[] | null | undefined,
): NormalizedLifecycle {
  const collection = getProductionCollection(collectionId);
  if (!collection) {
    return {
      collectionId: null,
      currentStageId: null,
      hiddenStageIds: [],
      isCompleted: false,
    };
  }
  const valid = new Set<string>(collection.stages.map((s) => s.id));
  const stage = currentStageId && valid.has(currentStageId) ? currentStageId : null;
  const hidden = (hiddenStageIds ?? []).filter(
    // keep only real stage ids, and never hide the current stage
    (id) => valid.has(id) && id !== stage,
  );
  return {
    collectionId: collection.id,
    currentStageId: stage,
    hiddenStageIds: Array.from(new Set(hidden)),
    isCompleted: computeIsCompleted(collection.id, stage, hidden),
  };
}

/** Localized label for a stage/step in the given locale (defaults to English). */
export function localizedLabel(
  item: { en: string; ar: string },
  locale: Locale = "en",
) {
  return locale === "ar" ? item.ar : item.en;
}

/**
 * Combined bilingual label ("English / Arabic") used both for the quick-add chip
 * text and for the stored CaseProgress.stepTitle — CaseProgress has no bilingual
 * field, so combining keeps the full info without a schema change.
 */
export function bilingualLabel({ en, ar }: TemplateStep | TemplateStage) {
  return en === ar ? en : `${en} / ${ar}`;
}
