"use client";

import * as React from "react";
import Image from "next/image";
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
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { StageStepper } from "@/components/case/stage-stepper";
import { CaseStateBadge } from "@/components/case/case-state-badge";
import { ProgressTimeline } from "@/components/case/progress-timeline";
import { TrackingIdCopy } from "@/components/case/tracking-id-copy";
import { useI18n } from "@/components/i18n/language-provider";
import { searchSchema, type SearchInput } from "@/lib/validations";
import { apiFetch, ApiError } from "@/lib/fetcher";
import {
  getProductionCollection,
  getVisibleStages,
  localizedLabel,
} from "@/lib/production-templates";
import { formatEstCompletion } from "@/lib/utils";
import type { PublicCaseDTO } from "@/types/case";

export function TrackClient() {
  const { t, locale } = useI18n();

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

  // The case's collection + its visible stages (hidden ones filtered out).
  const collection = getProductionCollection(result?.collectionId);
  const visibleStages = result
    ? getVisibleStages(result.collectionId, result.hiddenStageIds)
    : [];
  const stepperStages = visibleStages.map((s) => ({
    id: s.id,
    label: localizedLabel(s, locale),
  }));

  // Which stage's photos are shown; defaults to the case's current stage.
  const [selectedStage, setSelectedStage] = React.useState<string | null>(null);
  React.useEffect(() => {
    setSelectedStage(result?.currentStageId ?? null);
  }, [result]);

  const activeStage = selectedStage ?? result?.currentStageId ?? null;
  const stagesWithImages = result
    ? (Array.from(
        new Set(result.images.map((i) => i.stageId).filter(Boolean)),
      ) as string[])
    : [];
  const stageImages =
    result && activeStage
      ? result.images.filter((i) => i.stageId === activeStage)
      : [];
  const activeStageLabel =
    activeStage && collection
      ? (visibleStages.find((s) => s.id === activeStage)
          ? localizedLabel(
              visibleStages.find((s) => s.id === activeStage)!,
              locale,
            )
          : "")
      : "";
  // Images uploaded before a collection/stage was chosen (stageId null).
  const generalImages = result
    ? result.images.filter((i) => !i.stageId)
    : [];

  // Production steps scoped to the viewed stage — same interaction as the photo
  // gallery above. When no stage is active (collection-less case) this surfaces
  // the unscoped (General) steps.
  const stageProgress = result
    ? result.progress.filter((p) => (p.stageId ?? null) === activeStage)
    : [];

  return (
    <div className="mx-auto w-full max-w-3xl">
      <form onSubmit={handleSubmit(onSubmit)} className="relative">
        <div className="premium-panel flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-200/75" />
            <Input
              {...register("trackingId")}
              placeholder={t("track.placeholder")}
              className="h-12 border-brand-400/25 bg-brand-950/45 pl-12 text-base text-cream shadow-inner-glow placeholder:text-brand-100/45 focus-visible:border-brand-300/70 focus-visible:ring-2 focus-visible:ring-brand-400/35"
              autoComplete="off"
              aria-label={t("track.trackingId")}
            />
          </div>
          <Button
            type="submit"
            size="lg"
            variant="gradient"
            disabled={mutation.isPending}
            className="h-12 bg-[#F5F5F0] text-brand-900 shadow-glow hover:-translate-y-0.5 hover:bg-white focus-visible:ring-brand-300/50"
          >
            {mutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Search className="h-5 w-5" />
            )}
            {t("track.button")}
          </Button>
        </div>
        {errors.trackingId && (
          <p className="mt-2 pl-2 text-sm text-destructive">
            {errors.trackingId.message}
          </p>
        )}
      </form>

      {!mutation.data && !mutation.isError && !mutation.isPending && (
        <div className="premium-panel mt-8 p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-300/30 bg-brand-500/15 text-brand-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_34px_-12px_rgba(83,136,111,0.9)]">
            <ClipboardList className="h-6 w-6" />
          </div>
          <p className="mt-4 font-semibold text-cream">{t("track.readyTitle")}</p>
          <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-brand-50/68">
            {t("track.readyBody")}
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
            <Card className="flex items-start gap-3 border-amber-300/35 bg-amber-500/10 p-5 text-amber-100">
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
            <Card className="overflow-hidden border-brand-400/20 bg-brand-950/55 text-cream">
              <div className="flex flex-col gap-4 border-b border-brand-400/20 bg-brand-500/10 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-brand-100/60">
                    {t("track.trackingId")}
                  </p>
                  <TrackingIdCopy
                    trackingId={result.trackingId}
                    className="mt-2 border-brand-300/25 bg-brand-500/15 text-brand-100"
                  />
                  <h2 className="mt-4 font-display text-2xl font-bold text-cream">
                    {result.patientName}
                  </h2>
                </div>
                <CaseStateBadge
                  collectionId={result.collectionId}
                  currentStageId={result.currentStageId}
                  isCompleted={result.isCompleted}
                  locale={locale}
                  labels={{
                    completed: t("track.completed"),
                    noCollection: t("track.inProcess"),
                  }}
                />
              </div>

              {collection && stepperStages.length > 0 ? (
                <div className="p-6">
                  <StageStepper
                    stages={stepperStages}
                    currentStageId={result.currentStageId}
                    interactive
                    selectedStageId={activeStage}
                    stagesWithImages={stagesWithImages}
                    onSelectStage={setSelectedStage}
                  />
                </div>
              ) : (
                <div className="p-6">
                  <div className="rounded-xl border border-brand-400/20 bg-brand-500/10 p-5 text-center">
                    <p className="font-semibold text-cream">
                      {t("track.processingTitle")}
                    </p>
                    <p className="mt-1 text-sm text-brand-50/68">
                      {t("track.processingBody")}
                    </p>
                  </div>
                </div>
              )}

              {collection && activeStage && (
                <div className="border-t border-brand-400/20 bg-brand-950/30 p-6">
                  <div className="flex items-center gap-2 text-brand-100/60">
                    <ImageIcon className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      {activeStageLabel} — {t("track.stagePhotos")}
                    </span>
                  </div>
                  {stageImages.length > 0 ? (
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {stageImages.map((img) => (
                        <a
                          key={img.id}
                          href={img.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative aspect-square overflow-hidden rounded-xl border border-brand-400/20"
                        >
                          <Image
                            src={img.imageUrl}
                            alt={img.caption ?? activeStageLabel}
                            fill
                            sizes="(max-width: 640px) 50vw, 220px"
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                            // Served via the tracking-id-scoped /api/images proxy
                            // → signed URL (S-M3); browser hits the proxy directly.
                            unoptimized
                          />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-brand-50/68">
                      {t("track.noStagePhotos")}
                    </p>
                  )}
                </div>
              )}

              {generalImages.length > 0 && (
                <div className="border-t border-brand-400/20 bg-brand-950/30 p-6">
                  <div className="flex items-center gap-2 text-brand-100/60">
                    <ImageIcon className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      {t("track.generalPhotos")}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {generalImages.map((img) => (
                      <a
                        key={img.id}
                        href={img.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative aspect-square overflow-hidden rounded-xl border border-brand-400/20"
                      >
                        <Image
                          src={img.imageUrl}
                          alt={img.caption ?? t("track.generalPhotos")}
                          fill
                          sizes="(max-width: 640px) 50vw, 220px"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          unoptimized
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-px bg-brand-400/15 sm:grid-cols-2 lg:grid-cols-3">
                <Detail icon={Hash} label={t("track.trackingId")} value={result.trackingId} />
                <Detail icon={User} label={t("track.patient")} value={result.patientName} />
                <Detail icon={Stethoscope} label={t("track.doctor")} value={result.doctorName} />
                <Detail
                  icon={Tag}
                  label={t("track.category")}
                  value={t(`category.${result.category}`)}
                />
                <Detail icon={Package} label={t("track.caseType")} value={result.caseType} />
                <Detail
                  icon={CalendarClock}
                  label={t("track.estCompletion")}
                  value={formatEstCompletion(result.estimatedCompletionDate)}
                />
              </div>
            </Card>

            <Card className="border-brand-400/20 bg-brand-950/55 p-6 text-cream">
              <h3 className="mb-6 font-display text-lg font-semibold text-cream">
                {t("track.productionTimeline")}
                {activeStageLabel && (
                  <span className="ml-2 text-base font-medium text-brand-100/60">
                    — {activeStageLabel}
                  </span>
                )}
              </h3>
              <ProgressTimeline
                steps={stageProgress}
                emptyLabel={t("track.noSteps")}
              />
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
    <div className="bg-brand-950/45 p-5">
      <div className="flex items-center gap-2 text-brand-100/58">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="mt-1.5 break-words font-medium text-cream">{value}</p>
    </div>
  );
}
