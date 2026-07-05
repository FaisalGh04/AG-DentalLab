import { Check, Circle } from "lucide-react";
import type { ProgressDTO } from "@/types/case";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

/** Vertical timeline of production steps. Read-only (public + admin view). */
export function ProgressTimeline({ steps }: { steps: ProgressDTO[] }) {
  if (steps.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-brand-50/40 p-5 text-sm text-muted-foreground">
        No production steps have been recorded yet.
      </div>
    );
  }

  return (
    <ol className="relative space-y-5 border-l-2 border-brand-100 pl-6">
      {steps.map((step) => (
        <li key={step.id} className="relative">
          <span
            className={cn(
              "absolute -left-[33px] flex h-6 w-6 items-center justify-center rounded-full border-2 shadow-inner-glow",
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
          <div className="rounded-xl border border-border/70 bg-white/70 p-4 shadow-inner-glow">
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
