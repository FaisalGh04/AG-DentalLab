"use client";

import * as React from "react";
import { ArrowUp, ArrowDown, Pencil, Trash2, Plus, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useFolders,
  useCreateFolder,
  useUpdateFolder,
  useDeleteFolder,
} from "@/hooks/use-portfolio";
import { useAdminI18n } from "@/components/i18n/admin-i18n";
import { ApiError } from "@/lib/fetcher";
import type { FolderDTO } from "@/types/portfolio";

/**
 * Manage-folders dialog: full CRUD over the admin-managed portfolio folders —
 * add (appended to the end), rename (EN/AR), reorder (↑/↓ swap, the same pattern
 * as item ordering), and delete (blocked by the API with a clear message when the
 * folder still has cases). `itemCounts` is passed in from the portfolio list so
 * each row can show how many cases it holds.
 */
export function ManageFoldersDialog({
  open,
  onOpenChange,
  itemCounts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemCounts: Record<string, number>;
}) {
  const { t, locale } = useAdminI18n();
  const { data } = useFolders();
  const create = useCreateFolder();
  const update = useUpdateFolder();
  const remove = useDeleteFolder();

  const folders = data?.folders ?? [];

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draftEn, setDraftEn] = React.useState("");
  const [draftAr, setDraftAr] = React.useState("");
  const [newEn, setNewEn] = React.useState("");
  const [newAr, setNewAr] = React.useState("");

  function startEdit(f: FolderDTO) {
    setEditingId(f.id);
    setDraftEn(f.labelEn);
    setDraftAr(f.labelAr);
  }

  async function saveEdit(id: string) {
    if (!draftEn.trim() || !draftAr.trim()) return;
    try {
      await update.mutateAsync({
        id,
        input: { labelEn: draftEn.trim(), labelAr: draftAr.trim() },
      });
      setEditingId(null);
      toast.success(t("portfolio.folderUpdated"));
    } catch {
      toast.error(t("portfolio.toastError"));
    }
  }

  // Swap display order with the neighbor (same approach as item reorder).
  async function move(index: number, dir: -1 | 1) {
    const a = folders[index];
    const b = folders[index + dir];
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

  async function del(id: string) {
    try {
      await remove.mutateAsync(id);
      toast.success(t("portfolio.folderDeleted"));
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error(t("portfolio.folderDeleteBlocked"));
      } else {
        toast.error(t("portfolio.toastError"));
      }
    }
  }

  async function add() {
    if (!newEn.trim() || !newAr.trim()) return;
    try {
      await create.mutateAsync({ labelEn: newEn.trim(), labelAr: newAr.trim() });
      setNewEn("");
      setNewAr("");
      toast.success(t("portfolio.folderCreated"));
    } catch {
      toast.error(t("portfolio.toastError"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("portfolio.foldersTitle")}</DialogTitle>
          <DialogDescription>{t("portfolio.foldersDesc")}</DialogDescription>
        </DialogHeader>

        <ul className="space-y-2">
          {folders.map((f, i) => {
            const count = itemCounts[f.id] ?? 0;
            const isEditing = editingId === f.id;
            return (
              <li
                key={f.id}
                className="flex items-center gap-2 rounded-xl border border-border bg-card p-2"
              >
                {isEditing ? (
                  <div className="flex flex-1 flex-col gap-2 sm:flex-row">
                    <Input
                      value={draftEn}
                      onChange={(e) => setDraftEn(e.target.value)}
                      placeholder={t("portfolio.folderLabelEn")}
                      dir="ltr"
                    />
                    <Input
                      value={draftAr}
                      onChange={(e) => setDraftAr(e.target.value)}
                      placeholder={t("portfolio.folderLabelAr")}
                      dir="rtl"
                    />
                  </div>
                ) : (
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">
                      {locale === "ar" ? f.labelAr : f.labelEn}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {(locale === "ar" ? f.labelEn : f.labelAr) +
                        " · " +
                        t("portfolio.folderItemCount", { count })}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-1">
                  {isEditing ? (
                    <>
                      <IconBtn
                        label={t("portfolio.save")}
                        disabled={update.isPending}
                        onClick={() => saveEdit(f.id)}
                      >
                        <Check className="h-4 w-4" />
                      </IconBtn>
                      <IconBtn label={t("portfolio.cancel")} onClick={() => setEditingId(null)}>
                        <X className="h-4 w-4" />
                      </IconBtn>
                    </>
                  ) : (
                    <>
                      <IconBtn
                        label={t("portfolio.moveUp")}
                        disabled={i === 0 || update.isPending}
                        onClick={() => move(i, -1)}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </IconBtn>
                      <IconBtn
                        label={t("portfolio.moveDown")}
                        disabled={i === folders.length - 1 || update.isPending}
                        onClick={() => move(i, 1)}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </IconBtn>
                      <IconBtn label={t("portfolio.renameFolder")} onClick={() => startEdit(f)}>
                        <Pencil className="h-4 w-4" />
                      </IconBtn>
                      <IconBtn
                        label={t("portfolio.deleteFolder")}
                        destructive
                        disabled={remove.isPending}
                        onClick={() => del(f.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </IconBtn>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {/* Add folder — appended to the end; reorder up afterwards if needed. */}
        <div className="mt-2 flex flex-col gap-2 rounded-xl border border-dashed border-border p-3 sm:flex-row sm:items-center">
          <Input
            value={newEn}
            onChange={(e) => setNewEn(e.target.value)}
            placeholder={t("portfolio.folderLabelEn")}
            dir="ltr"
          />
          <Input
            value={newAr}
            onChange={(e) => setNewAr(e.target.value)}
            placeholder={t("portfolio.folderLabelAr")}
            dir="rtl"
          />
          <Button
            type="button"
            variant="gradient"
            disabled={!newEn.trim() || !newAr.trim() || create.isPending}
            onClick={add}
            className="shrink-0"
          >
            {create.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {t("portfolio.addFolder")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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
