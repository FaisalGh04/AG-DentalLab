"use client";

import * as React from "react";
import { signOut } from "next-auth/react";
import {
  KeyRound,
  Loader2,
  LogOut,
  Settings,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { AdminPasswordsSection } from "@/components/admin/admin-passwords-section";
import { useAdminI18n } from "@/components/i18n/admin-i18n";
import {
  useSecuritySettings,
  useUpdateSecuritySettings,
} from "@/hooks/use-security-settings";
import { useLockStaffManagement } from "@/hooks/use-staff-management";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminSettingsDialog({ open, onOpenChange }: Props) {
  const { t } = useAdminI18n();
  const settings = useSecuritySettings();
  const update = useUpdateSecuritySettings();
  const lockStaffManagement = useLockStaffManagement();
  const [confirming, setConfirming] = React.useState(false);
  const [managerCode, setManagerCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [signOutOpen, setSignOutOpen] = React.useState(false);

  const enabled = settings.data?.staffConfirmationEnabled ?? true;
  const targetEnabled = !enabled;

  const resetChange = React.useCallback(() => {
    setConfirming(false);
    setManagerCode("");
    setError(null);
  }, []);

  React.useEffect(() => {
    if (!open) resetChange();
  }, [open, resetChange]);

  async function changeProtection(e: React.FormEvent) {
    e.preventDefault();
    if (!managerCode) {
      setError(t("settings.managerRequired"));
      return;
    }

    setError(null);
    try {
      await update.mutateAsync({ enabled: targetEnabled, managerCode });
      toast.success(
        targetEnabled
          ? t("settings.enabledToast")
          : t("settings.disabledToast"),
      );
      resetChange();
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(
        /too many|locked/i.test(message)
          ? message
          : t("settings.managerIncorrect"),
      );
      setManagerCode("");
    }
  }
  async function handleSignOut() {
    try {
      // Revoke the manager unlock before ending the admin session. Otherwise
      // signing back in within its TTL would silently restore Staff access.
      await lockStaffManagement.mutateAsync();
      setSignOutOpen(false);
      await signOut({ callbackUrl: "/login" });
    } catch {
      toast.error(t("staff.errorToast"));
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-brand-700" />
              {t("settings.title")}
            </DialogTitle>
            <DialogDescription>{t("settings.description")}</DialogDescription>
          </DialogHeader>

          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-semibold text-ink">
                  {t("settings.staffProtection")}
                </h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {t("settings.staffProtectionDescription")}
                </p>
              </div>
              {settings.isLoading ? (
                <Skeleton className="h-7 w-20 shrink-0 rounded-full" />
              ) : (
                <Badge
                  variant={enabled ? "success" : "warning"}
                  className="shrink-0"
                >
                  {enabled ? (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  ) : (
                    <ShieldOff className="h-3.5 w-3.5" />
                  )}
                  {enabled
                    ? t("settings.enabled")
                    : t("settings.disabled")}
                </Badge>
              )}
            </div>

            {settings.isError ? (
              <p className="mt-4 text-sm text-destructive">
                {t("settings.loadFailed")}
              </p>
            ) : confirming ? (
              <form onSubmit={changeProtection} className="mt-5 space-y-4">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  {targetEnabled
                    ? t("settings.enableWarning")
                    : t("settings.disableWarning")}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="settings-manager-code">
                    {t("settings.managerPassword")}
                  </Label>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="settings-manager-code"
                      type="password"
                      autoComplete="off"
                      value={managerCode}
                      onChange={(e) => setManagerCode(e.target.value)}
                      className="ps-9"
                      disabled={update.isPending}
                      autoFocus
                    />
                  </div>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <DialogFooter>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={update.isPending}
                    onClick={resetChange}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    type="submit"
                    variant={targetEnabled ? "gradient" : "destructive"}
                    disabled={update.isPending}
                  >
                    {update.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    {targetEnabled
                      ? t("settings.enable")
                      : t("settings.disable")}
                  </Button>
                </DialogFooter>
              </form>
            ) : (
              <Button
                type="button"
                variant={enabled ? "outline" : "gradient"}
                className="mt-5"
                disabled={settings.isLoading}
                onClick={() => setConfirming(true)}
              >
                {enabled ? (
                  <ShieldOff className="h-4 w-4" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                {enabled
                  ? t("settings.disable")
                  : t("settings.enable")}
              </Button>
            )}
          </section>

          {/* Admin account passwords + owner password. Manager-gated
              server-side and unaffected by the toggle above. */}
          <AdminPasswordsSection open={open} />

          {/* Sign Out stays the LAST action in Settings. */}
          <div className="mt-2 border-t border-border pt-5">
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                onOpenChange(false);
                setSignOutOpen(true);
              }}
            >
              <LogOut className="h-4 w-4" />
              {t("nav.signOut")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={signOutOpen}
        onOpenChange={setSignOutOpen}
        title={t("nav.signOutConfirmTitle")}
        description={t("nav.signOutConfirmBody")}
        confirmLabel={t("nav.signOut")}
        destructive
        loading={lockStaffManagement.isPending}
        onConfirm={handleSignOut}
      />
    </>
  );
}
