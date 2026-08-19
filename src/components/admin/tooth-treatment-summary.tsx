"use client";

import * as React from "react";
import { Layers } from "lucide-react";
import { useAdminI18n } from "@/components/i18n/admin-i18n";
import { useCaseTaxonomy } from "@/hooks/use-case-taxonomy";
import { compareTeeth } from "@/lib/teeth";
import type { ToothItemDTO } from "@/types/case";

/**
 * READ-ONLY per-tooth treatment plan for the case detail page.
 *
 * Renders `toothItems` exactly as the server sent them and mutates nothing.
 *
 * LEGACY CASES have no tooth items. Rather than render an empty box, the
 * fallback shows the single category/caseType pair the case was actually
 * created with, labelled as such — the information is old, not missing, and
 * silently blanking it would look like data loss.
 */
export function ToothTreatmentSummary({
  toothItems,
  legacyCategory,
  legacyCaseType,
}: {
  toothItems: ToothItemDTO[];
  legacyCategory: string;
  legacyCaseType: string;
}) {
  const { t, locale } = useAdminI18n();
  const { data: taxonomy } = useCaseTaxonomy();

  const categoryLabel = React.useCallback(
    (key: string) => {
      const found = taxonomy?.categories.find((c) => c.category === key);
      if (!found) return key;
      return locale === "ar" ? found.labelAr : found.labelEn;
    },
    [taxonomy, locale],
  );

  // Anatomical order (1→32) regardless of the order the admin picked them, so
  // the same plan always reads the same way.
  const ordered = React.useMemo(
    () => [...toothItems].sort((a, b) => compareTeeth(a.toothNumber, b.toothNumber)),
    [toothItems],
  );

  if (ordered.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("tooth.legacyTitle")}
        </p>
        <p className="mt-1.5 font-medium text-ink">
          {t("tooth.legacyPair", {
            category: categoryLabel(legacyCategory),
            caseType: legacyCaseType,
          })}
        </p>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {t("tooth.legacyBody")}
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Layers className="h-3.5 w-3.5" /> {t("tooth.treatmentPlan")}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {ordered.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 rounded-xl border border-border bg-card p-3"
          >
            <span
              dir="ltr"
              className="inline-flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 px-2 text-sm font-bold text-white dark:bg-brand-500 dark:text-brand-950"
            >
              {item.toothNumber}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t("tooth.toothNumber", { number: item.toothNumber })}
              </p>
              <ul className="mt-1 space-y-0.5">
                {item.entries.map((entry) => (
                  <li key={entry.id} className="text-sm text-ink">
                    <span className="font-medium">{entry.caseType}</span>
                    <span className="text-muted-foreground">
                      {" · "}
                      {categoryLabel(entry.category)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
