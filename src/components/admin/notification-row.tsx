"use client";

import * as React from "react";
import { AlertTriangle, Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminI18n } from "@/components/i18n/admin-i18n";
import { formatDuration } from "@/lib/overdue-format";
import { cn } from "@/lib/utils";
import type { OverdueNotificationDTO } from "@/types/notifications";

/**
 * ONE overdue notification, shared by the case-detail bell panel and the global
 * inbox so the two can never describe the same notification differently.
 *
 * The whole row is a button that opens the case; mute/unmute sits beside it as
 * a SIBLING button, never nested — a button inside a button is invalid HTML and
 * the mute click would bubble into "open case", which is the same trap the
 * stage chips in case-detail-client.tsx document.
 */
export function NotificationRow({
  notification,
  onOpen,
  onToggleMute,
  busy,
  showPatient = true,
}: {
  notification: OverdueNotificationDTO;
  onOpen: (n: OverdueNotificationDTO) => void;
  onToggleMute: (n: OverdueNotificationDTO) => void;
  busy?: boolean;
  /**
   * The bell panel is already inside one case, so repeating the patient name on
   * every row there is noise. The inbox spans every case and needs it.
   */
  showPatient?: boolean;
}) {
  const { t, locale } = useAdminI18n();
  const n = notification;
  const stageLabel = locale === "ar" ? n.stageLabelAr : n.stageLabelEn;
  const overdue = formatDuration(n.overdueMinutes, t);

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-xl border p-2.5 transition-colors",
        n.muted
          ? "border-border bg-muted/30"
          : n.read
            ? "border-border bg-card"
            : "border-destructive/25 bg-destructive/[0.06]",
      )}
    >
      <button
        type="button"
        onClick={() => onOpen(n)}
        className="flex min-w-0 flex-1 items-start gap-2.5 rounded-lg text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/40"
      >
        <span
          className={cn(
            "mt-0.5 shrink-0 rounded-full p-1.5",
            n.muted
              ? "bg-muted text-muted-foreground"
              : "bg-destructive/10 text-destructive",
          )}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {showPatient && (
              <span
                className={cn(
                  "truncate text-sm",
                  // Unread reads strong; read and muted both step back. Weight
                  // AND colour move together — colour alone is not enough of a
                  // difference on the muted grey background.
                  //
                  // text-foreground, NOT text-ink: this row renders inside a
                  // Radix portal, i.e. a direct child of <body> and outside
                  // .admin-theme-scope, and the dark-mode remap of text-ink in
                  // globals.css is scoped to that class. text-ink here is
                  // near-black on a near-black dialog.
                  n.muted
                    ? "font-medium text-muted-foreground"
                    : n.read
                      ? "font-medium text-foreground/70"
                      : "font-bold text-foreground",
                )}
              >
                {n.patientName}
              </span>
            )}
            <span
              dir="ltr"
              className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.7rem] text-muted-foreground"
            >
              {n.trackingId}
            </span>
            {n.muted && (
              <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                {t("notif.muted")}
              </span>
            )}
          </span>

          <span
            className={cn(
              "mt-0.5 block text-xs",
              n.muted ? "text-muted-foreground" : "text-foreground/75",
            )}
          >
            {t("notif.stuckIn", { stage: stageLabel })}
          </span>

          <span
            className={cn(
              "mt-0.5 block text-xs font-semibold",
              n.muted ? "text-muted-foreground" : "text-destructive",
            )}
          >
            {t("notif.overdueBy", { duration: overdue })}
          </span>
        </span>
      </button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={busy}
        onClick={() => onToggleMute(n)}
        aria-label={n.muted ? t("notif.unmute") : t("notif.mute")}
        title={n.muted ? t("notif.unmute") : t("notif.mute")}
        className="h-8 w-8 shrink-0 text-muted-foreground"
      >
        {n.muted ? (
          <Bell className="h-4 w-4" />
        ) : (
          <BellOff className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
