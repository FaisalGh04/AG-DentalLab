"use client";

import * as React from "react";
import Image from "next/image";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  ImageOff,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { PortfolioFormDialog } from "@/components/admin/portfolio-form-dialog";
import { ManageFoldersDialog } from "@/components/admin/manage-folders-dialog";
import { FolderCog } from "lucide-react";
import {
  usePortfolioList,
  useUpdatePortfolioItem,
  useDeletePortfolioItem,
  useFolders,
} from "@/hooks/use-portfolio";
import { useAdminI18n } from "@/components/i18n/admin-i18n";
import type { FolderDTO, PortfolioItemDTO } from "@/types/portfolio";

export function PortfolioClient() {
  const { t, locale } = useAdminI18n();
  const { data, isLoading, isError } = usePortfolioList();
  const { data: foldersData } = useFolders();
  const update = useUpdatePortfolioItem();
  const remove = useDeletePortfolioItem();

  const folders = foldersData?.folders ?? [];
  const folderLabel = (f: FolderDTO) => (locale === "ar" ? f.labelAr : f.labelEn);

  const [filter, setFilter] = React.useState<string | "ALL">("ALL");
  const [formOpen, setFormOpen] = React.useState(false);
  const [foldersOpen, setFoldersOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<PortfolioItemDTO | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<PortfolioItemDTO | null>(
    null,
  );

  const items = React.useMemo(() => data?.items ?? [], [data]);
  const foldersToShow =
    filter === "ALL" ? folders : folders.filter((f) => f.id === filter);

  // Item count per folder — passed to the Manage-Folders dialog so it can show
  // how many cases each folder holds (and which are safe to delete).
  const itemCounts = React.useMemo(() => {
    const m: Record<string, number> = {};
    for (const it of items) m[it.folderId] = (m[it.folderId] ?? 0) + 1;
    return m;
  }, [items]);

  function openNew() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(item: PortfolioItemDTO) {
    setEditing(item);
    setFormOpen(true);
  }

  // Move an item up/down within its folder by swapping `order` with its neighbor.
  async function move(folderItems: PortfolioItemDTO[], index: number, dir: -1 | 1) {
    const a = folderItems[index];
    const b = folderItems[index + dir];
    if (!a || !b) return;
    try {
      await Promise.all([
        update.mutateAsync({ id: a.id, input: { order: b.order } }),
        update.mutateAsync({ id: b.id, input: { order: a.order } }),
      ]);
    } catch {
      toast.error(t("portfolio.toastError"));
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await remove.mutateAsync(deleteTarget.id);
      toast.success(t("portfolio.toastDeleted"));
    } catch {
      toast.error(t("portfolio.toastError"));
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">
            {t("portfolio.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("portfolio.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t("portfolio.filterAll")}</SelectItem>
              {folders.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {folderLabel(f)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setFoldersOpen(true)}>
            <FolderCog className="h-4 w-4" />
            {t("portfolio.manageFolders")}
          </Button>
          <Button variant="gradient" onClick={openNew}>
            <Plus className="h-4 w-4" />
            {t("portfolio.new")}
          </Button>
        </div>
      </header>

      {isLoading && (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}
      {isError && (
        <p className="py-16 text-center text-destructive">{t("portfolio.loadError")}</p>
      )}

      {!isLoading &&
        !isError &&
        foldersToShow.map((folder) => {
          const folderItems = items
            .filter((it) => it.folderId === folder.id)
            .sort((a, b) => a.order - b.order);
          return (
            <section key={folder.id} className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-700">
                  {folderLabel(folder)}
                </h2>
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600">
                  {folderItems.length}
                </span>
              </div>

              {folderItems.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
                  {t("portfolio.emptyFolder")}
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {folderItems.map((item, i) => {
                    const cover = item.images[0];
                    const title = locale === "ar" ? item.titleAr : item.titleEn;
                    return (
                      <Card key={item.id} className="flex gap-3 p-3">
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                          {cover ? (
                            <Image
                              src={cover.url}
                              alt=""
                              fill
                              sizes="80px"
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                              <ImageOff className="h-5 w-5" />
                            </div>
                          )}
                        </div>

                        <div className="flex min-w-0 flex-1 flex-col">
                          <p className="truncate text-sm font-semibold text-ink">
                            {title}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {t("portfolio.imageCount", {
                              count: item.images.length,
                            })}
                          </p>

                          <div className="mt-auto flex items-center gap-1 pt-2">
                            <IconBtn
                              label={t("portfolio.moveUp")}
                              disabled={i === 0 || update.isPending}
                              onClick={() => move(folderItems, i, -1)}
                            >
                              <ArrowUp className="h-4 w-4" />
                            </IconBtn>
                            <IconBtn
                              label={t("portfolio.moveDown")}
                              disabled={i === folderItems.length - 1 || update.isPending}
                              onClick={() => move(folderItems, i, 1)}
                            >
                              <ArrowDown className="h-4 w-4" />
                            </IconBtn>
                            <div className="flex-1" />
                            <IconBtn label={t("portfolio.edit")} onClick={() => openEdit(item)}>
                              <Pencil className="h-4 w-4" />
                            </IconBtn>
                            <IconBtn
                              label={t("portfolio.delete")}
                              destructive
                              onClick={() => setDeleteTarget(item)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </IconBtn>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}

      <PortfolioFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        existing={editing}
      />

      <ManageFoldersDialog
        open={foldersOpen}
        onOpenChange={setFoldersOpen}
        itemCounts={itemCounts}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t("portfolio.confirmDeleteTitle")}
        description={t("portfolio.confirmDeleteBody")}
        confirmLabel={t("portfolio.delete")}
        destructive
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  disabled,
  destructive,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={destructive ? "h-8 w-8 text-destructive hover:bg-destructive/10" : "h-8 w-8"}
    >
      {children}
    </Button>
  );
}
