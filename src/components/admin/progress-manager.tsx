"use client";

import * as React from "react";
import { Check, Circle, Plus, Trash2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  useAddProgress,
  useUpdateProgress,
  useDeleteProgress,
} from "@/hooks/use-progress";
import { SUGGESTED_STEPS } from "@/lib/constants";
import { formatDateTime, cn } from "@/lib/utils";
import type { ProgressDTO } from "@/types/case";

export function ProgressManager({
  caseId,
  steps,
}: {
  caseId: string;
  steps: ProgressDTO[];
}) {
  const add = useAddProgress(caseId);
  const update = useUpdateProgress(caseId);
  const remove = useDeleteProgress(caseId);

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");

  const existingTitles = new Set(steps.map((s) => s.stepTitle));
  const remainingSuggestions = SUGGESTED_STEPS.filter(
    (s) => !existingTitles.has(s),
  );

  async function addStep(stepTitle: string, desc?: string, completed = false) {
    if (stepTitle.trim().length < 2) {
      toast.error("Step title is too short");
      return;
    }
    try {
      await add.mutateAsync({
        stepTitle: stepTitle.trim(),
        description: desc?.trim() || null,
        completed,
      });
      setTitle("");
      setDescription("");
      toast.success("Step added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add step");
    }
  }

  async function toggle(step: ProgressDTO) {
    try {
      await update.mutateAsync({
        progressId: step.id,
        input: { completed: !step.completed },
      });
    } catch {
      toast.error("Failed to update step");
    }
  }

  async function del(id: string) {
    try {
      await remove.mutateAsync(id);
      toast.success("Step removed");
    } catch {
      toast.error("Failed to remove step");
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-semibold text-ink">
            Production Steps
          </h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Add and tick off each completed step. Doctors see this timeline live.
          </p>
        </div>
      </div>

      {/* Existing steps */}
      <ul className="mt-6 space-y-2">
        {steps.length === 0 && (
          <li className="rounded-xl border border-dashed border-brand-200 bg-brand-50/40 p-5 text-sm text-muted-foreground">
            No steps yet. Add one below or use a suggestion.
          </li>
        )}
        {steps.map((step) => (
          <li
            key={step.id}
            className="flex items-start gap-3 rounded-xl border border-border/80 bg-white/[0.62] p-3 shadow-inner-glow transition-colors hover:border-brand-200"
          >
            <button
              onClick={() => toggle(step)}
              className={cn(
                "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                step.completed
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-border text-muted-foreground hover:border-brand-400",
              )}
              aria-label={step.completed ? "Mark incomplete" : "Mark complete"}
            >
              {step.completed ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Circle className="h-2 w-2 fill-current" />
              )}
            </button>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "font-medium",
                  step.completed ? "text-ink" : "text-muted-foreground",
                )}
              >
                {step.stepTitle}
              </p>
              {step.description && (
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              )}
              <p className="mt-0.5 text-xs text-muted-foreground/70">
                {formatDateTime(step.createdAt)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => del(step.id)}
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label={`Delete ${step.stepTitle}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>

      {/* Suggestions */}
      {remainingSuggestions.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" /> Quick add
          </p>
          <div className="flex flex-wrap gap-2">
            {remainingSuggestions.map((s) => (
              <button
                key={s}
                onClick={() => addStep(s)}
                disabled={add.isPending}
                className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 shadow-inner-glow transition-colors hover:bg-brand-100 disabled:opacity-50"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom step form */}
      <div className="mt-6 space-y-3 rounded-xl border border-border/80 bg-white/[0.62] p-4 shadow-inner-glow">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Custom step title (e.g. Try-in appointment)"
        />
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description..."
          rows={2}
        />
        <Button
          variant="default"
          onClick={() => addStep(title, description)}
          disabled={add.isPending}
        >
          {add.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Add Step
        </Button>
      </div>
    </Card>
  );
}
