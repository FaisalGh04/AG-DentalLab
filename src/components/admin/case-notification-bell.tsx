"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NotificationRow } from "@/components/admin/notification-row";
import { useAdminI18n } from "@/components/i18n/admin-i18n";
import {
  useCaseNotifications,
  useNotificationActions,
} from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";
import type { OverdueNotificationDTO } from "@/types/notifications";

/**
 * Overdue-notification bell for ONE case, sitting beside Edit on the case
 * detail header.
 *
 * Reads the shared notification cache (useCaseNotifications) rather than
 * fetching per case, so adding it to the detail page costs no extra request.
 *
 * Opening a case from here is a no-op navigation — the admin is already on it —
 * so the row click SCROLLS TO and highlights the stage instead, which is the
 * "focus/indicate the current stage" the bell is for.
 */
export function CaseNotificationBell({
  caseId,
  onFocusStage,
}: {
  caseId: string;
  /** Highlight a stage on this page. See focusStage in case-detail-client. */
  onFocusStage?: (stageKey: string) => void;
}) {
  const { t } = useAdminI18n();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const { items, unreadCount, activeCount, mutedCount } =
    useCaseNotifications(caseId);
  const { markRead, setMuted } = useNotificationActions();
  const busy = markRead.isPending || setMuted.isPending;

  const active = items.filter((n) => !n.muted);
  const muted = items.filter((n) => n.muted);
  const caseIds = React.useMemo(() => items.map((n) => n.caseId), [items]);

  function openNotification(n: OverdueNotificationDTO) {
    // Opening it is what "read" means, so mark it before acting on it.
    markRead.mutate({ caseIds: [n.caseId] });
    setOpen(false);
    if (onFocusStage) onFocusStage(n.stageKey);
    else router.push(`/admin/cases/${n.caseId}?stage=${n.stageKey}`);
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        aria-label={t("notif.caseBellAria", { count: activeCount })}
        title={t("notif.caseBell")}
        className={cn(
          "relative",
          activeCount > 0 &&
            "border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive",
        )}
      >
        {activeCount > 0 ? (
          <BellRing className="h-4 w-4" />
        ) : mutedCount > 0 ? (
          <BellOff className="h-4 w-4" />
        ) : (
          <Bell className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">{t("notif.caseBell")}</span>
        {unreadCount > 0 && (
          <span
            dir="ltr"
            className="absolute -end-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[0.65rem] font-bold text-white"
          >
            {unreadCount}
          </span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("notif.caseBellTitle")}</DialogTitle>
            <DialogDescription>{t("notif.caseBellDesc")}</DialogDescription>
          </DialogHeader>

          {items.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              {t("notif.caseEmpty")}
            </p>
          ) : (
            <div className="space-y-3">
              {active.length > 0 && (
                <div className="space-y-2">
                  {active.map((n) => (
                    <NotificationRow
                      key={n.caseId + n.stageKey + n.enteredAt}
                      notification={n}
                      busy={busy}
                      showPatient={false}
                      onOpen={openNotification}
                      onToggleMute={(x) =>
                        setMuted.mutate({ caseIds: [x.caseId], muted: true })
                      }
                    />
                  ))}
                </div>
              )}

              {muted.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("notif.sectionMuted")}
                  </p>
                  {muted.map((n) => (
                    <NotificationRow
                      key={n.caseId + n.stageKey + n.enteredAt}
                      notification={n}
                      busy={busy}
                      showPatient={false}
                      onOpen={openNotification}
                      onToggleMute={(x) =>
                        setMuted.mutate({ caseIds: [x.caseId], muted: false })
                      }
                    />
                  ))}
                </div>
              )}

              {/* Scoped to THIS case: `caseIds` rather than `all`, so the case
                  bell can never silence the rest of the lab by accident. */}
              <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy || active.length === 0}
                  onClick={() => setMuted.mutate({ caseIds, muted: true })}
                >
                  <BellOff className="h-3.5 w-3.5" />
                  {t("notif.muteAll")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy || muted.length === 0}
                  onClick={() => setMuted.mutate({ caseIds, muted: false })}
                >
                  <Bell className="h-3.5 w-3.5" />
                  {t("notif.unmuteAll")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
