"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  CalendarClock,
  Stethoscope,
  Package,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusStepper } from "@/components/case/status-stepper";
import { StatusBadge } from "@/components/case/status-badge";
import { CaseFormDialog } from "@/components/admin/case-form-dialog";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { ProgressManager } from "@/components/admin/progress-manager";
import { ImageManager } from "@/components/admin/image-manager";
import { useCase, useDeleteCase, useUpdateCase } from "@/hooks/use-cases";
import { CATEGORY_META, STATUS_META, STATUS_ORDER } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { CaseStatus } from "@prisma/client";

export function CaseDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const { data: kase, isLoading } = useCase(id);
  const update = useUpdateCase(id);
  const del = useDeleteCase();

  const [editOpen, setEditOpen] = React.useState(params.get("edit") === "true");
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  async function changeStatus(status: CaseStatus) {
    try {
      await update.mutateAsync({ currentStatus: status });
      toast.success(`Status set to ${STATUS_META[status].label}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update status");
    }
  }

  async function confirmDelete() {
    try {
      await del.mutateAsync(id);
      toast.success("Case deleted");
      router.push("/admin/cases");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!kase) {
    return (
      <div className="mx-auto max-w-5xl">
        <Card className="p-10 text-center">
          <p className="text-muted-foreground">Case not found.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/admin/cases">Back to cases</Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/cases"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" /> All cases
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" /> Edit
          </Button>
          <Button
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      {/* Header card */}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-border bg-muted/30 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Patient
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold text-ink">
              {kase.patientFirstName} {kase.patientLastName}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Created {formatDate(kase.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={kase.currentStatus} />
            <Select
              value={kase.currentStatus}
              onValueChange={(v) => changeStatus(v as CaseStatus)}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_META[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="p-6">
          <StatusStepper status={kase.currentStatus} />
        </div>

        <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          <Detail icon={Stethoscope} label="Doctor" value={kase.doctorName} />
          <Detail icon={Package} label="Case Type" value={kase.caseType} />
          <Detail
            icon={Tag}
            label="Category"
            value={CATEGORY_META[kase.category].label}
          />
          <Detail
            icon={CalendarClock}
            label="Est. Completion"
            value={formatDate(kase.estimatedCompletionDate)}
          />
        </div>

        {kase.notes && (
          <div className="border-t border-border p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Notes
            </p>
            <p className="mt-2 text-sm text-foreground/80">{kase.notes}</p>
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <ProgressManager caseId={id} steps={kase.progress} />
        <ImageManager caseId={id} images={kase.images} />
      </div>

      <CaseFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        existing={kase}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this case?"
        description="This permanently removes the case, its progress steps and images."
        confirmLabel="Delete"
        destructive
        loading={del.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-card p-5">
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
