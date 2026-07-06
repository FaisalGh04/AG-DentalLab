"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Loader2,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/case/status-badge";
import { TrackingIdCopy } from "@/components/case/tracking-id-copy";
import { CaseFormDialog } from "@/components/admin/case-form-dialog";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useAdminUI } from "@/store/admin-ui";
import { useCaseList, useDeleteCase } from "@/hooks/use-cases";
import { CASE_CATEGORY_ORDER, CATEGORY_META, STATUS_META, STATUS_ORDER } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { CaseCategory, CaseStatus } from "@prisma/client";

export function CasesClient() {
  const params = useSearchParams();
  const archivedParam = params.get("archived") === "true";
  const openNew = params.get("new") === "true";

  const {
    search,
    status,
    category,
    page,
    archived,
    setSearch,
    setStatus,
    setCategory,
    setPage,
    setArchived,
  } = useAdminUI();

  // Sync archive filter from the URL once on mount / when it changes.
  React.useEffect(() => {
    setArchived(archivedParam);
  }, [archivedParam, setArchived]);

  const [dialogOpen, setDialogOpen] = React.useState(openNew);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);

  // Debounce the search box.
  const [debounced, setDebounced] = React.useState(search);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isFetching } = useCaseList({
    q: debounced || undefined,
    status,
    category,
    archived,
    page,
    pageSize: 20,
  });

  const del = useDeleteCase();

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      await del.mutateAsync(deleteId);
      toast.success("Case deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleteId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
            {archived ? "Completed Archive" : "All Cases"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {data ? `${data.total} case${data.total === 1 ? "" : "s"}` : "..."}
          </p>
        </div>
        <Button variant="gradient" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" /> New Case
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patient, doctor or case type..."
              className="pl-10"
            />
          </div>
          {/* Archive is all-completed, so the status filter only applies to
              "All Cases", where COMPLETED is intentionally excluded. */}
          {!archived && (
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as CaseStatus | "ALL")}
            >
              <SelectTrigger className="md:w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {STATUS_ORDER.filter((s) => s !== "COMPLETED").map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_META[s].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select
            value={category}
            onValueChange={(v) => setCategory(v as CaseCategory | "ALL")}
          >
            <SelectTrigger className="md:w-52">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All categories</SelectItem>
              {CASE_CATEGORY_ORDER.map((c) => (
                <SelectItem key={c} value={c}>
                  {CATEGORY_META[c].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-brand-50/50 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-semibold">Patient</th>
                <th className="px-5 py-3 font-semibold">Tracking ID</th>
                <th className="px-5 py-3 font-semibold">Doctor</th>
                <th className="px-5 py-3 font-semibold">Case Type</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Updated</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td className="px-5 py-4">
                      <Skeleton className="h-5 w-36" />
                      <Skeleton className="mt-2 h-3 w-20" />
                    </td>
                    <td className="px-5 py-4">
                      <Skeleton className="h-7 w-28 rounded-full" />
                    </td>
                    <td className="px-5 py-4">
                      <Skeleton className="h-5 w-28" />
                    </td>
                    <td className="px-5 py-4">
                      <Skeleton className="h-5 w-32" />
                    </td>
                    <td className="px-5 py-4">
                      <Skeleton className="h-7 w-24 rounded-full" />
                    </td>
                    <td className="px-5 py-4">
                      <Skeleton className="h-5 w-24" />
                    </td>
                    <td className="px-5 py-4">
                      <Skeleton className="ml-auto h-9 w-9" />
                    </td>
                  </tr>
                ))}

              {!isLoading && data?.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-16">
                    <div className="mx-auto flex max-w-sm flex-col items-center text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                        <ClipboardList className="h-6 w-6" />
                      </div>
                      <p className="mt-4 font-semibold text-ink">No cases found</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Try adjusting your search, status, or category filters.
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {data?.items.map((c) => (
                <tr key={c.id} className="group transition-colors hover:bg-brand-50/70">
                  <td className="px-5 py-4">
                    <Link
                      href={`/admin/cases/${c.id}`}
                      className="font-semibold text-ink hover:text-brand-700"
                    >
                      {c.patientFirstName} {c.patientLastName}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {CATEGORY_META[c.category].label}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <TrackingIdCopy trackingId={c.trackingId} />
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{c.doctorName}</td>
                  <td className="px-5 py-4 text-muted-foreground">{c.caseType}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={c.currentStatus} />
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {formatDate(c.updatedAt)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/cases/${c.id}`}>
                            <Eye className="h-4 w-4" /> View / Manage
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/cases/${c.id}?edit=true`}>
                            <Pencil className="h-4 w-4" /> Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteId(c.id)}
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border/80 bg-white/50 px-5 py-3">
            <p className="text-sm text-muted-foreground">
              Page {data.page} of {data.totalPages}
              {isFetching && (
                <Loader2 className="ml-2 inline h-3.5 w-3.5 animate-spin" />
              )}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={data.page <= 1}
                onClick={() => setPage(data.page - 1)}
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={data.page >= data.totalPages}
                onClick={() => setPage(data.page + 1)}
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <CaseFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete this case?"
        description="This permanently removes the case, its progress steps and images. This cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={del.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
