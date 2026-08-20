"use client";

import * as React from "react";
import { Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ToothChart } from "@/components/case/tooth-chart";
import { useAdminI18n } from "@/components/i18n/admin-i18n";
import { compareTeeth } from "@/lib/teeth";

/**
 * Tooth picker dialog.
 *
 * The selection inside is PENDING and local: nothing reaches the form until
 * Confirm. Cancel and the X both discard it, which is the whole point of the
 * dialog — the chart is easy to mis-tap, so the commit has to be explicit.
 *
 * Dismissal follows the admin convention automatically: DialogContent blocks
 * outside-click and Escape on any /admin route (src/components/ui/dialog.tsx),
 * so Confirm, Cancel and X are the only ways out.
 */
export function ToothChartSelector({
  open,
  onOpenChange,
  value,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Teeth currently committed on the form. */
  value: readonly number[];
  onConfirm: (teeth: number[]) => void;
}) {
  const { t } = useAdminI18n();
  const [pending, setPending] = React.useState<number[]>([]);

  // Re-seed from the committed value every time the dialog opens, so a previous
  // cancelled edit never leaks into the next one.
  React.useEffect(() => {
    if (open) setPending([...value].sort(compareTeeth));
  }, [open, value]);

  const toggle = React.useCallback((tooth: number) => {
    setPending((prev) =>
      prev.includes(tooth)
        ? prev.filter((n) => n !== tooth)
        : [...prev, tooth].sort(compareTeeth),
    );
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("tooth.selectorTitle")}</DialogTitle>
          <DialogDescription>{t("tooth.selectorDesc")}</DialogDescription>
        </DialogHeader>

        {/* The jaw labels used to sit here as a left/right header row, which
            read as "left jaw / right jaw" — the exact confusion this chart has
            to prevent. They now live inside the chart, each centred over its
            own arch. */}
        <div className="rounded-2xl border border-border bg-card p-3 sm:p-4">
          <ToothChart
            selected={pending}
            onToggle={toggle}
            toothLabel={(n) => t("tooth.toothNumber", { number: n })}
            upperLabel={t("tooth.upperJaw")}
            lowerLabel={t("tooth.lowerJaw")}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("tooth.selectedTeeth")}
          </span>
          {pending.length === 0 ? (
            <span className="text-sm text-muted-foreground">
              {t("tooth.noneSelected")}
            </span>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5">
                {pending.map((n) => (
                  <span
                    key={n}
                    dir="ltr"
                    className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-600 px-2 text-xs font-bold text-white dark:bg-brand-500 dark:text-brand-950"
                  >
                    {n}
                  </span>
                ))}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ms-auto"
                onClick={() => setPending([])}
              >
                {t("tooth.clearAll")}
              </Button>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            onClick={() => {
              onConfirm([...pending].sort(compareTeeth));
              onOpenChange(false);
            }}
          >
            <Check className="h-4 w-4" />
            {t("tooth.confirmTeeth")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
