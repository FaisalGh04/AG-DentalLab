import { Check, Circle } from "lucide-react";
import type { ProgressDTO } from "@/types/case";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

/** Vertical timeline of production steps. Read-only (public + admin view). */
export function ProgressTimeline({ steps }: { steps: ProgressDTO[] }) {
  if (steps.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No production steps have been recorded yet.
      </p>
    );
  }

  return (
    <ol className="relative space-y-6 border-l-2 border-border pl-6">
      {steps.map((step) => (
        <li key={step.id} className="relative">
          <span
            className={cn(
              "absolute -left-[33px] flex h-6 w-6 items-center justify-center rounded-full border-2",
              step.completed
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-border bg-background text-muted-foreground",
            )}
          >
            {step.completed ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Circle className="h-2 w-2 fill-current" />
            )}
          </span>
          <div className="flex flex-col gap-0.5">
            <p
              className={cn(
                "font-semibold",
                step.completed ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {step.stepTitle}
            </p>
            {step.description && (
              <p className="text-sm text-muted-foreground">
                {step.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground/70">
              {formatDateTime(step.createdAt)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
