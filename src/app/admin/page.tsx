import Link from "next/link";
import {
  FolderKanban,
  Inbox,
  Loader,
  Factory,
  CheckCircle2,
  ArrowRight,
  Plus,
  ClipboardList,
} from "lucide-react";
import { getDashboardStats, listRecentCases } from "@/lib/case-service";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/case/status-badge";
import { TrackingIdCopy } from "@/components/case/tracking-id-copy";
import { formatDate } from "@/lib/utils";
import { CATEGORY_META } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [stats, recent] = await Promise.all([
    getDashboardStats(),
    listRecentCases(6),
  ]);

  const cards = [
    { label: "Total Cases", value: stats.total, icon: FolderKanban, tint: "bg-brand-50 text-brand-600 ring-brand-100" },
    { label: "Received", value: stats.received, icon: Inbox, tint: "bg-slate-100 text-slate-600 ring-slate-200" },
    { label: "In Progress", value: stats.inProgress, icon: Loader, tint: "bg-sky-50 text-sky-600 ring-sky-100" },
    { label: "Production", value: stats.production, icon: Factory, tint: "bg-brand-100 text-brand-700 ring-brand-200" },
    { label: "Completed", value: stats.completed, icon: CheckCircle2, tint: "bg-green-50 text-green-600 ring-green-100" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
            Dashboard
          </h1>
          <p className="mt-1 text-muted-foreground">
            Overview of all lab cases and their current status.
          </p>
        </div>
        <Button asChild variant="gradient">
          <Link href="/admin/cases?new=true">
            <Plus className="h-4 w-4" /> New Case
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className="group p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-glow">
              <div className={`flex h-11 w-11 items-center justify-center rounded-full ring-1 ring-inset ${c.tint}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-4 font-display text-3xl font-bold tabular-nums text-ink">
                {c.value.toLocaleString()}
              </p>
              <p className="mt-0.5 text-sm font-medium text-muted-foreground">
                {c.label}
              </p>
            </Card>
          );
        })}
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/70 bg-brand-50/40 p-6">
          <h2 className="font-display text-lg font-semibold text-ink">
            Recent Cases
          </h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/cases">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="divide-y divide-border/60">
          {recent.length === 0 && (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                <ClipboardList className="h-6 w-6" />
              </div>
              <p className="mt-4 font-semibold text-ink">No cases yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Create the first case and it will appear here for quick access.
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
                  {c.caseType} / {CATEGORY_META[c.category].label} / {c.doctorName}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <span className="hidden text-sm text-muted-foreground sm:block">
                  {formatDate(c.updatedAt)}
                </span>
                <StatusBadge status={c.currentStatus} />
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
