"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, BellOff, ChevronRight } from "lucide-react";
import { useAdminI18n } from "@/components/i18n/admin-i18n";
import {
  useNotifications,
  useNotificationActions,
} from "@/hooks/use-notifications";
import { formatDuration } from "@/lib/overdue-format";

/**
 * The red overdue banner, rendered once by the admin layout above <main>.
 *
 * SHOWS ONE NOTIFICATION — the most overdue UNMUTED one — with a "+N more"
 * counter, rather than stacking a bar per case. Deliberate: this sits above
 * every admin page, and a list that grows with the backlog would push the page
 * itself off screen. Depth belongs in the inbox; the bar is a pointer to it.
 *
 * Muted notifications never reach it. That is the entire contract of mute, and
 * it is enforced on BOTH sides — activeCount excludes them server-side, and the
 * filter below excludes them again from the item actually rendered.
 *
 * Not dismissible on purpose. A dismiss button would be a third state next to
 * read and muted that means "hide but stay urgent", and the honest way to stop
 * seeing an alert is to mute it (one click, right here) or advance the case.
 */
export function OverdueAlertBar() {
  const { t, locale } = useAdminI18n();
  const router = useRouter();
  const { data } = useNotifications();
  const { setMuted } = useNotificationActions();

  const active = React.useMemo(
    () => (data?.items ?? []).filter((n) => !n.muted),
    [data],
  );
  // Already sorted most-overdue-first by the service.
  const top = active[0];
  if (!top) return null;

  const others = active.length - 1;
  const stageLabel = locale === "ar" ? top.stageLabelAr : top.stageLabelEn;

  return (
    <div className="border-b border-destructive/25 bg-destructive/[0.08] px-4 py-2.5 md:px-8 dark:bg-destructive/[0.14]">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <button
          type="button"
          onClick={() => router.push(`/admin/cases/${top.caseId}?stage=${top.stageKey}`)}
          className="group flex min-w-0 flex-1 items-center gap-2.5 rounded-lg text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
          {/* Wraps rather than truncating on a phone: every part of this line
              (who, which case, which stage, how late) is the message. */}
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
            <span className="font-bold text-destructive">
              {top.patientName}
            </span>
            <span dir="ltr" className="font-mono text-xs text-destructive/80">
              {top.trackingId}
            </span>
            <span className="text-destructive/90">
              {t("notif.stuckIn", { stage: stageLabel })}
            </span>
            <span className="font-semibold text-destructive">
              {t("notif.overdueBy", {
                duration: formatDuration(top.overdueMinutes, t),
              })}
            </span>
            {others > 0 && (
              <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">
                {t("notif.andMore", { count: others })}
              </span>
            )}
          </span>
          <ChevronRight className="ms-auto hidden h-4 w-4 shrink-0 text-destructive/70 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 sm:block" />
        </button>

        {/* Mute for the case in the bar only — not `all`. Silencing the entire
            backlog from a one-line banner is too easy to do by accident. */}
        <button
          type="button"
          onClick={() => setMuted.mutate({ caseIds: [top.caseId], muted: true })}
          disabled={setMuted.isPending}
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg px-2 py-1 text-xs font-semibold text-destructive/80 transition-colors hover:bg-destructive/10 hover:text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40 disabled:opacity-50 sm:self-auto"
        >
          <BellOff className="h-3.5 w-3.5" />
          {t("notif.mute")}
        </button>
      </div>
    </div>
  );
}
