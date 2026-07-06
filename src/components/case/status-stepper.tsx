import type { CaseStatus } from "@prisma/client";
import { Check } from "lucide-react";
import { STATUS_META, STATUS_ORDER } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface StatusStepperProps {
  status: CaseStatus;
  /** When true, past/current stages become clickable. */
  interactive?: boolean;
  /** The stage currently selected (for the interactive/public view). */
  selectedStatus?: CaseStatus | null;
  /** Stages that have at least one image (shown with a small dot). */
  stagesWithImages?: CaseStatus[];
  onSelectStatus?: (status: CaseStatus) => void;
}

/** Horizontal 4-stage lifecycle stepper from received to completed. */
export function StatusStepper({
  status,
  interactive = false,
  selectedStatus,
  stagesWithImages = [],
  onSelectStatus,
}: StatusStepperProps) {
  const currentStep = STATUS_META[status].step;

  return (
    <ol className="flex items-start overflow-x-auto pb-1">
      {STATUS_ORDER.map((s, i) => {
        const meta = STATUS_META[s];
        const done = meta.step < currentStep;
        const active = meta.step === currentStep;
        const reached = meta.step <= currentStep; // past or current
        const clickable = interactive && reached;
        const selected = interactive && selectedStatus === s;
        const hasImages = stagesWithImages.includes(s);

        const circle = (
          <div
            className={cn(
              "relative flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold transition-all",
              done && "border-brand-600 bg-brand-600 text-white",
              active &&
                "border-brand-600 bg-brand-50 text-brand-700 shadow-glow dark:border-brand-300 dark:bg-brand-400/15 dark:text-brand-100",
              !done &&
                !active &&
                "border-border bg-background text-muted-foreground dark:border-brand-400/25 dark:bg-brand-950/45 dark:text-brand-100/55",
              selected && "ring-2 ring-brand-400 ring-offset-2 ring-offset-transparent",
              clickable && "cursor-pointer group-hover:scale-105",
            )}
          >
            {done ? <Check className="h-4 w-4" /> : meta.step}
            {hasImages && (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-brand-400 ring-2 ring-brand-950" />
            )}
          </div>
        );

        return (
          <li key={s} className="flex min-w-24 flex-1 items-start last:flex-none">
            {clickable ? (
              <button
                type="button"
                onClick={() => onSelectStatus?.(s)}
                aria-pressed={selected}
                className="group flex flex-col items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/60"
              >
                {circle}
                <span
                  className={cn(
                    "text-center text-[11px] font-medium leading-tight transition-colors",
                    selected || active
                      ? "text-brand-700 dark:text-brand-100"
                      : "text-muted-foreground group-hover:text-brand-700 dark:text-brand-100/55 dark:group-hover:text-brand-100",
                  )}
                >
                  {meta.label}
                </span>
              </button>
            ) : (
              <div
                className={cn(
                  "flex flex-col items-center gap-2",
                  interactive && !reached && "opacity-55",
                )}
              >
                {circle}
                <span
                  className={cn(
                    "text-center text-[11px] font-medium leading-tight",
                    active
                      ? "text-brand-700 dark:text-brand-100"
                      : "text-muted-foreground dark:text-brand-100/55",
                  )}
                >
                  {meta.label}
                </span>
              </div>
            )}
            {i < STATUS_ORDER.length - 1 && (
              <div
                className={cn(
                  "mx-2 mt-[18px] h-0.5 flex-1 rounded-full transition-colors",
                  done ? "bg-brand-500" : "bg-border dark:bg-brand-400/20",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
