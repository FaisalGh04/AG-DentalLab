"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { ToothChart } from "@/components/case/tooth-chart";
import type { Locale } from "@/lib/i18n/config";
import type { PublicToothItemDTO } from "@/types/case";
import { compareTeeth } from "@/lib/teeth";

/**
 * READ-ONLY tooth chart for the PUBLIC tracker.
 *
 * Renders `toothItems` exactly as the API sent them. Nothing here mutates, and
 * the only interaction is choosing which treated tooth to read about — the
 * chart itself never changes.
 *
 * PERFORMANCE. This runs on a public page on whatever phone a doctor happens to
 * hold, so every input to the chart is stabilised:
 *   - the geometry and all 32 crown paths are built once inside ToothChart
 *   - `selected` and the lookup map are memoised on `toothItems`
 *   - the label and click callbacks are useCallback'd
 * Selecting a tooth therefore re-renders one small card, not the chart. There
 * is no animation beyond the 150ms fill transition already in the chart, and no
 * WebGL — it is the same static SVG the admin panel uses.
 */
export function TrackToothChart({
  toothItems,
  locale,
  t,
}: {
  toothItems: PublicToothItemDTO[];
  locale: Locale;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const [openTooth, setOpenTooth] = React.useState<number | null>(null);

  // Anatomical order (1→32) so the same plan always reads the same way.
  const ordered = React.useMemo(
    () =>
      [...toothItems].sort((a, b) => compareTeeth(a.toothNumber, b.toothNumber)),
    [toothItems],
  );
  const treatedNumbers = React.useMemo(
    () => ordered.map((item) => item.toothNumber),
    [ordered],
  );
  const byNumber = React.useMemo(
    () => new Map(ordered.map((item) => [item.toothNumber, item])),
    [ordered],
  );

  const toothLabel = React.useCallback(
    (n: number) => {
      const count = byNumber.get(n)?.entries.length ?? 0;
      // Three separate strings rather than one with a count: "1 treatments"
      // is wrong in English, and Arabic pluralisation does not follow the
      // English rule either.
      if (count === 0) return t("track.toothAriaNone", { number: n });
      if (count === 1) return t("track.toothAriaOne", { number: n });
      return t("track.toothAria", { number: n, count });
    },
    [byNumber, t],
  );

  // Idle teeth are inert on this chart, so this only ever fires for a treated
  // one; the guard keeps that true even if that ever changes.
  const handleTooth = React.useCallback(
    (n: number) => {
      if (!byNumber.has(n)) return;
      setOpenTooth((current) => (current === n ? null : n));
    },
    [byNumber],
  );

  // Legacy case: no plan was recorded. Say so briefly rather than render an
  // empty chart that looks like every tooth is untreated.
  if (ordered.length === 0) {
    return (
      <Card className="border-brand-400/20 bg-brand-950/55 p-6 text-cream">
        <h3 className="font-display text-lg font-semibold text-cream">
          {t("track.treatmentTeeth")}
        </h3>
        <p className="mt-2 text-sm text-brand-100/60">
          {t("track.noToothPlan")}
        </p>
      </Card>
    );
  }

  const open = openTooth !== null ? byNumber.get(openTooth) : undefined;

  return (
    <Card className="border-brand-400/20 bg-brand-950/55 p-6 text-cream">
      <h3 className="font-display text-lg font-semibold text-cream">
        {t("track.treatmentTeeth")}
      </h3>
      <p className="mt-1 text-sm text-brand-100/60">{t("track.toothHelper")}</p>

      <div className="mt-4 rounded-2xl border border-brand-400/15 bg-brand-950/40 p-2 sm:p-3">
        <ToothChart
          variant="public"
          // The lab's plan is fixed here: untreated teeth are not selectable,
          // so they never invite a tap that would do nothing.
          idleInteractive={false}
          selected={treatedNumbers}
          onToggle={handleTooth}
          toothLabel={toothLabel}
          upperLabel={t("track.upperJaw")}
          lowerLabel={t("track.lowerJaw")}
        />
      </div>

      {/* Large-target shortcuts to the same teeth. The chart scales with the
          card, so on a phone each crown is only ~15px across — precise enough
          for a mouse, not for a thumb. These chips are a full touch target and
          double as an at-a-glance index of what is being treated. */}
      <div className="mt-3 flex flex-wrap gap-2">
        {ordered.map((item) => {
          const active = openTooth === item.toothNumber;
          return (
            <button
              key={item.toothNumber}
              type="button"
              aria-pressed={active}
              aria-label={toothLabel(item.toothNumber)}
              onClick={() => handleTooth(item.toothNumber)}
              className={
                "inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/60 " +
                (active
                  ? "border-brand-300/50 bg-brand-400 text-brand-950"
                  : "border-brand-400/25 bg-brand-500/10 text-cream hover:bg-brand-500/20")
              }
            >
              <span dir="ltr">{item.toothNumber}</span>
              <span
                className={
                  "text-xs font-medium " +
                  (active ? "text-brand-950/70" : "text-brand-100/60")
                }
              >
                {item.entries.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Detail panel UNDER the chart rather than a dialog: on a phone the
          chart and the answer stay on one scrollable surface, with nothing to
          dismiss before tapping the next tooth. */}
      <div className="mt-4">
        {open ? (
          <div className="rounded-2xl border border-brand-300/25 bg-brand-500/10 p-4">
            <div className="flex items-center gap-3">
              <span
                dir="ltr"
                className="inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-brand-400 px-2.5 text-sm font-bold text-brand-950"
              >
                {open.toothNumber}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-cream">
                  {t("track.toothNumber", { number: open.toothNumber })}
                </p>
                <p className="text-xs text-brand-100/60">
                  {open.entries.length === 1
                    ? t("track.toothTreatment")
                    : t("track.toothTreatments", { count: open.entries.length })}
                </p>
              </div>
            </div>

            <ul className="mt-3 space-y-2">
              {open.entries.map((entry, index) => (
                <li
                  key={`${entry.caseType}-${index}`}
                  className="rounded-xl border border-brand-400/15 bg-brand-950/45 px-3 py-2"
                >
                  <p className="font-medium text-cream">{entry.caseType}</p>
                  <p className="text-xs text-brand-100/60">
                    {locale === "ar"
                      ? entry.categoryLabelAr
                      : entry.categoryLabelEn}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-brand-400/20 px-4 py-3 text-sm text-brand-100/55">
            {t("track.toothPrompt")}
          </p>
        )}
      </div>
    </Card>
  );
}
