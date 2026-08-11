"use client";

import * as React from "react";
import {
  KeyRound,
  Loader2,
  LockKeyhole,
  Pencil,
  Plus,
  ShieldCheck,
  ShieldOff,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  useChangeManagerSecret,
  useCreateManagedStaff,
  useLockStaffManagement,
  useStaffManagement,
  useStaffManagementSession,
  useUnlockStaffManagement,
  useUpdateManagedStaff,
} from "@/hooks/use-staff-management";
import { formatDateTime, cn } from "@/lib/utils";
import type { ManagedStaffDTO } from "@/types/staff-management";

export function StaffManagementClient() {
  const { t } = useAdminI18n();
  const session = useStaffManagementSession();
  const [sessionExpired, setSessionExpired] = React.useState(false);
  const expiresAtMs = session.data?.expiresAt
    ? Date.parse(session.data.expiresAt)
    : 0;
  const unlocked =
    session.data?.unlocked === true &&
    expiresAtMs > Date.now() &&
    !sessionExpired;
  const management = useStaffManagement(unlocked);
  const lock = useLockStaffManagement();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ManagedStaffDTO | null>(null);
  const [secretOpen, setSecretOpen] = React.useState(false);

  React.useEffect(() => {
    if (!session.data?.unlocked || expiresAtMs <= Date.now()) {
      setSessionExpired(session.data?.unlocked === true);
      return;
    }

    setSessionExpired(false);
    const timeout = window.setTimeout(
      () => setSessionExpired(true),
      expiresAtMs - Date.now(),
    );
    return () => window.clearTimeout(timeout);
  }, [expiresAtMs, session.data?.unlocked]);

  if (session.isLoading || session.isFetching) {
    return <Skeleton className="mx-auto h-96 max-w-5xl" />;
  }

  if (!unlocked) {
    return <StaffAccessGate />;
  }

  if (management.isLoading) {
    return <Skeleton className="mx-auto h-96 max-w-5xl" />;
  }

  if (management.isError || !management.data) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <ShieldOff className="mx-auto h-10 w-10 text-destructive" />
        <p className="mt-4 font-semibold text-ink">{t("staff.loadFailed")}</p>
        <Button
          className="mt-4"
          variant="outline"
          onClick={() => session.refetch()}
        >
          {t("staff.unlockAgain")}
        </Button>
      </div>
    );
  }

  const { staff, managerSecrets } = management.data;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-ink">
            <Users className="h-6 w-6 text-brand-700" />
            {t("staff.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("staff.subtitle")}
          </p>
          {session.data?.expiresAt && (
            <p className="mt-1 text-xs text-muted-foreground">
              {t("staff.unlockedUntil", {
                time: formatDateTime(session.data.expiresAt),
              })}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              await lock.mutateAsync();
              toast.success(t("staff.lockedToast"));
            }}
            disabled={lock.isPending}
          >
            <LockKeyhole className="h-4 w-4" /> {t("staff.lock")}
          </Button>
          <Button variant="gradient" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> {t("staff.add")}
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        {staff.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">
            {t("staff.empty")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead>
                <tr className="border-b border-border/80 bg-muted/30 text-start text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">
                    {t("staff.colName")}
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    {t("staff.colRole")}
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    {t("staff.colStatus")}
                  </th>
                  <th className="px-4 py-3 font-semibold">
                    {t("staff.colSecurity")}
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {staff.map((member) => (
                  <tr
                    key={member.id}
                    className={cn(
                      "border-b border-border/60",
                      !member.isActive && "opacity-60",
                    )}
                  >
                    <td className="px-4 py-3 font-medium text-ink">
                      {member.name}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={member.isManager ? "warning" : "secondary"}
                      >
                        {member.isManager
                          ? t("staff.manager")
                          : t("staff.employee")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={member.isActive ? "success" : "secondary"}
                      >
                        {member.isActive
                          ? t("staff.active")
                          : t("staff.inactive")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {member.lockedUntil
                        ? t("staff.lockedUntil", {
                            time: formatDateTime(member.lockedUntil),
                          })
                        : member.failedAttempts > 0
                          ? t("staff.failedAttempts", {
                              count: member.failedAttempts,
                            })
                          : t("staff.noLockout")}
                    </td>
                    <td className="px-4 py-3 text-end">
                      <Button
                        size="icon"
                        variant="ghost"
                        title={t("staff.edit")}
                        onClick={() => setEditing(member)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 font-semibold text-ink">
              <KeyRound className="h-4 w-4 text-brand-700" />
              {t("staff.managerSecrets")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("staff.managerSecretsDescription")}
            </p>
          </div>
          <Button variant="outline" onClick={() => setSecretOpen(true)}>
            {t("staff.changePrimary")}
          </Button>
        </div>
        <div className="mt-4 divide-y divide-border/70 border-t border-border/70">
          {managerSecrets.map((secret) => (
            <div
              key={secret.kind}
              className="grid gap-1 py-3 text-sm sm:grid-cols-[160px_1fr_1fr]"
            >
              <span className="font-medium text-ink">
                {secret.kind === "PRIMARY"
                  ? t("staff.primary")
                  : t("staff.breakGlass")}
              </span>
              <span className="text-muted-foreground">
                {t("staff.updatedAt", {
                  time: formatDateTime(secret.updatedAt),
                })}
              </span>
              <span className="text-muted-foreground">
                {secret.lastUsedAt
                  ? t("staff.lastUsed", {
                      time: formatDateTime(secret.lastUsedAt),
                    })
                  : t("staff.neverUsed")}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <CreateStaffDialog open={createOpen} onOpenChange={setCreateOpen} />
      {editing && (
        <EditStaffDialog
          member={editing}
          open
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
      <ManagerSecretDialog open={secretOpen} onOpenChange={setSecretOpen} />
    </div>
  );
}

function StaffAccessGate() {
  const { t } = useAdminI18n();
  const unlock = useUnlockStaffManagement();
  const [managerCode, setManagerCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!managerCode) return setError(t("staff.managerRequired"));
    setError(null);
    try {
      await unlock.mutateAsync({ managerCode });
      setManagerCode("");
      toast.success(t("staff.unlockedToast"));
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(
        /too many|locked/i.test(message)
          ? message
          : t("staff.managerIncorrect"),
      );
      setManagerCode("");
    }
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md items-center">
      <Card className="w-full p-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-ink">
          {t("staff.gateTitle")}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {t("staff.gateDescription")}
        </p>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="staff-manager-code">{t("staff.managerCode")}</Label>
            <Input
              id="staff-manager-code"
              type="password"
              autoComplete="off"
              value={managerCode}
              onChange={(e) => setManagerCode(e.target.value)}
              autoFocus
              disabled={unlock.isPending}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            className="w-full"
            variant="gradient"
            disabled={unlock.isPending}
          >
            {unlock.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("staff.unlock")}
          </Button>
        </form>
      </Card>
    </div>
  );
}

function CheckboxField({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-start gap-3 rounded-lg border border-border p-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 accent-brand-600"
      />
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}

function CreateStaffDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useAdminI18n();
  const create = useCreateManagedStaff();
  const [name, setName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [isManager, setIsManager] = React.useState(false);
  const [demotedManagerPassword, setDemotedManagerPassword] =
    React.useState("");

  React.useEffect(() => {
    if (!open) {
      setName("");
      setPassword("");
      setIsActive(true);
      setIsManager(false);
      setDemotedManagerPassword("");
    }
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await create.mutateAsync({
        name,
        password,
        isActive: isManager ? true : isActive,
        isManager,
        ...(isManager ? { demotedManagerPassword } : {}),
      });
      toast.success(t("staff.createdToast"));
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("staff.errorToast"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("staff.addTitle")}</DialogTitle>
          <DialogDescription>{t("staff.addDescription")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <CredentialFields
            name={name}
            onNameChange={setName}
            password={password}
            onPasswordChange={setPassword}
            passwordLabel={t("staff.password")}
          />
          <CheckboxField
            checked={isActive}
            onChange={setIsActive}
            label={t("staff.active")}
            disabled={isManager}
          />
          <CheckboxField
            checked={isManager}
            onChange={setIsManager}
            label={t("staff.assignManager")}
            description={t("staff.assignManagerDescription")}
          />
          {isManager && (
            <PasswordField
              label={t("staff.outgoingManagerPassword")}
              value={demotedManagerPassword}
              onChange={setDemotedManagerPassword}
              hint={t("staff.outgoingManagerPasswordHint")}
            />
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              variant="gradient"
              disabled={create.isPending}
            >
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("staff.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditStaffDialog({
  member,
  open,
  onOpenChange,
}: {
  member: ManagedStaffDTO;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useAdminI18n();
  const update = useUpdateManagedStaff(member.id);
  const [name, setName] = React.useState(member.name);
  const [password, setPassword] = React.useState("");
  const [isActive, setIsActive] = React.useState(member.isActive);
  const [makeManager, setMakeManager] = React.useState(false);
  const [demotedManagerPassword, setDemotedManagerPassword] =
    React.useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await update.mutateAsync({
        name,
        ...(password ? { password } : {}),
        isActive: member.isManager || makeManager ? true : isActive,
        ...(makeManager ? { makeManager: true, demotedManagerPassword } : {}),
      });
      toast.success(t("staff.updatedToast"));
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("staff.errorToast"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("staff.editTitle")}</DialogTitle>
          <DialogDescription>{t("staff.editDescription")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <CredentialFields
            name={name}
            onNameChange={setName}
            password={password}
            onPasswordChange={setPassword}
            passwordLabel={t("staff.newPassword")}
            passwordHint={t("staff.passwordBlankHint")}
          />
          <CheckboxField
            checked={isActive}
            onChange={setIsActive}
            label={t("staff.active")}
            description={
              member.isManager
                ? t("staff.managerMustStayActive")
                : t("staff.deactivateHint")
            }
            disabled={member.isManager || makeManager}
          />
          {!member.isManager && (
            <CheckboxField
              checked={makeManager}
              onChange={setMakeManager}
              label={t("staff.assignManager")}
              description={t("staff.assignManagerDescription")}
            />
          )}
          {makeManager && (
            <PasswordField
              label={t("staff.outgoingManagerPassword")}
              value={demotedManagerPassword}
              onChange={setDemotedManagerPassword}
              hint={t("staff.outgoingManagerPasswordHint")}
            />
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              variant="gradient"
              disabled={update.isPending}
            >
              {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("staff.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CredentialFields({
  name,
  onNameChange,
  password,
  onPasswordChange,
  passwordLabel,
  passwordHint,
}: {
  name: string;
  onNameChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  passwordLabel: string;
  passwordHint?: string;
}) {
  const { t } = useAdminI18n();
  return (
    <>
      <div className="space-y-1.5">
        <Label>{t("staff.name")}</Label>
        <Input value={name} onChange={(e) => onNameChange(e.target.value)} />
      </div>
      <PasswordField
        label={passwordLabel}
        value={password}
        onChange={onPasswordChange}
        hint={passwordHint ?? t("staff.passwordHint")}
      />
    </>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type="password"
        autoComplete="new-password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ManagerSecretDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useAdminI18n();
  const change = useChangeManagerSecret();
  const [currentManagerCode, setCurrentManagerCode] = React.useState("");
  const [newManagerCode, setNewManagerCode] = React.useState("");
  const [confirmManagerCode, setConfirmManagerCode] = React.useState("");

  React.useEffect(() => {
    if (!open) {
      setCurrentManagerCode("");
      setNewManagerCode("");
      setConfirmManagerCode("");
    }
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await change.mutateAsync({
        currentManagerCode,
        newManagerCode,
        confirmManagerCode,
      });
      toast.success(t("staff.secretUpdatedToast"));
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("staff.errorToast"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("staff.changePrimaryTitle")}</DialogTitle>
          <DialogDescription>
            {t("staff.changePrimaryDescription")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <PasswordField
            label={t("staff.currentManagerCode")}
            value={currentManagerCode}
            onChange={setCurrentManagerCode}
          />
          <PasswordField
            label={t("staff.newManagerCode")}
            value={newManagerCode}
            onChange={setNewManagerCode}
            hint={t("staff.passwordHint")}
          />
          <PasswordField
            label={t("staff.confirmManagerCode")}
            value={confirmManagerCode}
            onChange={setConfirmManagerCode}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="submit"
              variant="gradient"
              disabled={change.isPending}
            >
              {change.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("staff.updateSecret")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
