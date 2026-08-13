"use client";

import * as React from "react";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Tags,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useAdminI18n } from "@/components/i18n/admin-i18n";
import {
  useCaseTaxonomy,
  useCreateCaseType,
  useDeleteCaseType,
  useUpdateCaseCategoryConfig,
  useUpdateCaseType,
} from "@/hooks/use-case-taxonomy";
import { cn } from "@/lib/utils";
import type {
  CaseCategoryConfigDTO,
  CaseTypeOptionDTO,
} from "@/types/case-taxonomy";

export function CaseTypesClient() {
  const { t, locale } = useAdminI18n();
  const taxonomy = useCaseTaxonomy();
  const updateCategory = useUpdateCaseCategoryConfig();
  const createType = useCreateCaseType();
  const updateType = useUpdateCaseType();
  const deleteType = useDeleteCaseType();
  const [categoryEdit, setCategoryEdit] =
    React.useState<CaseCategoryConfigDTO | null>(null);
  const [typeEdit, setTypeEdit] = React.useState<CaseTypeOptionDTO | null>(null);
  const [newNames, setNewNames] = React.useState<Record<string, string>>({});
  const [deleting, setDeleting] = React.useState<CaseTypeOptionDTO | null>(null);

  const fail = (error: unknown) =>
    toast.error(error instanceof Error ? error.message : t("caseTypes.toastError"));

  async function saveCategory() {
    if (!categoryEdit) return;
    try {
      await updateCategory.mutateAsync({
        category: categoryEdit.category,
        input: {
          labelEn: categoryEdit.labelEn,
          labelAr: categoryEdit.labelAr,
        },
      });
      setCategoryEdit(null);
      toast.success(t("caseTypes.categorySaved"));
    } catch (error) {
      fail(error);
    }
  }

  async function addType(category: CaseCategoryConfigDTO) {
    const name = newNames[category.category]?.trim();
    if (!name) return;
    try {
      await createType.mutateAsync({ category: category.category, input: { name } });
      setNewNames((current) => ({ ...current, [category.category]: "" }));
      toast.success(t("caseTypes.typeAdded"));
    } catch (error) {
      fail(error);
    }
  }

  async function saveType() {
    if (!typeEdit?.name.trim()) return;
    try {
      await updateType.mutateAsync({
        id: typeEdit.id,
        input: { name: typeEdit.name.trim() },
      });
      setTypeEdit(null);
      toast.success(t("caseTypes.typeSaved"));
    } catch (error) {
      fail(error);
    }
  }

  async function toggle(type: CaseTypeOptionDTO) {
    try {
      await updateType.mutateAsync({
        id: type.id,
        input: { isActive: !type.isActive },
      });
      toast.success(
        type.isActive ? t("caseTypes.deactivated") : t("caseTypes.activated"),
      );
    } catch (error) {
      fail(error);
    }
  }

  async function remove() {
    if (!deleting) return;
    try {
      await deleteType.mutateAsync(deleting.id);
      setDeleting(null);
      toast.success(t("caseTypes.deleted"));
    } catch (error) {
      fail(error);
    }
  }

  if (taxonomy.isLoading) return <Skeleton className="mx-auto h-96 max-w-5xl" />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
          <Tags className="h-6 w-6 text-brand-700" />
          {t("caseTypes.title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("caseTypes.subtitle")}</p>
      </header>

      {taxonomy.isError && (
        <Card className="flex flex-col items-center gap-3 p-8 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <div>
            <p className="font-medium text-destructive">
              {t("caseTypes.loadError")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {taxonomy.error instanceof Error
                ? taxonomy.error.message
                : t("caseTypes.toastError")}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => taxonomy.refetch()}
            disabled={taxonomy.isFetching}
          >
            {taxonomy.isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {t("caseTypes.retry")}
          </Button>
        </Card>
      )}

      {(taxonomy.data?.categories ?? []).map((category) => {
        const editingCategory = categoryEdit?.category === category.category;
        return (
          <Card key={category.category} className="space-y-4 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1">
                {editingCategory ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      value={categoryEdit.labelEn}
                      onChange={(event) =>
                        setCategoryEdit({ ...categoryEdit, labelEn: event.target.value })
                      }
                      placeholder={t("caseTypes.labelEn")}
                      dir="ltr"
                    />
                    <Input
                      value={categoryEdit.labelAr}
                      onChange={(event) =>
                        setCategoryEdit({ ...categoryEdit, labelAr: event.target.value })
                      }
                      placeholder={t("caseTypes.labelAr")}
                      dir="rtl"
                    />
                  </div>
                ) : (
                  <>
                    <h2 className="font-display text-lg font-bold text-ink">
                      {locale === "ar" ? category.labelAr : category.labelEn}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {category.category}
                    </p>
                  </>
                )}
              </div>
              {editingCategory ? (
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveCategory}>
                    {t("caseTypes.save")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setCategoryEdit(null)}>
                    {t("caseTypes.cancel")}
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setCategoryEdit(category)}>
                  <Pencil className="h-3.5 w-3.5" />
                  {t("caseTypes.editLabels")}
                </Button>
              )}
            </div>

            <div className="divide-y divide-border rounded-xl border border-border">
              {category.caseTypes.map((type) => (
                <CaseTypeRow
                  key={type.id}
                  type={type}
                  editing={typeEdit?.id === type.id ? typeEdit : null}
                  setEditing={setTypeEdit}
                  save={saveType}
                  toggle={() => toggle(type)}
                  remove={() => setDeleting(type)}
                  pending={updateType.isPending}
                />
              ))}
              {category.caseTypes.length === 0 && (
                <p className="p-4 text-sm text-muted-foreground">
                  {t("caseTypes.empty")}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={newNames[category.category] ?? ""}
                onChange={(event) =>
                  setNewNames((current) => ({
                    ...current,
                    [category.category]: event.target.value,
                  }))
                }
                placeholder={t("caseTypes.newPlaceholder")}
              />
              <Button
                variant="gradient"
                disabled={
                  !newNames[category.category]?.trim() || createType.isPending
                }
                onClick={() => addType(category)}
              >
                <Plus className="h-4 w-4" />
                {t("caseTypes.add")}
              </Button>
            </div>
          </Card>
        );
      })}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("caseTypes.deleteTitle")}
        description={t("caseTypes.deleteDescription", {
          name: deleting?.name ?? "",
        })}
        confirmLabel={t("caseTypes.delete")}
        destructive
        loading={deleteType.isPending}
        onConfirm={remove}
      />
    </div>
  );
}

function CaseTypeRow({
  type,
  editing,
  setEditing,
  save,
  toggle,
  remove,
  pending,
}: {
  type: CaseTypeOptionDTO;
  editing: CaseTypeOptionDTO | null;
  setEditing: (type: CaseTypeOptionDTO | null) => void;
  save: () => void;
  toggle: () => void;
  remove: () => void;
  pending: boolean;
}) {
  const { t } = useAdminI18n();

  return (
    <div
      className={cn(
        "flex flex-col gap-2 p-3 sm:flex-row sm:items-center",
        !type.isActive && "bg-muted/30 text-muted-foreground",
      )}
    >
      <div className="min-w-0 flex-1">
        {editing ? (
          <Input
            value={editing.name}
            onChange={(event) =>
              setEditing({ ...editing, name: event.target.value })
            }
          />
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{type.name}</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] font-medium",
                type.isActive
                  ? "bg-brand-50 text-brand-700"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {type.isActive ? t("caseTypes.active") : t("caseTypes.inactive")}
            </span>
            {type.inUseCount > 0 && (
              <span className="text-xs text-muted-foreground">
                {t("caseTypes.inUse", { count: type.inUseCount })}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-1">
        {editing ? (
          <>
            <Button size="sm" onClick={save} disabled={!editing.name.trim() || pending}>
              {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t("caseTypes.save")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
              {t("caseTypes.cancel")}
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="ghost" onClick={() => setEditing(type)}>
              <Pencil className="h-3.5 w-3.5" />
              {t("caseTypes.rename")}
            </Button>
            <Button size="sm" variant="ghost" onClick={toggle} disabled={pending}>
              {type.isActive ? (
                <EyeOff className="h-3.5 w-3.5" />
              ) : (
                <Eye className="h-3.5 w-3.5" />
              )}
              {type.isActive
                ? t("caseTypes.deactivate")
                : t("caseTypes.activate")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={remove}
              disabled={type.inUseCount > 0}
              title={
                type.inUseCount > 0
                  ? t("caseTypes.deleteBlocked")
                  : t("caseTypes.delete")
              }
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
