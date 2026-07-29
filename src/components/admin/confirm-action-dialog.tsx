"use client";

import * as React from "react";
import { Loader2, ShieldCheck, UserCheck, KeyRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStaff } from "@/hooks/use-staff";
import { useAdminI18n } from "@/components/i18n/admin-i18n";
import type { ConfirmationInputDTO } from "@/lib/validations";

export interface ConfirmIntent {
  /** Short human summary of the transition, e.g. "Try-in → Packaging". */
  summary: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intent: ConfirmIntent | null;
  /**
   * The REAL mutation. The dialog owns pending/error state and closes only when
   * this resolves — nothing is applied optimistically, so the UI can never show
   * a transition the server rejected.
   */
  perform: (confirmation: ConfirmationInputDTO) => Promise<unknown>;
  onDone?: () => void;
}

type Pane = "staff" | "manager";

export function ConfirmActionDialog({
  open,
  onOpenChange,
  intent,
  perform,
  onDone,
}: Props) {
  const { t } = useAdminI18n();
  const staff = useStaff();

  const [pane, setPane] = React.useState<Pane>("staff");
  const [staffId, setStaffId] = React.useState("");
  const [staffPassword, setStaffPassword] = React.useState("");
  const [managerCode, setManagerCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  // Never leave secrets in component state between openings.
  const reset = React.useCallback(() => {
    setPane("staff");
    setStaffId("");
    setStaffPassword("");
    setManagerCode("");
    setError(null);
    setPending(false);
  }, []);

  React.useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  const staffName = (staff.data ?? []).find((s) => s.id === staffId)?.name ?? "";

  function goToManager(e: React.FormEvent) {
    e.preventDefault();
    if (!staffId || !staffPassword) {
      setError(t("confirm.staffRequired"));
      return;
    }
    setError(null);
    setPane("manager");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!managerCode) {
      setError(t("confirm.managerRequired"));
      return;
    }
    setPending(true);
    setError(null);
    try {
      await perform({ staffId, staffPassword, managerCode });
      onOpenChange(false);
      onDone?.();
    } catch (err) {
      // ONE generic message regardless of which factor failed — surfacing
      // "wrong password" vs "wrong code" would make this dialog an oracle.
      // Server-side lockout/throttle messages are passed through as-is since
      // they reveal nothing about which secret was wrong.
      const msg = err instanceof Error ? err.message : "";
      setError(/too many|locked/i.test(msg) ? msg : t("confirm.failed"));
      // Clear BOTH panes: a retry re-authenticates from scratch.
      setStaffPassword("");
      setManagerCode("");
      setPane("staff");
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand-700" />
            {t("confirm.title")}
          </DialogTitle>
          <DialogDescription>{t("confirm.desc")}</DialogDescription>
        </DialogHeader>

        {/* The intent is shown in BOTH panes so the manager is approving a
            specific, named transition — never a blank code prompt. */}
        {intent && (
          <div className="rounded-2xl border border-brand-100 bg-brand-50/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("confirm.action")}
            </p>
            <p className="mt-1 font-medium text-ink">{intent.summary}</p>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <StepDot active={pane === "staff"} done={pane === "manager"} />
          <span>{t("confirm.step1")}</span>
          <span className="mx-1 opacity-40">—</span>
          <StepDot active={pane === "manager"} done={false} />
          <span>{t("confirm.step2")}</span>
        </div>

        {pane === "staff" ? (
          <form onSubmit={goToManager} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5" />
                {t("confirm.staffName")}
              </Label>
              <Select value={staffId} onValueChange={setStaffId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("confirm.selectStaff")} />
                </SelectTrigger>
                <SelectContent>
                  {(staff.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{t("confirm.staffPassword")}</Label>
              <Input
                type="password"
                autoComplete="off"
                value={staffPassword}
                onChange={(e) => setStaffPassword(e.target.value)}
                placeholder={t("confirm.staffPasswordPlaceholder")}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                {t("confirm.cancel")}
              </Button>
              <Button type="submit" variant="gradient">
                {t("confirm.next")}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="rounded-xl bg-muted/40 px-3 py-2 text-sm">
              {t("confirm.performedBy")}{" "}
              <span className="font-medium text-ink">{staffName}</span>
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <KeyRound className="h-3.5 w-3.5" />
                {t("confirm.managerCode")}
              </Label>
              <Input
                type="password"
                autoComplete="off"
                value={managerCode}
                onChange={(e) => setManagerCode(e.target.value)}
                placeholder={t("confirm.managerCodePlaceholder")}
                disabled={pending}
              />
              <p className="text-xs text-muted-foreground">
                {t("confirm.managerHint")}
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => {
                  setPane("staff");
                  setError(null);
                }}
              >
                {t("confirm.back")}
              </Button>
              <Button type="submit" variant="gradient" disabled={pending}>
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("confirm.approve")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StepDot({ active, done }: { active: boolean; done: boolean }) {
  return (
    <span
      className={
        "inline-block h-2 w-2 rounded-full " +
        (active ? "bg-brand-600" : done ? "bg-brand-300" : "bg-border")
      }
    />
  );
}
