"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, CheckCheck, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotificationRow } from "@/components/admin/notification-row";
import { useAdminI18n } from "@/components/i18n/admin-i18n";
import {
  useNotifications,
  useNotificationActions,
} from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";
import type { OverdueNotificationDTO } from "@/types/notifications";

/**
 * Global notifications inbox: a bell button with an unread count, plus the
 * panel it opens. Rendered in the desktop sidebar and the mobile topbar, both
 * reading the one shared polled query.
 *
 * `PAGE` caps how many rows are rendered per section at once. The list is
 * already in memory (the API caps its own scan at 200), so "show more" is a
 * pure client reveal with no request — this exists to keep the DOM small on a
 * phone, not to paginate the fetch.
 */
const PAGE = 25;

export function NotificationsInbox({
  variant = "sidebar",
}: {
  /** sidebar = full-width labelled row; topbar = compact icon button. */
  variant?: "sidebar" | "topbar";
}) {
  const { t } = useAdminI18n();
  const [open, setOpen] = React.useState(false);
  const { data } = useNotifications();
  const unread = data?.unreadCount ?? 0;

  return (
    <>
      {variant === "sidebar" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground/65 transition-colors hover:bg-brand-50/60 hover:text-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/40"
        >
          <Inbox
            className={cn(
              "h-4 w-4 transition-colors",
              unread > 0
                ? "text-destructive"
                : "text-brand-500/70 group-hover:text-brand-700",
            )}
          />
          <span className="flex-1 text-start">{t("notif.inbox")}</span>
          {unread > 0 && <CountPill count={unread} />}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("notif.inboxAria", { count: unread })}
          className="relative rounded-xl p-2 text-foreground/70 transition-colors hover:bg-brand-50/70 hover:text-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/40"
        >
          <Inbox
            className={cn("h-5 w-5", unread > 0 && "text-destructive")}
          />
          {unread > 0 && (
            <span
              dir="ltr"
              className="absolute -end-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[0.6rem] font-bold text-white"
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      )}

      <InboxDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function CountPill({ count }: { count: number }) {
  return (
    <span
      dir="ltr"
      className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[0.65rem] font-bold text-white"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function InboxDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useAdminI18n();
  const router = useRouter();
  const { data, isLoading } = useNotifications();
  const { markRead, setMuted } = useNotificationActions();
  const busy = markRead.isPending || setMuted.isPending;

  const items = React.useMemo(() => data?.items ?? [], [data]);
  const sections = React.useMemo(
    () => ({
      unread: items.filter((n) => !n.muted && !n.read),
      read: items.filter((n) => !n.muted && n.read),
      muted: items.filter((n) => n.muted),
    }),
    [items],
  );

  function openNotification(n: OverdueNotificationDTO) {
    markRead.mutate({ caseIds: [n.caseId] });
    onOpenChange(false);
    router.push(`/admin/cases/${n.caseId}?stage=${n.stageKey}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("notif.inboxTitle")}</DialogTitle>
          <DialogDescription>{t("notif.inboxDesc")}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("notif.loading")}
          </p>
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
            {t("notif.empty")}
          </p>
        ) : (
          <>
            <Tabs defaultValue="unread">
              <TabsList className="w-full">
                <TabTrigger
                  value="unread"
                  label={t("notif.tabUnread")}
                  count={sections.unread.length}
                />
                <TabTrigger
                  value="read"
                  label={t("notif.tabRead")}
                  count={sections.read.length}
                />
                <TabTrigger
                  value="muted"
                  label={t("notif.tabMuted")}
                  count={sections.muted.length}
                />
              </TabsList>

              {(["unread", "read", "muted"] as const).map((key) => (
                <TabsContent key={key} value={key} className="mt-3">
                  <Section
                    items={sections[key]}
                    emptyLabel={t(
                      key === "unread"
                        ? "notif.emptyUnread"
                        : key === "read"
                          ? "notif.emptyRead"
                          : "notif.emptyMuted",
                    )}
                    busy={busy}
                    onOpen={openNotification}
                    onToggleMute={(n) =>
                      setMuted.mutate({
                        caseIds: [n.caseId],
                        muted: !n.muted,
                      })
                    }
                  />
                </TabsContent>
              ))}
            </Tabs>

            {data?.truncated && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-400/10 dark:text-amber-100">
                {t("notif.truncated")}
              </p>
            )}

            {/* Scope-wide actions. `all: true` is resolved server-side against
                the live overdue set, so these act on what is actually overdue
                now rather than on the snapshot rendered above. */}
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy || sections.unread.length === 0}
                onClick={() => markRead.mutate({ all: true })}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                {t("notif.readAll")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={
                  busy || sections.unread.length + sections.read.length === 0
                }
                onClick={() => setMuted.mutate({ all: true, muted: true })}
              >
                <BellOff className="h-3.5 w-3.5" />
                {t("notif.muteAll")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy || sections.muted.length === 0}
                onClick={() => setMuted.mutate({ all: true, muted: false })}
              >
                <Bell className="h-3.5 w-3.5" />
                {t("notif.unmuteAll")}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TabTrigger({
  value,
  label,
  count,
}: {
  value: string;
  label: string;
  count: number;
}) {
  return (
    <TabsTrigger value={value} className="flex-1 gap-1.5">
      {label}
      <span dir="ltr" className="text-xs opacity-70">
        ({count})
      </span>
    </TabsTrigger>
  );
}

function Section({
  items,
  emptyLabel,
  busy,
  onOpen,
  onToggleMute,
}: {
  items: OverdueNotificationDTO[];
  emptyLabel: string;
  busy: boolean;
  onOpen: (n: OverdueNotificationDTO) => void;
  onToggleMute: (n: OverdueNotificationDTO) => void;
}) {
  const { t } = useAdminI18n();
  const [limit, setLimit] = React.useState(PAGE);
  // A tab that empties (everything got read) must not keep an inflated reveal
  // when it later refills. Keyed on emptiness alone, so a poll that adds one
  // row does not collapse a list the admin just expanded.
  const isEmpty = items.length === 0;
  React.useEffect(() => {
    if (isEmpty) setLimit(PAGE);
  }, [isEmpty]);

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="max-h-[46dvh] space-y-2 overflow-y-auto overscroll-contain pe-1">
      {items.slice(0, limit).map((n) => (
        <NotificationRow
          key={n.caseId + n.stageKey + n.enteredAt}
          notification={n}
          busy={busy}
          onOpen={onOpen}
          onToggleMute={onToggleMute}
        />
      ))}
      {items.length > limit && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={() => setLimit((l) => l + PAGE)}
        >
          {t("notif.showMore", { count: items.length - limit })}
        </Button>
      )}
    </div>
  );
}
