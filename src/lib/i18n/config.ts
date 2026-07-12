// Central i18n config. Add a new locale by adding a JSON file under
// `locales/` and registering it here — components need no changes.

export const LOCALES = ["en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Text direction per locale. */
export const DIRECTION: Record<Locale, "ltr" | "rtl"> = {
  en: "ltr",
  ar: "rtl",
};

/** Short label shown in the language switcher. */
export const LOCALE_LABEL: Record<Locale, string> = {
  en: "EN",
  ar: "AR",
};

/** localStorage / cookie key for the persisted preference. */
export const LOCALE_STORAGE_KEY = "ag-lang";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Routes where the selected locale (and its RTL direction) is applied. The
 * public site AND the admin panel (incl. /login) are localized; only API routes
 * (which don't render HTML) stay direction-agnostic. Keep this in sync with the
 * pre-paint script in `app/layout.tsx`.
 */
export function isLocalizedPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/track" ||
    pathname.startsWith("/track/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/login"
  );
}
