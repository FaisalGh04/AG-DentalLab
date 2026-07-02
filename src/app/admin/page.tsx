import Link from "next/link";
import {
  FolderKanban,
  Inbox,
  Loader,
  Factory,
  CheckCircle2,
  ArrowRight,
  Plus,
} from "lucide-react";
import { getDashboardStats, listCases } from "@/lib/case-service";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/case/status-badge";
import { formatDate } from "@/lib/utils";
import { CATEGORY_META } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [stats, recent] = await Promise.all([
    getDashboardStats(),
    listCases({ page: 1, pageSize: 6 }),
  ]);

  const cards = [
    { label: "Total Cases", value: stats.total, icon: FolderKanban, tint: "text-brand-600 bg-brand-50" },
    { label: "Received", value: stats.received, icon: Inbox, tint: "text-slate-600 bg-slate-100" },
    { label: "In Progress", value: stats.inProgress, icon: Loader, tint: "text-sky-600 bg-sky-50" },
    { label: "Production", value: stats.production, icon: Factory, tint: "text-brand-700 bg-brand-100" },
    { label: "Completed", value: stats.completed, icon: CheckCircle2, tint: "text-green-600 bg-green-50" },
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
            <Card key={c.label} className="p-5">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.tint}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-4 font-display text-3xl font-bold text-ink">
                {c.value.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">{c.label}</p>
            </Card>
          );
        })}
      </div>

      <Card>
        <div className="flex items-center justify-between border-b border-border p-6">
          <h2 className="font-display text-lg font-semibold text-ink">
            Recent Cases
          </h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/cases">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="divide-y divide-border">
          {recent.items.length === 0 && (
            <p className="p-6 text-sm text-muted-foreground">
              No cases yet. Create your first case to get started.
            </p>
          )}
          {recent.items.map((c) => (
            <Link
              key={c.id}
              href={`/admin/cases/${c.id}`}
              className="flex items-center justify-between gap-4 p-5 transition-colors hover:bg-muted/40"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">
                  {c.patientFirstName} {c.patientLastName}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {c.caseType} • {CATEGORY_META[c.category].label} • {c.doctorName}
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
