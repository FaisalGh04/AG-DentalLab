"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Loader2,
  AlertCircle,
  CalendarClock,
  User,
  Stethoscope,
  Package,
  ClipboardList,
  Hash,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { StatusStepper } from "@/components/case/status-stepper";
import { StatusBadge } from "@/components/case/status-badge";
import { ProgressTimeline } from "@/components/case/progress-timeline";
import { TrackingIdCopy } from "@/components/case/tracking-id-copy";
import { searchSchema, type SearchInput } from "@/lib/validations";
import { apiFetch, ApiError } from "@/lib/fetcher";
import { CATEGORY_META } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { PublicCaseDTO } from "@/types/case";

export function TrackClient() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SearchInput>({
    resolver: zodResolver(searchSchema),
    defaultValues: { trackingId: "" },
  });

  const mutation = useMutation<PublicCaseDTO, ApiError, SearchInput>({
    mutationFn: (input) =>
      apiFetch<PublicCaseDTO>(
        `/api/track?trackingId=${encodeURIComponent(input.trackingId)}`,
      ),
  });

  const onSubmit = (data: SearchInput) => mutation.mutate(data);
  const result = mutation.data;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <form onSubmit={handleSubmit(onSubmit)} className="relative">
        <div className="glass flex flex-col gap-3 rounded-[1.25rem] p-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              {...register("trackingId")}
              placeholder="Enter your Tracking ID"
              className="h-12 border-transparent bg-white/60 pl-12 text-base shadow-none focus-visible:ring-brand-400"
              autoComplete="off"
              aria-label="Tracking ID"
            />
          </div>
          <Button
            type="submit"
            size="lg"
            variant="gradient"
            disabled={mutation.isPending}
            className="h-12"
          >
            {mutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Search className="h-5 w-5" />
            )}
            Track Case
          </Button>
        </div>
        {errors.trackingId && (
          <p className="mt-2 pl-2 text-sm text-destructive">
            {errors.trackingId.message}
          </p>
        )}
      </form>

      {!mutation.data && !mutation.isError && !mutation.isPending && (
        <div className="mt-8 rounded-[1.25rem] border border-dashed border-brand-200 bg-white/[0.62] p-8 text-center shadow-inner-glow">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
            <ClipboardList className="h-6 w-6" />
          </div>
          <p className="mt-4 font-semibold text-ink">Ready to search</p>
          <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">
            Enter the case tracking ID provided by AG Dental Lab to view status,
            dates, notes, and production progress.
          </p>
        </div>
      )}

      <AnimatePresence mode="wait">
        {mutation.isError && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-6"
          >
            <Card className="flex items-start gap-3 border-amber-200 bg-amber-50 p-5 text-amber-800">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-sm">{mutation.error.message}</p>
            </Card>
          </motion.div>
        )}

        {result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-8 space-y-6"
          >
            <Card className="overflow-hidden">
              <div className="flex flex-col gap-4 border-b border-border/80 bg-brand-50/60 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Tracking ID
                  </p>
                  <TrackingIdCopy trackingId={result.trackingId} className="mt-2 text-sm" />
                  <h2 className="mt-4 font-display text-2xl font-bold text-ink">
                    {result.patientName}
                  </h2>
                </div>
                <StatusBadge status={result.currentStatus} />
              </div>

              <div className="p-6">
                <StatusStepper status={result.currentStatus} />
              </div>

              <div className="grid gap-px bg-border/80 sm:grid-cols-2 lg:grid-cols-5">
                <Detail icon={Hash} label="Tracking ID" value={result.trackingId} />
                <Detail icon={User} label="Patient" value={result.patientName} />
                <Detail icon={Stethoscope} label="Doctor" value={result.doctorName} />
                <Detail
                  icon={Tag}
                  label="Category"
                  value={CATEGORY_META[result.category].label}
                />
                <Detail icon={Package} label="Case Type" value={result.caseType} />
                <Detail
                  icon={CalendarClock}
                  label="Est. Completion"
                  value={formatDate(result.estimatedCompletionDate)}
                />
              </div>

              {result.notes && (
                <div className="border-t border-border/80 bg-white/50 p-6">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Notes
                  </p>
                  <p className="mt-2 text-sm text-foreground/80">{result.notes}</p>
                </div>
              )}
            </Card>

            <Card className="p-6">
              <h3 className="mb-6 font-display text-lg font-semibold text-ink">
                Production Timeline
              </h3>
              <ProgressTimeline steps={result.progress} />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-card/88 p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="mt-1.5 font-medium text-ink">{value}</p>
    </div>
  );
}
