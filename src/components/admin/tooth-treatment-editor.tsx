"use client";

import * as React from "react";
import { Plus, Trash2, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useAdminI18n } from "@/components/i18n/admin-i18n";
import type { CaseTaxonomyDTO } from "@/types/case-taxonomy";
import { MAX_ENTRIES_PER_TOOTH, compareTeeth } from "@/lib/teeth";
import { cn } from "@/lib/utils";

/**
 * The editable per-tooth plan: one card per selected tooth, each holding 1-4
 * category + case type rows.
 *
 * Controlled — the parent form owns `items` so the same value can be validated
 * and submitted. This component only describes the edits.
 */

export interface ToothEntryDraft {
  category: string;
  caseType: string;
}
export interface ToothItemDraft {
  toothNumber: number;
  entries: ToothEntryDraft[];
}

/** A blank row. Split out so "new tooth" and "add entry" cannot drift apart. */
export function emptyEntry(): ToothEntryDraft {
  return { category: "", caseType: "" };
}

/**
 * Merge a confirmed tooth selection into the existing drafts.
 *
 * Teeth that were already there KEEP their entries — re-opening the chart to
 * add one tooth must not wipe the work already done on the others. Newly added
 * teeth start with a single blank row so the card is never empty, and
 * deselected teeth drop out.
 */
export function mergeToothSelection(
  current: readonly ToothItemDraft[],
  teeth: readonly number[],
): ToothItemDraft[] {
  const byNumber = new Map(current.map((item) => [item.toothNumber, item]));
  return [...teeth]
    .sort(compareTeeth)
    .map(
      (toothNumber) =>
        byNumber.get(toothNumber) ?? { toothNumber, entries: [emptyEntry()] },
    );
}

export function ToothTreatmentEditor({
  items,
  onChange,
  taxonomy,
  disabled,
  error,
}: {
  items: ToothItemDraft[];
  onChange: (next: ToothItemDraft[]) => void;
  taxonomy: CaseTaxonomyDTO | undefined;
  disabled?: boolean;
  error?: string;
}) {
  const { t, locale } = useAdminI18n();
  const categories = taxonomy?.categories ?? [];

  function updateItem(index: number, next: ToothItemDraft) {
    onChange(items.map((item, i) => (i === index ? next : item)));
  }

  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {items.map((item, index) => {
        const atMax = item.entries.length >= MAX_ENTRIES_PER_TOOTH;
        return (
          <div
            key={item.toothNumber}
            // A labelled group: the category/case-type selects inside repeat
            // per tooth, so without this a screen reader announces four
            // identical "Category" controls with nothing to tell them apart.
            role="group"
            aria-label={t("tooth.toothNumber", { number: item.toothNumber })}
            className="rounded-2xl border border-border bg-card p-3 sm:p-4"
          >
            <div className="mb-3 flex items-center gap-2">
              <span
                dir="ltr"
                className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-brand-600 px-2 text-sm font-bold text-white dark:bg-brand-500 dark:text-brand-950"
              >
                {item.toothNumber}
              </span>
              <span className="text-sm font-semibold text-ink">
                {t("tooth.toothNumber", { number: item.toothNumber })}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                aria-label={`${t("tooth.removeTooth")}: ${item.toothNumber}`}
                title={t("tooth.removeTooth")}
                className="ms-auto text-muted-foreground hover:text-destructive"
                onClick={() => onChange(items.filter((_, i) => i !== index))}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {item.entries.map((entry, entryIndex) => {
                const selectedCategory = categories.find(
                  (c) => c.category === entry.category,
                );
                const caseTypes =
                  selectedCategory?.caseTypes.filter((ct) => ct.isActive) ?? [];
                // A saved value can point at a since-deactivated option. Offer
                // it explicitly so editing another tooth never silently rewrites
                // this one's recorded treatment.
                const inactiveCurrent =
                  entry.caseType &&
                  !caseTypes.some((ct) => ct.name === entry.caseType)
                    ? entry.caseType
                    : null;
                return (
                  <div
                    key={entryIndex}
                    className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
                  >
                    <Select
                      value={entry.category || ""}
                      disabled={disabled || !taxonomy}
                      onValueChange={(v) =>
                        updateItem(index, {
                          ...item,
                          entries: item.entries.map((e, i) =>
                            // Changing the category invalidates the case type
                            // under it, so clear it rather than keep a pair that
                            // no longer belongs together.
                            i === entryIndex ? { category: v, caseType: "" } : e,
                          ),
                        })
                      }
                    >
                      <SelectTrigger aria-label={t("form.category")}>
                        <SelectValue placeholder={t("form.selectCategory")} />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.category} value={c.category}>
                            {locale === "ar" ? c.labelAr : c.labelEn}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={entry.caseType || ""}
                      disabled={disabled || !entry.category || !taxonomy}
                      onValueChange={(v) =>
                        updateItem(index, {
                          ...item,
                          entries: item.entries.map((e, i) =>
                            i === entryIndex ? { ...e, caseType: v } : e,
                          ),
                        })
                      }
                    >
                      <SelectTrigger aria-label={t("form.caseType")}>
                        <SelectValue
                          placeholder={
                            entry.category
                              ? t("form.selectCaseType")
                              : t("tooth.chooseCategoryFirst")
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {inactiveCurrent && (
                          <SelectItem value={inactiveCurrent}>
                            {inactiveCurrent} ({t("caseTypes.inactive")})
                          </SelectItem>
                        )}
                        {caseTypes.map((ct) => (
                          <SelectItem key={ct.id} value={ct.name}>
                            {ct.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Only the EXTRA rows are removable — every tooth must keep
                        at least one, which is the rule this enforces in the UI
                        as well as in the schema. */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={disabled || item.entries.length <= 1}
                      aria-label={t("tooth.removeCaseType")}
                      title={t("tooth.removeCaseType")}
                      className={cn(
                        "text-muted-foreground hover:text-destructive",
                        item.entries.length <= 1 && "invisible",
                      )}
                      onClick={() =>
                        updateItem(index, {
                          ...item,
                          entries: item.entries.filter(
                            (_, i) => i !== entryIndex,
                          ),
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="mt-2 flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || atMax}
                onClick={() =>
                  updateItem(index, {
                    ...item,
                    entries: [...item.entries, emptyEntry()],
                  })
                }
              >
                <Plus className="h-4 w-4" />
                {t("tooth.addCaseType")}
              </Button>
              {atMax && (
                <span className="text-xs text-muted-foreground">
                  {t("tooth.maxFourPerTooth")}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
