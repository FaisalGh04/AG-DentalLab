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

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
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
): string {
  if (!date) return "—";
  const d = new Date(date);
  const hasTime = d.getUTCHours() !== 0 || d.getUTCMinutes() !== 0;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(hasTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
    timeZone: "UTC",
  }).format(d);
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
