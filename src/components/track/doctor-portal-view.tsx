"use client";

import * as React from "react";
import { Search, FolderOpen, Archive, ArrowRight, Stethoscope } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n/language-provider";
import {
  getProductionCollection,
  localizedLabel,
  type ProductionCollection,
} from "@/lib/production-templates";
import { formatEstCompletion, formatNumber, cn } from "@/lib/utils";
import type { PublicDoctorPortalDTO } from "@/types/case";

interface Props {
  portal: PublicDoctorPortalDTO;
  config: readonly ProductionCollection[];
  archived: boolean;
  search: string;
  loading: boolean;
  onArchivedChange: (archived: boolean) => void;
  onSearchChange: (q: string) => void;
  /** Opens one case in the existing single-case tracker. */
  onOpenCase: (trackingId: string) => void;
}

/**
 * PUBLIC doctor portal: every case linked to one doctor.
 *
 * Renders only what the API sends — a deliberately narrow card DTO. There is no
 * progress, no images, no notes and no internal identifier here, because the
 * server never sends them for this view. Opening a card falls through to the
 * existing single-case tracker, which applies its own boundaries.
 */
export function DoctorPortalView({
  portal,
  config,
  archived,
  search,
  loading,
  onArchivedChange,
  onSearchChange,
  onOpenCase,
}: Props) {
  const { t, locale } = useI18n();

  function stageLabel(collectionId: string | null, stageId: string | null) {
    if (!stageId) return null;
    const c = getProductionCollection(config, collectionId);
    const s = c?.stages.find((x) => x.id === stageId);
    return s ? localizedLabel(s, locale) : null;
  }

  return (
    <div className="mt-6 space-y-5">
      {/* The doctor's name appears exactly once, here. */}
      <div className="premium-panel flex items-center gap-3 p-5">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-400/15 text-brand-200">
          <Stethoscope className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs uppercase tracking-wider text-brand-100/60">
            {t("doctorPortal.title")}
          </p>
          <p className="text-lg font-semibold text-cream">{portal.doctorName}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-200/70" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t("doctorPortal.searchPlaceholder")}
            className="h-11 border-brand-400/25 bg-brand-950/45 pl-11 text-cream placeholder:text-brand-100/45"
            aria-label={t("doctorPortal.searchPlaceholder")}
          />
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant={archived ? "ghost" : "gradient"}
            onClick={() => onArchivedChange(false)}
            className={cn(!archived && "shadow-glow")}
          >
            <FolderOpen className="h-4 w-4" />
            {t("doctorPortal.active")} ({formatNumber(portal.activeCount, locale)})
          </Button>
          <Button
            type="button"
            variant={archived ? "gradient" : "ghost"}
            onClick={() => onArchivedChange(true)}
            className={cn(archived && "shadow-glow")}
          >
            <Archive className="h-4 w-4" />
            {t("doctorPortal.archive")} ({formatNumber(portal.archivedCount, locale)})
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-brand-100/60">
          {t("doctorPortal.loading")}
        </p>
      ) : portal.cases.length === 0 ? (
        <p className="premium-panel p-8 text-center text-sm text-brand-100/70">
          {search.trim()
            ? t("doctorPortal.noMatch")
            : archived
              ? t("doctorPortal.emptyArchive")
              : t("doctorPortal.emptyActive")}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {portal.cases.map((c) => {
            const stage = stageLabel(c.collectionId, c.currentStageId);
            return (
              <li key={c.trackingId}>
                <button
                  type="button"
                  onClick={() => onOpenCase(c.trackingId)}
                  className="premium-panel group flex w-full flex-col items-start gap-2 p-4 text-start transition-transform hover:-translate-y-0.5"
                >
                  <div className="flex w-full items-start justify-between gap-2">
                    {/* Redacted server-side to "First L." — the full surname
                        never leaves the server for a public lookup. */}
                    <span className="font-semibold text-cream">{c.patientName}</span>
                    <span className="font-mono text-[11px] text-brand-100/60">
                      {c.trackingId}
                    </span>
                  </div>

                  <span className="text-xs text-brand-100/70">{c.caseType}</span>

                  <div className="flex w-full items-center justify-between gap-2 pt-1">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[11px] font-medium",
                        c.isCompleted
                          ? "bg-brand-400/20 text-brand-100"
                          : "bg-brand-400/10 text-brand-200",
                      )}
                    >
                      {c.isCompleted
                        ? t("doctorPortal.completed")
                        : (stage ?? t("doctorPortal.inProgress"))}
                    </span>
                    <ArrowRight className="h-4 w-4 text-brand-200/70 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100" />
                  </div>

                  {c.estimatedCompletionDate && !c.isCompleted && (
                    <span className="text-[11px] text-brand-100/55">
                      {t("doctorPortal.estCompletion")}{" "}
                      {formatEstCompletion(c.estimatedCompletionDate, locale)}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
