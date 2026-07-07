"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import en from "@/lib/i18n/locales/en.json";
import ar from "@/lib/i18n/locales/ar.json";
import {
  DEFAULT_LOCALE,
  DIRECTION,
  LOCALE_STORAGE_KEY,
  isLocale,
  isLocalizedPath,
  type Locale,
} from "@/lib/i18n/config";

const DICTIONARIES: Record<Locale, unknown> = { en, ar };

interface I18nContextValue {
  locale: Locale;
  dir: "ltr" | "rtl";
  setLocale: (locale: Locale) => void;
  toggle: () => void;
  /** Translate a dot-path key to a string, with optional {var} substitution. */
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** Translate a dot-path key that points at an array (strings or objects). */
  tList: <T = string>(key: string) => T[];
}

const I18nContext = React.createContext<I18nContextValue | null>(null);

/** Walk a dot-path (e.g. "about.timeline.founded.title") into a dictionary. */
function resolve(dict: unknown, key: string): unknown {
  return key.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object") {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, dict);
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Start from the default so SSR and the first client render match (keeps the
  // landing page statically renderable); the saved preference is applied on mount.
  const [locale, setLocaleState] = React.useState<Locale>(DEFAULT_LOCALE);
  const pathname = usePathname();

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
      if (isLocale(saved)) setLocaleState(saved);
    } catch {
      /* localStorage unavailable — stay on default */
    }
  }, []);

  // Reflect the active locale on <html> for direction + accessibility — but only
  // on localized (public) routes. Admin/login always stay English + LTR, even
  // when the visitor has picked Arabic for the public site. Re-runs on route
  // changes so client-side navigation into/out of admin flips correctly.
  React.useEffect(() => {
    const active = isLocalizedPath(pathname) ? locale : DEFAULT_LOCALE;
    document.documentElement.lang = active;
    document.documentElement.dir = DIRECTION[active];
  }, [locale, pathname]);

  const setLocale = React.useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
      document.cookie = `${LOCALE_STORAGE_KEY}=${next}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      /* ignore persistence failures */
    }
  }, []);

  const value = React.useMemo<I18nContextValue>(() => {
    const dict = DICTIONARIES[locale];
    const fallback = DICTIONARIES[DEFAULT_LOCALE];

    const t = (key: string, vars?: Record<string, string | number>) => {
      let node = resolve(dict, key);
      if (typeof node !== "string") node = resolve(fallback, key);
      if (typeof node !== "string") return key;
      let out = node;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          out = out.split(`{${k}}`).join(String(v));
        }
      }
      return out;
    };

    const tList = <T,>(key: string): T[] => {
      let node = resolve(dict, key);
      if (!Array.isArray(node)) node = resolve(fallback, key);
      return Array.isArray(node) ? (node as T[]) : [];
    };

    return {
      locale,
      dir: DIRECTION[locale],
      setLocale,
      toggle: () => setLocale(locale === "en" ? "ar" : "en"),
      t,
      tList,
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = React.useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within LanguageProvider");
  return ctx;
}
