import type { CaseStatus } from "@prisma/client";
import { Check } from "lucide-react";
import { STATUS_META, STATUS_ORDER } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** Horizontal 4-stage lifecycle stepper from received to completed. */
export function StatusStepper({ status }: { status: CaseStatus }) {
  const currentStep = STATUS_META[status].step;

  return (
    <ol className="flex items-start overflow-x-auto pb-1">
      {STATUS_ORDER.map((s, i) => {
        const meta = STATUS_META[s];
        const done = meta.step < currentStep;
        const active = meta.step === currentStep;
        return (
          <li key={s} className="flex min-w-24 flex-1 items-start last:flex-none">
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold transition-all",
                  done && "border-brand-600 bg-brand-600 text-white",
                  active &&
                    "border-brand-600 bg-brand-50 text-brand-700 shadow-glow",
                  !done && !active && "border-border bg-background text-muted-foreground",
                )}
              >
                {done ? <Check className="h-4 w-4" /> : meta.step}
              </div>
              <span
                className={cn(
                  "text-center text-[11px] font-medium leading-tight",
                  active ? "text-brand-700" : "text-muted-foreground",
                )}
              >
                {meta.label}
              </span>
            </div>
            {i < STATUS_ORDER.length - 1 && (
              <div
                className={cn(
                  "mx-2 mt-[18px] h-0.5 flex-1 rounded-full transition-colors",
                  done ? "bg-brand-500" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
