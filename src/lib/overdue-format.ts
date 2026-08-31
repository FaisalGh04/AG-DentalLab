/**
 * HOURS ⇄ MINUTES and duration display for stage-overdue notifications.
 *
 * Minutes are the storage and wire unit (exact integer comparisons); hours are
 * the editing unit (an admin thinks "two and a half hours", not "150"). Both
 * conversions live here so the two representations can never drift apart in one
 * direction only.
 */

/** Smallest threshold the editor offers, in hours. Mirrors the zod floor of 15. */
export const MIN_OVERDUE_HOURS = 0.25;

/**
 * Parse the hours field into storable minutes.
 *
 * Returns `null` for empty input — the documented "no overdue alerts for this
 * stage" value — and `undefined` for input that is not a usable number, which
 * the caller treats as "reject, do not save". The two must stay distinct:
 * collapsing them would let a typo silently disable a stage's alerting.
 */
export function hoursToMinutes(raw: string): number | null | undefined {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const hours = Number(trimmed);
  if (!Number.isFinite(hours) || hours <= 0) return undefined;
  const minutes = Math.round(hours * 60);
  if (minutes < MIN_OVERDUE_HOURS * 60) return undefined;
  return minutes;
}

/**
 * Minutes back to the hours string the input shows. Trailing zeros trimmed, so
 * 150 renders as "2.5" and 120 as "2" rather than "2.50" / "2.00".
 */
export function minutesToHoursInput(minutes: number | null): string {
  if (minutes == null) return "";
  return String(Number((minutes / 60).toFixed(2)));
}

/**
 * A duration in minutes as a short localized string: "3h 20m", "45m", "2d 4h".
 *
 * Built from translated unit keys rather than Intl.DurationFormat, which is not
 * available across the browsers this admin panel targets. Days are included
 * because a stage with a 1-hour threshold that nobody has looked at since
 * Friday should not read as "4,300m".
 */
export function formatDuration(
  totalMinutes: number,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  const mins = Math.max(0, Math.floor(totalMinutes));
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const minutes = mins % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(t("notif.unitDay", { n: days }));
  if (hours > 0) parts.push(t("notif.unitHour", { n: hours }));
  // Minutes are dropped once the duration is a day or more — "2d 4h 13m" is
  // false precision for something measured against an hours-long threshold.
  if (minutes > 0 && days === 0) parts.push(t("notif.unitMinute", { n: minutes }));
  // Everything rounded away: less than a minute past due.
  if (parts.length === 0) return t("notif.unitMinute", { n: 0 });
  return parts.join(" ");
}
