"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/fetcher";
import type {
  OverdueNotificationDTO,
  OverdueNotificationsResponse,
} from "@/types/notifications";

/**
 * ONE query key for the whole feature.
 *
 * The red alert bar, the sidebar/topbar inbox button and the case-detail bell
 * all subscribe to this single key, so React Query dedupes them into ONE
 * request per interval no matter how many of them are mounted. The case bell
 * filters the shared list client-side rather than issuing its own scoped
 * request — see useCaseNotifications.
 */
const KEY = ["notifications"];

/**
 * Polling cadence. 60s is the task's own suggestion and is the right order of
 * magnitude for a threshold measured in hours: the worst-case lateness of an
 * alert is one minute against a one-hour deadline.
 *
 * `refetchOnWindowFocus` is turned ON here specifically, overriding the global
 * `false` in src/components/providers.tsx. That default suits case data the
 * admin is editing; for notifications the opposite is true — coming back to the
 * tab is exactly when a stale badge is most misleading.
 */
const POLL_MS = 60_000;

const EMPTY: OverdueNotificationsResponse = {
  items: [],
  unreadCount: 0,
  activeCount: 0,
  mutedCount: 0,
  truncated: false,
  computedAt: "",
};

/** The shared, polled notification list. */
export function useNotifications() {
  return useQuery({
    queryKey: KEY,
    queryFn: () =>
      apiFetch<OverdueNotificationsResponse>("/api/admin/notifications"),
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
    // Slightly under the poll interval: a remount inside the same cycle reuses
    // the cached list instead of firing an extra request.
    staleTime: POLL_MS - 5_000,
    // A failed poll must not blank the UI — keep showing the last good list.
    placeholderData: (prev) => prev,
  });
}

/**
 * The notifications belonging to ONE case, for the case-detail bell.
 *
 * Normally a pure client-side filter of the shared list, so opening a case page
 * costs NO extra request.
 *
 * The exception is truncation. The shared list is capped at 200 rows server-side;
 * past that, a case can be genuinely overdue and still absent from it, and the
 * bell would say "no alerts" about a case that has one. So when — and only when
 * — the server reports `truncated`, this falls back to a scoped `?caseId=` fetch
 * that is exact by construction. In every normal state that query never runs.
 */
export function useCaseNotifications(caseId: string): {
  items: OverdueNotificationDTO[];
  unreadCount: number;
  activeCount: number;
  mutedCount: number;
} {
  const { data } = useNotifications();
  const truncated = data?.truncated ?? false;

  const scoped = useQuery({
    queryKey: [...KEY, "case", caseId],
    queryFn: () =>
      apiFetch<OverdueNotificationsResponse>(
        "/api/admin/notifications?caseId=" + encodeURIComponent(caseId),
      ),
    enabled: truncated,
    refetchInterval: POLL_MS,
    refetchOnWindowFocus: true,
    staleTime: POLL_MS - 5_000,
  });

  const items = truncated ? scoped.data?.items : data?.items;
  const scopedAlready = truncated;

  return React.useMemo(() => {
    // The scoped response is already limited to this case; the shared one is not.
    const mine = (items ?? []).filter(
      (n) => scopedAlready || n.caseId === caseId,
    );
    return {
      items: mine,
      unreadCount: mine.filter((n) => !n.muted && !n.read).length,
      activeCount: mine.filter((n) => !n.muted).length,
      mutedCount: mine.filter((n) => n.muted).length,
    };
  }, [items, caseId, scopedAlready]);
}

/** Everything a notification surface can do, sharing one invalidation. */
export function useNotificationActions() {
  const qc = useQueryClient();
  // Prefix match: this also invalidates the ["notifications", "case", id]
  // fallback query, so muting from the bell refreshes both surfaces.
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY });

  const markRead = useMutation({
    mutationFn: (target: { caseIds?: string[]; all?: boolean }) =>
      apiFetch("/api/admin/notifications/read", {
        method: "POST",
        body: JSON.stringify(target),
      }),
    onSuccess: invalidate,
  });

  const setMuted = useMutation({
    mutationFn: (target: {
      caseIds?: string[];
      all?: boolean;
      muted: boolean;
    }) =>
      apiFetch("/api/admin/notifications/mute", {
        method: "POST",
        body: JSON.stringify(target),
      }),
    onSuccess: invalidate,
  });

  return { markRead, setMuted };
}

export { EMPTY as EMPTY_NOTIFICATIONS };
