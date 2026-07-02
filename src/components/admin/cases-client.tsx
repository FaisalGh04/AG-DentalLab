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
import { CaseFormDialog } from "@/components/admin/case-form-dialog";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useAdminUI } from "@/store/admin-ui";
import { useCaseList, useDeleteCase } from "@/hooks/use-cases";
import { CATEGORY_META, STATUS_META, STATUS_ORDER } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { CaseCategory, CaseStatus } from "@prisma/client";

const CATEGORIES = Object.keys(CATEGORY_META) as CaseCategory[];

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
            {data ? `${data.total} case${data.total === 1 ? "" : "s"}` : "…"}
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
              placeholder="Search patient, doctor or case type…"
              className="pl-10"
            />
          </div>
          <Select
            value={status}
            onValueChange={(v) => setStatus(v as CaseStatus | "ALL")}
          >
            <SelectTrigger className="md:w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_META[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={category}
            onValueChange={(v) => setCategory(v as CaseCategory | "ALL")}
          >
            <SelectTrigger className="md:w-52">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All categories</SelectItem>
              {CATEGORIES.map((c) => (
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
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-semibold">Patient</th>
                <th className="px-5 py-3 font-semibold">Doctor</th>
                <th className="px-5 py-3 font-semibold">Case Type</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Updated</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-4" colSpan={6}>
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))}

              {!isLoading && data?.items.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-16 text-center text-muted-foreground"
                  >
                    No cases found. Try adjusting your filters.
                  </td>
                </tr>
              )}

              {data?.items.map((c) => (
                <tr key={c.id} className="group transition-colors hover:bg-muted/30">
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
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
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
