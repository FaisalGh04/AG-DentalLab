"use client";

import * as React from "react";
import { Check, Copy, KeyRound, Loader2, ShieldAlert, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminI18n } from "@/components/i18n/admin-i18n";
import {
  useAdminAccounts,
  useChangeOwnerPassword,
  useResetAdminPassword,
  type AdminAccountDTO,
} from "@/hooks/use-admin-passwords";

/**
 * Admin ACCOUNT password management inside Admin Settings.
 *
 * Every mutation is manager-gated SERVER-SIDE and independent of the staff
 * confirmation toggle; nothing here is enforced by this component. In
 * particular `viewerIsOwner` only decides whether the Owner Password section
 * renders — the route re-derives ownership from the session, so hiding or
 * showing the section changes no permission.
 *
 * Dialogs cannot be dismissed by outside click or Escape: DialogContent already
 * blocks both for any /admin route (src/components/ui/dialog.tsx), which matters
 * most on the one-time temporary password panel.
 */
export function AdminPasswordsSection({ open }: { open: boolean }) {
  const { t } = useAdminI18n();
  // Only fetch while Settings is open — this list is not needed otherwise.
  const accounts = useAdminAccounts(open);
  const [resetTarget, setResetTarget] = React.useState<AdminAccountDTO | null>(
    null,
  );
  const [ownerOpen, setOwnerOpen] = React.useState(false);

  return (
    <>
      <section className="mt-4 rounded-xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <Users className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
          <div className="min-w-0">
            <h3 className="font-semibold text-ink">
              {t("settings.adminAccounts")}
            </h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {t("settings.adminAccountsDescription")}
            </p>
          </div>
        </div>

        {accounts.isLoading ? (
          <div className="mt-4 space-y-2">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ) : accounts.isError ? (
          <p className="mt-4 text-sm text-destructive">
            {t("settings.loadFailed")}
          </p>
        ) : accounts.data && accounts.data.admins.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            {t("settings.noAdminAccounts")}
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {(accounts.data?.admins ?? []).map((admin) => (
              <li
                key={admin.id}
                className="flex flex-col gap-3 rounded-xl border border-border bg-background/60 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">
                    {admin.name || admin.email}
                  </p>
                  {/* dir=ltr: an email must not be bidi-reordered in Arabic. */}
                  <p
                    dir="ltr"
                    className="truncate text-xs text-muted-foreground ltr:text-left rtl:text-right"
                  >
                    {admin.email}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setResetTarget(admin)}
                >
                  <KeyRound className="h-4 w-4" />
                  {t("settings.resetPassword")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {accounts.data?.viewerIsOwner && (
        <section className="mt-4 rounded-xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
            <div className="min-w-0">
              <h3 className="font-semibold text-ink">
                {t("settings.ownerPassword")}
              </h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {t("settings.ownerPasswordDescription")}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => setOwnerOpen(true)}
          >
            <KeyRound className="h-4 w-4" />
            {t("settings.changeOwnerPassword")}
          </Button>
        </section>
      )}

      <ResetPasswordDialog
        target={resetTarget}
        onClose={() => setResetTarget(null)}
      />
      <OwnerPasswordDialog open={ownerOpen} onClose={() => setOwnerOpen(false)} />
    </>
  );
}

/** Manager-PIN prompt, then the one-time temporary password. */
function ResetPasswordDialog({
  target,
  onClose,
}: {
  target: AdminAccountDTO | null;
  onClose: () => void;
}) {
  const { t } = useAdminI18n();
  const reset = useResetAdminPassword();
  const [managerCode, setManagerCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  // Held in component state ONLY, and cleared when the dialog closes.
  const [issued, setIssued] = React.useState<string | null>(null);

  const close = React.useCallback(() => {
    setManagerCode("");
    setError(null);
    setIssued(null);
    reset.reset();
    onClose();
  }, [onClose, reset]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!target) return;
    if (!managerCode) {
      setError(t("settings.managerRequired"));
      return;
    }
    setError(null);
    try {
      const result = await reset.mutateAsync({
        adminId: target.id,
        managerCode,
      });
      setIssued(result.temporaryPassword);
      setManagerCode("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(
        /too many|locked|cannot be reset|not found/i.test(message)
          ? message
          : t("settings.managerIncorrect"),
      );
      setManagerCode("");
    }
  }

  return (
    <Dialog
      open={!!target}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("settings.resetPasswordTitle")}</DialogTitle>
          <DialogDescription>
            {issued
              ? t("settings.tempPasswordDescription")
              : t("settings.resetPasswordBody")}
          </DialogDescription>
        </DialogHeader>

        {target && (
          <div className="rounded-xl border border-border bg-background/60 p-3">
            <p className="font-medium text-ink">{target.name || target.email}</p>
            <p dir="ltr" className="text-xs text-muted-foreground ltr:text-left rtl:text-right">
              {target.email}
            </p>
          </div>
        )}

        {issued ? (
          <>
            <OneTimeSecret value={issued} />
            <DialogFooter>
              <Button type="button" variant="gradient" onClick={close}>
                {t("settings.doneStored")}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="reset-manager-code">
                {t("settings.managerPin")}
              </Label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="reset-manager-code"
                  type="password"
                  autoComplete="off"
                  value={managerCode}
                  onChange={(e) => setManagerCode(e.target.value)}
                  className="ps-9"
                  disabled={reset.isPending}
                  autoFocus
                />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                disabled={reset.isPending}
                onClick={close}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" variant="destructive" disabled={reset.isPending}>
                {reset.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("settings.resetPassword")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Owner-only: current password + new password + manager PIN. */
function OwnerPasswordDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useAdminI18n();
  const change = useChangeOwnerPassword();
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [managerCode, setManagerCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const close = React.useCallback(() => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setManagerCode("");
    setError(null);
    change.reset();
    onClose();
  }, [onClose, change]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // Mirrored client-side purely for a fast, specific message; the server
    // re-validates all of it (ownerPasswordChangeSchema).
    if (newPassword !== confirmPassword) {
      setError(t("settings.passwordsDoNotMatch"));
      return;
    }
    if (newPassword.length < 12) {
      setError(t("settings.passwordTooShort"));
      return;
    }
    if (!currentPassword || !managerCode) {
      setError(t("settings.allFieldsRequired"));
      return;
    }
    setError(null);
    try {
      await change.mutateAsync({
        currentPassword,
        newPassword,
        confirmPassword,
        managerCode,
      });
      toast.success(t("settings.ownerPasswordChangedToast"));
      close();
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(
        /too many|locked|Only the owner/i.test(message)
          ? message
          : t("settings.ownerChangeFailed"),
      );
      setCurrentPassword("");
      setManagerCode("");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("settings.ownerPassword")}</DialogTitle>
          <DialogDescription>
            {t("settings.ownerPasswordDialogBody")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <PasswordField
            id="owner-current"
            label={t("settings.currentOwnerPassword")}
            value={currentPassword}
            onChange={setCurrentPassword}
            disabled={change.isPending}
            autoFocus
          />
          <PasswordField
            id="owner-new"
            label={t("settings.newPassword")}
            value={newPassword}
            onChange={setNewPassword}
            disabled={change.isPending}
          />
          <PasswordField
            id="owner-confirm"
            label={t("settings.confirmPassword")}
            value={confirmPassword}
            onChange={setConfirmPassword}
            disabled={change.isPending}
          />
          <PasswordField
            id="owner-manager-code"
            label={t("settings.managerPin")}
            value={managerCode}
            onChange={setManagerCode}
            disabled={change.isPending}
          />

          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
            {t("settings.ownerSessionNote")}
          </p>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={change.isPending}
              onClick={close}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" variant="gradient" disabled={change.isPending}>
              {change.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("settings.changeOwnerPassword")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  disabled,
  autoFocus,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="password"
        autoComplete="new-password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        autoFocus={autoFocus}
      />
    </div>
  );
}

/** Shows a secret once, with a copy button and an unmissable warning. */
function OneTimeSecret({ value }: { value: string }) {
  const { t } = useAdminI18n();
  const [copied, setCopied] = React.useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("settings.copyFailed"));
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-medium text-amber-900">
        {t("settings.tempPasswordWarning")}
      </div>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-background/60 p-3">
        {/* dir=ltr + monospace: the password is ASCII and must never be
            bidi-reordered or ligated in the Arabic layout. */}
        <code
          dir="ltr"
          className="min-w-0 flex-1 break-all font-mono text-sm text-ink"
        >
          {value}
        </code>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={copy}
        >
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copied ? t("settings.copied") : t("settings.copy")}
        </Button>
      </div>
    </div>
  );
}
