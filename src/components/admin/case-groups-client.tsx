"use client";

import * as React from "react";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAdminI18n } from "@/components/i18n/admin-i18n";
import { ApiError } from "@/lib/fetcher";
import {
  useCaseGroupsTree,
  useCreateCaseGroup,
  useUpdateCaseGroup,
  useDeleteCaseGroup,
  useCreateStageSet,
  useUpdateStageSet,
  useDeleteStageSet,
  useCreateStage,
  useUpdateStage,
  useDeleteStage,
} from "@/hooks/use-case-groups";
import type {
  CaseGroupNode,
  CaseStageSetNode,
  CaseStageNode,
} from "@/types/case-groups";

type EditKind = "group" | "set" | "stage";
type Editing = { kind: EditKind; id: string; en: string; ar: string } | null;

const TYPES = ["REGULAR", "DIGITAL"] as const;

export function CaseGroupsClient() {
  const { t, locale } = useAdminI18n();
  const isAr = locale === "ar";
  const L = (o: { labelEn: string; labelAr: string }) => (isAr ? o.labelAr : o.labelEn);

  const { data, isLoading, isError } = useCaseGroupsTree();
  const groups = data?.groups ?? [];

  const createGroup = useCreateCaseGroup();
  const updateGroup = useUpdateCaseGroup();
  const deleteGroup = useDeleteCaseGroup();
  const createSet = useCreateStageSet();
  const updateSet = useUpdateStageSet();
  const deleteSet = useDeleteStageSet();
  const createStage = useCreateStage();
  const updateStage = useUpdateStage();
  const deleteStage = useDeleteStage();

  const [editing, setEditing] = React.useState<Editing>(null);
  const [newGroupEn, setNewGroupEn] = React.useState("");
  const [newGroupAr, setNewGroupAr] = React.useState("");
  const [addStageFor, setAddStageFor] = React.useState<string | null>(null);
  const [stageEn, setStageEn] = React.useState("");
  const [stageAr, setStageAr] = React.useState("");

  const err = (e: unknown) =>
    toast.error(e instanceof ApiError ? e.message : t("groups.toastError"));

  async function saveEdit() {
    if (!editing || !editing.en.trim() || !editing.ar.trim()) return;
    const input = { labelEn: editing.en.trim(), labelAr: editing.ar.trim() };
    try {
      if (editing.kind === "group") await updateGroup.mutateAsync({ id: editing.id, input });
      else if (editing.kind === "set") await updateSet.mutateAsync({ id: editing.id, input });
      else await updateStage.mutateAsync({ id: editing.id, input });
      setEditing(null);
      toast.success(t("groups.toastSaved"));
    } catch (e) {
      err(e);
    }
  }

  async function swap<T extends { id: string; order: number }>(
    list: T[],
    i: number,
    dir: -1 | 1,
    mutate: (id: string, order: number) => Promise<unknown>,
  ) {
    const a = list[i];
    const b = list[i + dir];
    if (!a || !b) return;
    try {
      await Promise.all([mutate(a.id, b.order), mutate(b.id, a.order)]);
    } catch (e) {
      err(e);
    }
  }

  async function addGroup() {
    if (!newGroupEn.trim() || !newGroupAr.trim()) return;
    try {
      await createGroup.mutateAsync({ labelEn: newGroupEn.trim(), labelAr: newGroupAr.trim() });
      setNewGroupEn("");
      setNewGroupAr("");
      toast.success(t("groups.toastGroupAdded"));
    } catch (e) {
      err(e);
    }
  }

  async function addWorkflow(group: CaseGroupNode, type: (typeof TYPES)[number]) {
    const label = type === "DIGITAL" ? "Digital" : "Regular";
    const labelAr = type === "DIGITAL" ? "رقمي" : "تقليدي";
    try {
      await createSet.mutateAsync({
        groupId: group.id,
        input: {
          type,
          labelEn: `${group.labelEn} — ${label}`,
          labelAr: `${group.labelAr} — ${labelAr}`,
        },
      });
      toast.success(t("groups.toastWorkflowAdded"));
    } catch (e) {
      err(e);
    }
  }

  async function addStage(setId: string) {
    if (!stageEn.trim() || !stageAr.trim()) return;
    try {
      await createStage.mutateAsync({
        stageSetId: setId,
        input: { labelEn: stageEn.trim(), labelAr: stageAr.trim() },
      });
      setStageEn("");
      setStageAr("");
      setAddStageFor(null);
      toast.success(t("groups.toastStageAdded"));
    } catch (e) {
      err(e);
    }
  }

  async function del(
    kind: EditKind,
    id: string,
    fn: (id: string) => Promise<unknown>,
  ) {
    try {
      await fn(id);
      toast.success(t("groups.toastDeleted"));
    } catch (e) {
      err(e);
    }
  }

  const editInputs = (kind: EditKind, id: string) =>
    !!(editing && editing.kind === kind && editing.id === id);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-bold text-ink">{t("groups.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("groups.subtitle")}</p>
      </header>

      {isLoading && (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}
      {isError && (
        <p className="py-16 text-center text-destructive">{t("groups.loadError")}</p>
      )}

      {!isLoading &&
        !isError &&
        groups.map((group, gi) => (
          <Card key={group.id} className="space-y-4 p-4">
            {/* Group header */}
            <div className="flex items-center gap-2">
              <div className="flex flex-col">
                <IconBtn
                  label={t("groups.moveUp")}
                  disabled={gi === 0 || updateGroup.isPending}
                  onClick={() =>
                    swap(groups, gi, -1, (id, order) =>
                      updateGroup.mutateAsync({ id, input: { order } }),
                    )
                  }
                >
                  <ArrowUp className="h-4 w-4" />
                </IconBtn>
                <IconBtn
                  label={t("groups.moveDown")}
                  disabled={gi === groups.length - 1 || updateGroup.isPending}
                  onClick={() =>
                    swap(groups, gi, 1, (id, order) =>
                      updateGroup.mutateAsync({ id, input: { order } }),
                    )
                  }
                >
                  <ArrowDown className="h-4 w-4" />
                </IconBtn>
              </div>

              {editInputs("group", group.id) ? (
                <EditFields editing={editing!} setEditing={setEditing} />
              ) : (
                <h2 className="min-w-0 flex-1 truncate font-display text-lg font-bold text-ink">
                  {L(group)}
                </h2>
              )}

              <RowActions
                editing={editInputs("group", group.id)}
                onSave={saveEdit}
                onCancel={() => setEditing(null)}
                onEdit={() =>
                  setEditing({ kind: "group", id: group.id, en: group.labelEn, ar: group.labelAr })
                }
                onDelete={() => del("group", group.id, deleteGroup.mutateAsync)}
                deleteDisabled={group.stageSets.length > 0}
                deleteTitle={
                  group.stageSets.length > 0 ? t("groups.deleteGroupBlocked") : t("groups.deleteGroup")
                }
                t={t}
              />
            </div>

            {/* Two workflow slots */}
            <div className="grid gap-3 sm:grid-cols-2">
              {TYPES.map((type) => {
                const set = group.stageSets.find((s) => s.type === type);
                return (
                  <div key={type} className="rounded-xl border border-border bg-muted/20 p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-brand-600">
                        {t(`groups.type.${type}`)}
                      </span>
                      {set &&
                        (editInputs("set", set.id) ? (
                          <EditFields editing={editing!} setEditing={setEditing} />
                        ) : (
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                            {L(set)}
                          </span>
                        ))}
                      {set && (
                        <RowActions
                          editing={editInputs("set", set.id)}
                          onSave={saveEdit}
                          onCancel={() => setEditing(null)}
                          onEdit={() =>
                            setEditing({ kind: "set", id: set.id, en: set.labelEn, ar: set.labelAr })
                          }
                          onDelete={() => del("set", set.id, deleteSet.mutateAsync)}
                          deleteDisabled={set.caseCount > 0 || set.stages.length > 0}
                          deleteTitle={
                            set.caseCount > 0 || set.stages.length > 0
                              ? t("groups.deleteWorkflowBlocked")
                              : t("groups.deleteWorkflow")
                          }
                          t={t}
                        />
                      )}
                    </div>

                    {set ? (
                      <StageList
                        set={set}
                        isAr={isAr}
                        t={t}
                        editing={editing}
                        setEditing={setEditing}
                        editInputs={editInputs}
                        saveEdit={saveEdit}
                        onDeleteStage={(id) => del("stage", id, deleteStage.mutateAsync)}
                        onMove={(i, dir) =>
                          swap(set.stages, i, dir, (id, order) =>
                            updateStage.mutateAsync({ id, input: { order } }),
                          )
                        }
                        addStageFor={addStageFor}
                        setAddStageFor={setAddStageFor}
                        stageEn={stageEn}
                        setStageEn={setStageEn}
                        stageAr={stageAr}
                        setStageAr={setStageAr}
                        onAddStage={() => addStage(set.id)}
                        pending={updateStage.isPending}
                      />
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={createSet.isPending}
                        onClick={() => addWorkflow(group, type)}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4" />
                        {t("groups.addWorkflow", { type: t(`groups.type.${type}`) })}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        ))}

      {/* Add group */}
      {!isLoading && !isError && (
        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border p-3 sm:flex-row sm:items-center">
          <Input value={newGroupEn} onChange={(e) => setNewGroupEn(e.target.value)} placeholder={t("groups.nameEn")} dir="ltr" />
          <Input value={newGroupAr} onChange={(e) => setNewGroupAr(e.target.value)} placeholder={t("groups.nameAr")} dir="rtl" />
          <Button
            type="button"
            variant="gradient"
            disabled={!newGroupEn.trim() || !newGroupAr.trim() || createGroup.isPending}
            onClick={addGroup}
            className="shrink-0"
          >
            {createGroup.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {t("groups.addGroup")}
          </Button>
        </div>
      )}
    </div>
  );
}

function StageList({
  set,
  isAr,
  t,
  editing,
  setEditing,
  editInputs,
  saveEdit,
  onDeleteStage,
  onMove,
  addStageFor,
  setAddStageFor,
  stageEn,
  setStageEn,
  stageAr,
  setStageAr,
  onAddStage,
  pending,
}: {
  set: CaseStageSetNode;
  isAr: boolean;
  t: (k: string, v?: Record<string, string | number>) => string;
  editing: Editing;
  setEditing: (e: Editing) => void;
  editInputs: (kind: EditKind, id: string) => boolean;
  saveEdit: () => void;
  onDeleteStage: (id: string) => void;
  onMove: (i: number, dir: -1 | 1) => void;
  addStageFor: string | null;
  setAddStageFor: (id: string | null) => void;
  stageEn: string;
  setStageEn: (v: string) => void;
  stageAr: string;
  setStageAr: (v: string) => void;
  onAddStage: () => void;
  pending: boolean;
}) {
  const L = (o: CaseStageNode) => (isAr ? o.labelAr : o.labelEn);
  return (
    <div className="space-y-1.5">
      {set.stages.length === 0 && (
        <p className="px-1 py-1 text-xs text-muted-foreground">{t("groups.noStages")}</p>
      )}
      {set.stages.map((stage, si) => (
        <div key={stage.id} className="flex items-center gap-1 rounded-lg bg-card px-1.5 py-1">
          <div className="flex flex-col">
            <IconBtn label={t("groups.moveUp")} disabled={si === 0 || pending} onClick={() => onMove(si, -1)}>
              <ArrowUp className="h-3.5 w-3.5" />
            </IconBtn>
            <IconBtn label={t("groups.moveDown")} disabled={si === set.stages.length - 1 || pending} onClick={() => onMove(si, 1)}>
              <ArrowDown className="h-3.5 w-3.5" />
            </IconBtn>
          </div>
          {editInputs("stage", stage.id) ? (
            <EditFields editing={editing!} setEditing={setEditing} />
          ) : (
            <span className="min-w-0 flex-1 truncate text-sm text-ink">{L(stage)}</span>
          )}
          {!editInputs("stage", stage.id) && stage.inUseCount > 0 && (
            <span
              className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[0.65rem] font-medium text-amber-700"
              title={t("groups.inUse", { count: stage.inUseCount })}
            >
              {t("groups.inUse", { count: stage.inUseCount })}
            </span>
          )}
          <RowActions
            editing={editInputs("stage", stage.id)}
            onSave={saveEdit}
            onCancel={() => setEditing(null)}
            onEdit={() => setEditing({ kind: "stage", id: stage.id, en: stage.labelEn, ar: stage.labelAr })}
            onDelete={() => onDeleteStage(stage.id)}
            deleteDisabled={stage.inUseCount > 0}
            deleteTitle={stage.inUseCount > 0 ? t("groups.deleteStageBlocked") : t("groups.deleteStage")}
            t={t}
            small
          />
        </div>
      ))}

      {addStageFor === set.id ? (
        <div className="flex flex-col gap-1.5 rounded-lg border border-dashed border-border p-2">
          <Input value={stageEn} onChange={(e) => setStageEn(e.target.value)} placeholder={t("groups.nameEn")} dir="ltr" className="h-8" />
          <Input value={stageAr} onChange={(e) => setStageAr(e.target.value)} placeholder={t("groups.nameAr")} dir="rtl" className="h-8" />
          <div className="flex gap-1">
            <Button type="button" size="sm" disabled={!stageEn.trim() || !stageAr.trim()} onClick={onAddStage} className="h-7">
              <Check className="h-3.5 w-3.5" />
              {t("groups.save")}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setAddStageFor(null)} className="h-7">
              {t("groups.cancel")}
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" variant="ghost" size="sm" onClick={() => setAddStageFor(set.id)} className="h-7 w-full justify-start text-muted-foreground">
          <Plus className="h-3.5 w-3.5" />
          {t("groups.addStage")}
        </Button>
      )}
    </div>
  );
}

function EditFields({ editing, setEditing }: { editing: NonNullable<Editing>; setEditing: (e: Editing) => void }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row">
      <Input value={editing.en} onChange={(e) => setEditing({ ...editing, en: e.target.value })} dir="ltr" className="h-8" />
      <Input value={editing.ar} onChange={(e) => setEditing({ ...editing, ar: e.target.value })} dir="rtl" className="h-8" />
    </div>
  );
}

function RowActions({
  editing,
  onSave,
  onCancel,
  onEdit,
  onDelete,
  deleteDisabled,
  deleteTitle,
  t,
  small,
}: {
  editing: boolean;
  onSave: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onDelete: () => void;
  deleteDisabled?: boolean;
  deleteTitle: string;
  t: (k: string) => string;
  small?: boolean;
}) {
  const sz = small ? "h-3.5 w-3.5" : "h-4 w-4";
  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <IconBtn label={t("groups.save")} onClick={onSave}><Check className={sz} /></IconBtn>
        <IconBtn label={t("groups.cancel")} onClick={onCancel}><X className={sz} /></IconBtn>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <IconBtn label={t("groups.rename")} onClick={onEdit}><Pencil className={sz} /></IconBtn>
      <IconBtn label={deleteTitle} title={deleteTitle} destructive disabled={deleteDisabled} onClick={onDelete}>
        <Trash2 className={sz} />
      </IconBtn>
    </div>
  );
}

function IconBtn({
  label,
  title,
  onClick,
  disabled,
  destructive,
  children,
}: {
  label: string;
  title?: string;
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
      title={title ?? label}
      disabled={disabled}
      onClick={onClick}
      className={destructive ? "h-7 w-7 text-destructive hover:bg-destructive/10" : "h-7 w-7"}
    >
      {children}
    </Button>
  );
}
