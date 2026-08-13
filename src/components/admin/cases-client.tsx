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
  History,
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
import { CaseStateBadge } from "@/components/case/case-state-badge";
import { useLifecycleConfig } from "@/hooks/use-lifecycle";
import { TrackingIdCopy } from "@/components/case/tracking-id-copy";
import { CaseFormDialog } from "@/components/admin/case-form-dialog";
import { CaseHistoryDialog } from "@/components/admin/case-history-dialog";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useAdminUI } from "@/store/admin-ui";
import { useAdminI18n } from "@/components/i18n/admin-i18n";
import { useCase, useCaseList, useDeleteCase } from "@/hooks/use-cases";
import { useCaseTaxonomy } from "@/hooks/use-case-taxonomy";
import { formatDate, formatDateTime, formatEstCompletion } from "@/lib/utils";
import type { AdminCaseListItem } from "@/types/case";

export function CasesClient() {
  const { t, locale } = useAdminI18n();
  const { data: lifecycleConfig = [] } = useLifecycleConfig();
  const { data: taxonomy } = useCaseTaxonomy();
  const params = useSearchParams();
  const archivedParam = params.get("archived") === "true";
  const openNew = params.get("new") === "true";

  const {
    search,
    category,
    page,
    archived,
    setSearch,
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
  /**
   * LAZY per-case stage history. Nothing is fetched for the list at all —
   * useCase is disabled while `historyId` is null, so the query fires only when
   * a row's Created cell is clicked. Deliberately not eager: stageHistory costs
   * an extra audit-log query per case, which across a 20-row page would be 20
   * queries to render a column almost nobody expands.
   *
   * Its key is ["case", id] — the SAME key the detail page uses — so opening
   * history here also warms that page's cache, and vice versa.
   */
  const [historyId, setHistoryId] = React.useState<string | null>(null);
  const historyQuery = useCase(historyId);

  // Debounce the search box.
  const [debounced, setDebounced] = React.useState(search);
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isFetching } = useCaseList({
    q: debounced || undefined,
    category,
    archived,
    page,
    pageSize: 20,
  });

  // The clicked row, for the dialog header — already in hand, so the patient
  // name and created date render immediately while the history is still loading.
  const historyRow = data?.items.find((c) => c.id === historyId) ?? null;

  const del = useDeleteCase();
  const categoryLabel = (value: string) => {
    const item = taxonomy?.categories.find((entry) => entry.category === value);
    return item
      ? locale === "ar"
        ? item.labelAr
        : item.labelEn
      : t(`category.${value}`);
  };

  const badgeLabels = {
    completed: t("state.completed"),
    noCollection: t("state.noCollection"),
  };

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      await del.mutateAsync(deleteId);
      toast.success(t("cases.toastDeleted"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("cases.toastDeleteFailed"));
    } finally {
      setDeleteId(null);
    }
  }

  function countLabel(total: number) {
    return total === 1
      ? t("cases.countOne", { count: total })
      : t("cases.countOther", { count: total });
  }

  // Row actions menu, shared by the desktop table and the mobile cards.
  const RowActions = ({ id }: { id: string }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/admin/cases/${id}`}>
            <Eye className="h-4 w-4" /> {t("cases.viewManage")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/admin/cases/${id}?edit=true`}>
            <Pencil className="h-4 w-4" /> {t("cases.edit")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => setDeleteId(id)}
        >
          <Trash2 className="h-4 w-4" /> {t("cases.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  /**
   * The "Created" value, doubling as the entry point to that case's read-only
   * stage history. Shared by the desktop table and the mobile cards.
   *
   * A real <button> INSIDE the cell — never a clickable <td>/<dd>. The row
   * already contains a <Link> (patient name) and a dropdown trigger, and all
   * three must stay non-nesting siblings: a control inside a control is invalid
   * HTML and the click would bubble into the wrong handler.
   *
   * Shows the date only, matching the neighbouring Updated column — the full
   * timestamp is the `title` tooltip and is always spelled out in the dialog
   * header, so nothing is lost by keeping a 9-column table readable.
   */
  const CreatedCell = ({ c }: { c: AdminCaseListItem }) => (
    <button
      type="button"
      onClick={() => setHistoryId(c.id)}
      title={formatDateTime(c.createdAt)}
      aria-label={t("cases.openHistory", {
        name: `${c.patientFirstName} ${c.patientLastName}`,
      })}
      className="-mx-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-muted-foreground transition-colors hover:bg-brand-100 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      <History className="h-3.5 w-3.5 shrink-0" />
      <span className="whitespace-nowrap">{formatDate(c.createdAt)}</span>
    </button>
  );

  const emptyState = (
    <div className="mx-auto flex max-w-sm flex-col items-center py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
        <ClipboardList className="h-6 w-6" />
      </div>
      <p className="mt-4 font-semibold text-ink">{t("cases.noCasesFound")}</p>
      <p className="mt-1 text-sm text-muted-foreground">{t("cases.noCasesHint")}</p>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
            {archived ? t("cases.completedArchive") : t("cases.allCases")}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {data ? countLabel(data.total) : "..."}
          </p>
        </div>
        <Button variant="gradient" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" /> {t("cases.newCase")}
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("cases.searchPlaceholder")}
              className="ps-10"
            />
          </div>
          <Select
            value={category}
            onValueChange={setCategory}
          >
            <SelectTrigger className="md:w-52">
              <SelectValue placeholder={t("cases.categoryPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("cases.allCategories")}</SelectItem>
              {(taxonomy?.categories ?? []).map((item) => (
                <SelectItem key={item.category} value={item.category}>
                  {locale === "ar" ? item.labelAr : item.labelEn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {/* Desktop table (md+) */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-brand-50/50 text-start text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-semibold">{t("cases.colPatient")}</th>
                <th className="px-5 py-3 font-semibold">{t("cases.colTrackingId")}</th>
                <th className="px-5 py-3 font-semibold">{t("cases.colDoctor")}</th>
                <th className="px-5 py-3 font-semibold">{t("cases.colCaseType")}</th>
                <th className="px-5 py-3 font-semibold">{t("cases.colStage")}</th>
                <th className="px-5 py-3 font-semibold">{t("cases.colReceivedBy")}</th>
                <th className="px-5 py-3 font-semibold">{t("cases.colEstCompletion")}</th>
                <th className="px-5 py-3 font-semibold">{t("cases.colUpdated")}</th>
                <th className="px-5 py-3 font-semibold">{t("cases.colCreated")}</th>
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
                      <Skeleton className="h-5 w-28" />
                    </td>
                    <td className="px-5 py-4">
                      <Skeleton className="h-5 w-24" />
                    </td>
                    <td className="px-5 py-4">
                      <Skeleton className="h-5 w-24" />
                    </td>
                    <td className="px-5 py-4">
                      <Skeleton className="ms-auto h-9 w-9" />
                    </td>
                  </tr>
                ))}

              {!isLoading && data?.items.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-5 py-6">
                    {emptyState}
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
                      {categoryLabel(c.category)}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <TrackingIdCopy trackingId={c.trackingId} />
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{c.doctorName}</td>
                  <td className="px-5 py-4 text-muted-foreground">{c.caseType}</td>
                  <td className="px-5 py-4">
                    <CaseStateBadge
                      config={lifecycleConfig}
                      collectionId={c.collectionId}
                      currentStageId={c.currentStageId}
                      isCompleted={c.isCompleted}
                      locale={locale}
                      labels={badgeLabels}
                    />
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">
                    {c.receivedBy || "—"}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">
                    {formatEstCompletion(c.estimatedCompletionDate)}
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">
                    {formatDate(c.updatedAt)}
                  </td>
                  <td className="px-5 py-4">
                    <CreatedCell c={c} />
                  </td>
                  <td className="px-5 py-4 text-end">
                    <RowActions id={c.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile card list (< md) */}
        <div className="divide-y divide-border/60 md:hidden">
          {isLoading &&
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="mt-2 h-3 w-24" />
                <Skeleton className="mt-3 h-7 w-28 rounded-full" />
              </div>
            ))}

          {!isLoading && data?.items.length === 0 && emptyState}

          {data?.items.map((c) => (
            <div key={c.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={`/admin/cases/${c.id}`}
                  className="min-w-0 font-semibold text-ink hover:text-brand-700"
                >
                  {c.patientFirstName} {c.patientLastName}
                  <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                    {categoryLabel(c.category)}
                  </span>
                </Link>
                <RowActions id={c.id} />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <TrackingIdCopy trackingId={c.trackingId} />
                <CaseStateBadge
                  config={lifecycleConfig}
                  collectionId={c.collectionId}
                  currentStageId={c.currentStageId}
                  isCompleted={c.isCompleted}
                  locale={locale}
                  labels={badgeLabels}
                />
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">{t("cases.colDoctor")}</dt>
                  <dd className="text-foreground/80">{c.doctorName}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t("cases.colCaseType")}</dt>
                  <dd className="text-foreground/80">{c.caseType}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t("cases.colEstCompletion")}</dt>
                  <dd className="text-foreground/80">
                    {formatEstCompletion(c.estimatedCompletionDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t("cases.colUpdated")}</dt>
                  <dd className="text-foreground/80">{formatDate(c.updatedAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t("cases.colCreated")}</dt>
                  <dd>
                    <CreatedCell c={c} />
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border/80 bg-white/50 px-5 py-3">
            <p className="text-sm text-muted-foreground">
              {t("cases.pageOf", { page: data.page, total: data.totalPages })}
              {isFetching && (
                <Loader2 className="ms-2 inline h-3.5 w-3.5 animate-spin" />
              )}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={data.page <= 1}
                onClick={() => setPage(data.page - 1)}
              >
                <ChevronLeft className="h-4 w-4 rtl:-scale-x-100" /> {t("cases.prev")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={data.page >= data.totalPages}
                onClick={() => setPage(data.page + 1)}
              >
                {t("cases.next")} <ChevronRight className="h-4 w-4 rtl:-scale-x-100" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <CaseFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      {/* READ-ONLY history viewer. The query lives HERE, not in the dialog:
          @/hooks/use-cases also exports the mutation hooks, and that file is
          under an ESLint import lockdown that forbids reaching them. */}
      {historyRow && (
        <CaseHistoryDialog
          open={!!historyId}
          onOpenChange={(o) => !o && setHistoryId(null)}
          patientName={`${historyRow.patientFirstName} ${historyRow.patientLastName}`}
          createdAt={historyRow.createdAt}
          config={lifecycleConfig}
          kase={historyQuery.data}
          isLoading={historyQuery.isLoading}
          isError={historyQuery.isError}
        />
      )}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title={t("cases.deleteTitle")}
        description={t("cases.deleteBody")}
        confirmLabel={t("cases.delete")}
        destructive
        loading={del.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
