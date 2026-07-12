"use client";

import Link from "next/link";
import {
  FolderKanban,
  Loader,
  CheckCircle2,
  CircleDashed,
  ArrowRight,
  Plus,
  ClipboardList,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CaseStateBadge } from "@/components/case/case-state-badge";
import { TrackingIdCopy } from "@/components/case/tracking-id-copy";
import { useAdminI18n } from "@/components/i18n/admin-i18n";
import { formatDate, formatEstCompletion } from "@/lib/utils";
import type { AdminCaseListItem } from "@/types/case";

interface DashboardStats {
  total: number;
  active: number;
  completed: number;
  unassigned: number;
}

export function DashboardClient({
  stats,
  recent,
}: {
  stats: DashboardStats;
  recent: AdminCaseListItem[];
}) {
  const { t } = useAdminI18n();

  const cards = [
    { key: "dashboard.totalCases", value: stats.total, icon: FolderKanban, tint: "bg-brand-50 text-brand-600 ring-brand-100" },
    { key: "dashboard.active", value: stats.active, icon: Loader, tint: "bg-sky-50 text-sky-600 ring-sky-100" },
    { key: "dashboard.completed", value: stats.completed, icon: CheckCircle2, tint: "bg-green-50 text-green-600 ring-green-100" },
    { key: "dashboard.noCollection", value: stats.unassigned, icon: CircleDashed, tint: "bg-slate-100 text-slate-600 ring-slate-200" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
            {t("dashboard.title")}
          </h1>
          <p className="mt-1 text-muted-foreground">{t("dashboard.subtitle")}</p>
        </div>
        <Button asChild variant="gradient">
          <Link href="/admin/cases?new=true">
            <Plus className="h-4 w-4" /> {t("dashboard.newCase")}
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.key} className="group p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-glow">
              <div className={`flex h-11 w-11 items-center justify-center rounded-full ring-1 ring-inset ${c.tint}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-4 font-display text-3xl font-bold tabular-nums text-ink">
                {c.value.toLocaleString()}
              </p>
              <p className="mt-0.5 text-sm font-medium text-muted-foreground">
                {t(c.key)}
              </p>
            </Card>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/70 bg-brand-50/40 p-6">
          <h2 className="font-display text-lg font-semibold text-ink">
            {t("dashboard.recentCases")}
          </h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/cases">
              {t("dashboard.viewAll")}{" "}
              <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
            </Link>
          </Button>
        </div>

        <div className="divide-y divide-border/60">
          {recent.length === 0 && (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                <ClipboardList className="h-6 w-6" />
              </div>
              <p className="mt-4 font-semibold text-ink">
                {t("dashboard.noCasesTitle")}
              </p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {t("dashboard.noCasesBody")}
              </p>
            </div>
          )}
          {recent.map((c) => (
            <Link
              key={c.id}
              href={`/admin/cases/${c.id}`}
              className="flex items-center justify-between gap-4 p-5 transition-colors hover:bg-brand-50/60"
            >
              <div className="min-w-0">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <p className="truncate font-semibold text-ink">
                    {c.patientFirstName} {c.patientLastName}
                  </p>
                  <TrackingIdCopy trackingId={c.trackingId} />
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {c.caseType} / {t(`category.${c.category}`)} / {c.doctorName}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground/80">
                  {t("dashboard.estCompletion")}:{" "}
                  {formatEstCompletion(c.estimatedCompletionDate)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <span className="hidden text-sm text-muted-foreground sm:block">
                  {formatDate(c.updatedAt)}
                </span>
                <CaseStateBadge
                  collectionId={c.collectionId}
                  currentStageId={c.currentStageId}
                  isCompleted={c.isCompleted}
                />
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
