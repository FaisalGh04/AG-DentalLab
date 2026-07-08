import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StepperStage {
  id: string;
  label: string;
}

interface StageStepperProps {
  /** Ordered, already-VISIBLE stages (hidden ones filtered out by the caller). */
  stages: StepperStage[];
  /** The case's current stage id; drives done/current/upcoming states. */
  currentStageId: string | null;
  /** When true, stages are clickable (see `clickable`). */
  interactive?: boolean;
  /** Which stages respond to clicks: those reached (<= current) or all of them. */
  clickable?: "reached" | "all";
  /** Highlighted stage (e.g. the one whose images are shown on the tracker). */
  selectedStageId?: string | null;
  /** Stage ids that have at least one image (shown with a small dot). */
  stagesWithImages?: string[];
  onSelectStage?: (stageId: string) => void;
}

/**
 * Horizontal connected-circles stepper for a case's collection stages. Same
 * visual language as the old lifecycle stepper, but driven by dynamic stage ids
 * instead of the fixed CaseStatus enum. Used by the admin detail page and the
 * public tracker.
 */
export function StageStepper({
  stages,
  currentStageId,
  interactive = false,
  clickable = "reached",
  selectedStageId,
  stagesWithImages = [],
  onSelectStage,
}: StageStepperProps) {
  const currentIndex = stages.findIndex((s) => s.id === currentStageId);

  return (
    <ol className="flex items-start overflow-x-auto px-0.5 pb-1 pt-2.5">
      {stages.map((stage, i) => {
        const done = currentIndex >= 0 && i < currentIndex;
        const active = i === currentIndex;
        const reached = currentIndex >= 0 && i <= currentIndex;
        const canClick =
          interactive && (clickable === "all" || reached) && !!onSelectStage;
        const selected = selectedStageId === stage.id;
        const hasImages = stagesWithImages.includes(stage.id);

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
              canClick && "cursor-pointer group-hover:scale-105",
            )}
          >
            {done ? <Check className="h-4 w-4" /> : i + 1}
            {hasImages && (
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-brand-400 ring-2 ring-brand-950" />
            )}
          </div>
        );

        return (
          <li key={stage.id} className="flex min-w-24 flex-1 items-start last:flex-none">
            {canClick ? (
              <button
                type="button"
                onClick={() => onSelectStage?.(stage.id)}
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
                  {stage.label}
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
                  {stage.label}
                </span>
              </div>
            )}
            {i < stages.length - 1 && (
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
