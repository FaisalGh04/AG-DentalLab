"use client";

import * as React from "react";
import {
  Stethoscope,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Loader2,
  Copy,
  Check,
  EyeOff,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useAdminI18n } from "@/components/i18n/admin-i18n";
import {
  useDoctors,
  useCreateDoctor,
  useUpdateDoctor,
  useRotateDoctorCode,
  useDeleteDoctor,
} from "@/hooks/use-doctors";
import { suggestLetters, withDoctorPrefix, buildCode } from "@/lib/doctor-code";
import { formatDate, cn } from "@/lib/utils";
import type { DoctorDTO } from "@/types/doctor";

export function DoctorsClient() {
  const { t } = useAdminI18n();
  const { data: doctors, isLoading } = useDoctors();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<DoctorDTO | null>(null);
  const [deleting, setDeleting] = React.useState<DoctorDTO | null>(null);
  const [rotating, setRotating] = React.useState<DoctorDTO | null>(null);

  if (isLoading) return <Skeleton className="mx-auto h-96 max-w-4xl" />;

  const list = doctors ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
            <Stethoscope className="h-6 w-6 text-brand-700" />
            {t("doctors.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("doctors.subtitle")}</p>
        </div>
        <Button variant="gradient" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> {t("doctors.add")}
        </Button>
      </div>

      <Card className="overflow-hidden">
        {list.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">
            {t("doctors.empty")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border/80 bg-muted/30 text-start text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">{t("doctors.colName")}</th>
                  <th className="px-4 py-3 font-semibold">{t("doctors.colCode")}</th>
                  <th className="px-4 py-3 font-semibold">{t("doctors.colCases")}</th>
                  <th className="px-4 py-3 font-semibold">{t("doctors.colStatus")}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {list.map((d) => (
                  <DoctorRow
                    key={d.id}
                    doctor={d}
                    onEdit={() => setEditing(d)}
                    onDelete={() => setDeleting(d)}
                    onRotate={() => setRotating(d)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <CreateDoctorDialog open={createOpen} onOpenChange={setCreateOpen} nextSequence={
        list.reduce((m, d) => Math.max(m, d.sequence), 0) + 1
      } />
      {editing && (
        <EditDoctorDialog
          doctor={editing}
          open
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}
      {deleting && (
        <DeleteDoctorDialog
          doctor={deleting}
          onDone={() => setDeleting(null)}
        />
      )}
      {rotating && (
        <RotateCodeDialog doctor={rotating} onDone={() => setRotating(null)} />
      )}
    </div>
  );
}

function DoctorRow({
  doctor,
  onEdit,
  onDelete,
  onRotate,
}: {
  doctor: DoctorDTO;
  onEdit: () => void;
  onDelete: () => void;
  onRotate: () => void;
}) {
  const { t } = useAdminI18n();
  const [copied, setCopied] = React.useState(false);

  return (
    <tr className={cn("border-b border-border/60", !doctor.isActive && "opacity-60")}>
      <td className="px-4 py-3 text-muted-foreground">
        {String(doctor.sequence).padStart(3, "0")}
      </td>
      <td className="px-4 py-3 font-medium text-ink">{doctor.name}</td>
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(doctor.code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          title={t("doctors.copyCode")}
          className="inline-flex items-center gap-1.5 rounded-lg bg-muted/50 px-2 py-1 font-mono text-xs hover:bg-muted"
        >
          {doctor.code}
          {copied ? (
            <Check className="h-3 w-3 text-brand-600" />
          ) : (
            <Copy className="h-3 w-3 opacity-60" />
          )}
        </button>
        {doctor.codeRotatedAt && (
          <span className="ms-2 text-[11px] text-muted-foreground">
            {t("doctors.rotatedOn")} {formatDate(doctor.codeRotatedAt)}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-muted-foreground">{doctor.caseCount}</td>
      <td className="px-4 py-3">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
            doctor.isActive
              ? "bg-brand-50 text-brand-700"
              : "bg-muted text-muted-foreground",
          )}
        >
          {doctor.isActive ? (
            <Eye className="h-3 w-3" />
          ) : (
            <EyeOff className="h-3 w-3" />
          )}
          {doctor.isActive ? t("doctors.active") : t("doctors.inactive")}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={onEdit} title={t("doctors.edit")}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onRotate} title={t("doctors.rotate")}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            title={t("doctors.delete")}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

function CreateDoctorDialog({
  open,
  onOpenChange,
  nextSequence,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  nextSequence: number;
}) {
  const { t } = useAdminI18n();
  const create = useCreateDoctor();
  const [name, setName] = React.useState("");
  const [letters, setLetters] = React.useState("");
  // True once the admin edits the letters, so we stop overwriting their choice.
  const [lettersTouched, setLettersTouched] = React.useState(false);

  const suggestion = React.useMemo(() => suggestLetters(name), [name]);

  React.useEffect(() => {
    if (!lettersTouched) setLetters(suggestion.letters);
  }, [suggestion.letters, lettersTouched]);

  React.useEffect(() => {
    if (!open) {
      setName("");
      setLetters("");
      setLettersTouched(false);
    }
  }, [open]);

  const valid = name.trim().length >= 2 && /^[a-z]{3}$/.test(letters);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    try {
      const d = await create.mutateAsync({ name, codeLetters: letters });
      toast.success(t("doctors.toastCreated", { code: d.code }));
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("doctors.toastError"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("doctors.addTitle")}</DialogTitle>
          <DialogDescription>{t("doctors.addDesc")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("doctors.name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("doctors.namePlaceholder")}
              autoFocus
            />
            {name.trim() && (
              <p className="text-xs text-muted-foreground">
                {t("doctors.storedAs")}{" "}
                <span className="font-medium text-ink">{withDoctorPrefix(name)}</span>
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>{t("doctors.codeLetters")}</Label>
            <Input
              value={letters}
              onChange={(e) => {
                setLettersTouched(true);
                setLetters(e.target.value.toLowerCase().replace(/[^a-z]/g, "").slice(0, 3));
              }}
              placeholder="abc"
              className="font-mono"
              maxLength={3}
            />
            <p className="text-xs text-muted-foreground">
              {t("doctors.lettersHint")}
              {suggestion.needsReview && suggestion.reason && (
                <span className="ms-1 text-amber-600">
                  ({t("doctors.lettersGuess")})
                </span>
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-brand-100 bg-brand-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("doctors.codePreview")}
            </p>
            <p className="mt-1 font-mono font-medium text-ink">
              {letters.length === 3
                ? buildCode(letters, nextSequence, "••••")
                : t("doctors.codePreviewPending")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("doctors.codePreviewNote")}
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t("doctors.cancel")}
            </Button>
            <Button type="submit" variant="gradient" disabled={!valid || create.isPending}>
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("doctors.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditDoctorDialog({
  doctor,
  open,
  onOpenChange,
}: {
  doctor: DoctorDTO;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { t } = useAdminI18n();
  const update = useUpdateDoctor(doctor.id);
  const [name, setName] = React.useState(doctor.name);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await update.mutateAsync({ name });
      toast.success(t("doctors.toastUpdated"));
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("doctors.toastError"));
    }
  }

  async function toggleActive() {
    try {
      await update.mutateAsync({ isActive: !doctor.isActive });
      toast.success(t("doctors.toastUpdated"));
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("doctors.toastError"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("doctors.editTitle")}</DialogTitle>
          <DialogDescription>{t("doctors.editDesc")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("doctors.name")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          {/* Code and sequence are immutable once issued — cases and anything
              already written down or spoken depend on them. */}
          <div className="rounded-2xl border border-border bg-muted/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("doctors.colCode")}
            </p>
            <p className="mt-1 font-mono font-medium text-ink">{doctor.code}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("doctors.codeImmutable")}
            </p>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={toggleActive} disabled={update.isPending}>
              {doctor.isActive ? t("doctors.deactivate") : t("doctors.activate")}
            </Button>
            <div className="flex gap-2 sm:ms-auto">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                {t("doctors.cancel")}
              </Button>
              <Button type="submit" variant="gradient" disabled={update.isPending}>
                {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("doctors.save")}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDoctorDialog({
  doctor,
  onDone,
}: {
  doctor: DoctorDTO;
  onDone: () => void;
}) {
  const { t } = useAdminI18n();
  const del = useDeleteDoctor();

  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onDone()}
      title={t("doctors.deleteTitle")}
      description={
        doctor.caseCount > 0
          ? t("doctors.deleteWithCases", { count: doctor.caseCount, name: doctor.name })
          : t("doctors.deleteNoCases", { name: doctor.name })
      }
      confirmLabel={t("doctors.delete")}
      destructive
      onConfirm={async () => {
        try {
          const res = await del.mutateAsync(doctor.id);
          toast.success(
            res.unlinkedCases > 0
              ? t("doctors.toastDeletedWithCases", { count: res.unlinkedCases })
              : t("doctors.toastDeleted"),
          );
        } catch (err) {
          toast.error(err instanceof Error ? err.message : t("doctors.toastError"));
        } finally {
          onDone();
        }
      }}
    />
  );
}

function RotateCodeDialog({ doctor, onDone }: { doctor: DoctorDTO; onDone: () => void }) {
  const { t } = useAdminI18n();
  const rotate = useRotateDoctorCode(doctor.id);

  return (
    <ConfirmDialog
      open
      onOpenChange={(o) => !o && onDone()}
      title={t("doctors.rotateTitle")}
      description={t("doctors.rotateDesc", { code: doctor.code })}
      confirmLabel={t("doctors.rotate")}
      onConfirm={async () => {
        try {
          const d = await rotate.mutateAsync();
          toast.success(t("doctors.toastRotated", { code: d.code }));
        } catch (err) {
          toast.error(err instanceof Error ? err.message : t("doctors.toastError"));
        } finally {
          onDone();
        }
      }}
    />
  );
}
