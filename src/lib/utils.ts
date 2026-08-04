import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Normalize a patient name for case-insensitive, whitespace-tolerant search. */
export function normalizeName(first: string, last: string): string {
  return `${first} ${last}`.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Normalize a free-text search query the same way names are stored. */
export function normalizeQuery(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, " ");
}

// ---------------------------------------------------------------------------
// Numerals
//
// In Arabic every QUANTITY renders with Eastern Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩).
// CODES do not: tracking ids and doctor codes are alphanumeric identifiers meant
// to be read aloud, typed, and matched exactly. Two reasons that matters:
//   * the tracking-id alphabet (ABCDEFGHJKLMNPQRSTUVWXYZ23456789) uses 2-9 as
//     SYMBOLS, so substituting them changes the identity of the code;
//   * a doctor typing back what they saw would miss `findUnique({ code })` and
//     get the deliberately-uninformative 404, with no way to tell why.
// Codes therefore stay Western everywhere — see `toWesternDigits` for the
// inbound direction, which accepts Arabic-Indic input and normalizes it.
// ---------------------------------------------------------------------------

const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";

/** Western digits -> Arabic-Indic. Non-digits pass through untouched. */
export function toArabicDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => ARABIC_INDIC[Number(d)] ?? d);
}

/**
 * Arabic-Indic (and Persian/extended) digits -> Western. Used on INPUT so a
 * tracking id or doctor code typed on an Arabic keyboard still matches the
 * stored Western form.
 */
export function toWesternDigits(input: string): string {
  return input
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/** Locale-aware number (counts, totals). Arabic gets Arabic-Indic digits. */
export function formatNumber(
  value: number | null | undefined,
  locale: string = "en",
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    numberingSystem: locale === "ar" ? "arab" : "latn",
  }).format(value);
}

/**
 * Shared date-formatting options.
 *
 * Both overrides are pinned deliberately rather than left to the locale:
 *   * calendar "gregory" — several ICU builds resolve `ar` to the Islamic
 *     calendar, which would silently render a DIFFERENT date rather than the
 *     same date in Arabic. This is the one that would actually corrupt meaning.
 *   * numberingSystem — `ar-EG` happens to default to `arab`, but the default
 *     varies by locale and ICU version, so state it instead of inheriting it.
 */
function dateOpts(locale: string, extra: Intl.DateTimeFormatOptions = {}) {
  const ar = locale === "ar";
  return {
    calendar: "gregory",
    numberingSystem: ar ? "arab" : "latn",
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...extra,
  } satisfies Intl.DateTimeFormatOptions;
}

/** BCP-47 tag for a locale. `ar-EG` gives Levantine/Egyptian Arabic-Indic. */
function tag(locale: string) {
  return locale === "ar" ? "ar-EG" : "en-GB";
}

export function formatDate(
  date: Date | string | null | undefined,
  locale: string = "en",
): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat(tag(locale), dateOpts(locale)).format(new Date(date));
}

export function formatDateTime(
  date: Date | string | null | undefined,
  locale: string = "en",
): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat(
    tag(locale),
    dateOpts(locale, { hour: "2-digit", minute: "2-digit" }),
  ).format(new Date(date));
}

/**
 * "2 days ago" / "منذ يومين" — for tooltips beside an absolute timestamp, never
 * as the only representation: relative time alone hides the actual instant.
 */
export function formatRelativeTime(
  date: Date | string | null | undefined,
  locale: string = "en",
): string {
  if (!date) return "";
  const then = new Date(date).getTime();
  const diffSec = Math.round((then - Date.now()) / 1000);
  const abs = Math.abs(diffSec);

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  for (const [unit, seconds] of units) {
    if (abs >= seconds) return rtf.format(Math.round(diffSec / seconds), unit);
  }
  return rtf.format(Math.round(diffSec), "second");
}

/**
 * Estimated completion is stored as a UTC wall-clock (a date plus an optional
 * time). Format it in UTC so every viewer — admin or public — sees exactly the
 * date/time the lab entered, regardless of their own timezone. A midnight
 * (00:00) time means no specific time was set, so we show the date only (this
 * also keeps legacy date-only cases rendering as before).
 */
export function formatEstCompletion(
  date: Date | string | null | undefined,
  locale: string = "en",
): string {
  if (!date) return "—";
  const d = new Date(date);
  const hasTime = d.getUTCHours() !== 0 || d.getUTCMinutes() !== 0;
  return new Intl.DateTimeFormat(
    tag(locale),
    dateOpts(locale, {
      ...(hasTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
      timeZone: "UTC",
    }),
  ).format(d);
}

/**
 * Redact a patient name for PUBLIC exposure: full first name + last initial
 * (e.g. "Mohamed G."). Enough for the doctor/patient to confirm the right case
 * without publishing the full surname to anyone holding the tracking ID. Must be
 * applied server-side so the full surname never reaches the client (S-M2).
 */
export function redactName(first: string, last: string): string {
  const f = first.trim();
  const lastInitial = last.trim().charAt(0).toUpperCase();
  if (!lastInitial) return f;
  return `${f} ${lastInitial}.`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}
