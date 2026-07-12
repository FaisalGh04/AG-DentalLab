"use client";

import * as React from "react";
import { DirectionProvider } from "@radix-ui/react-direction";
import { useI18n } from "@/components/i18n/language-provider";
import { createTranslator, type Translator } from "@/lib/i18n/translate";
import type { Locale } from "@/lib/i18n/config";
import adminEn from "@/lib/i18n/locales/admin.en.json";
import adminAr from "@/lib/i18n/locales/admin.ar.json";

// Statically imported here (not in the root provider) so these dictionaries are
// bundled into the admin route chunk only — Next code-splits per route segment,
// so the public bundle never ships the admin strings.
const ADMIN_DICTS: Record<Locale, unknown> = { en: adminEn, ar: adminAr };

interface AdminI18nValue extends Translator {
  locale: Locale;
  dir: "ltr" | "rtl";
  toggle: () => void;
  setLocale: (locale: Locale) => void;
}

const AdminI18nContext = React.createContext<AdminI18nValue | null>(null);

/**
 * Admin-scoped translations. Locale/direction/toggle come from the shared
 * root LanguageProvider (single source of truth, one cookie), but `t`/`tList`
 * resolve against the admin dictionaries first, then fall back to the public
 * dictionary via the base `t` — so admin components can also read shared keys
 * like `category.*` without duplicating them.
 */
export function AdminI18nProvider({ children }: { children: React.ReactNode }) {
  const base = useI18n();

  const value = React.useMemo<AdminI18nValue>(() => {
    const admin = createTranslator(ADMIN_DICTS[base.locale], ADMIN_DICTS.en);
    const t: Translator["t"] = (key, vars) => {
      const out = admin.t(key, vars);
      return out === key ? base.t(key, vars) : out;
    };
    const tList: Translator["tList"] = <T,>(key: string) => {
      const out = admin.tList<T>(key);
      return out.length ? out : base.tList<T>(key);
    };
    return {
      locale: base.locale,
      dir: base.dir,
      toggle: base.toggle,
      setLocale: base.setLocale,
      t,
      tList,
    };
  }, [base]);

  // DirectionProvider makes Radix primitives (Select, DropdownMenu, Dialog)
  // align + keyboard-navigate correctly in RTL — the CSS logical props handle
  // the rest. Scoped to admin; the public site doesn't use these primitives.
  return (
    <AdminI18nContext.Provider value={value}>
      <DirectionProvider dir={value.dir}>{children}</DirectionProvider>
    </AdminI18nContext.Provider>
  );
}

export function useAdminI18n() {
  const ctx = React.useContext(AdminI18nContext);
  if (!ctx) {
    throw new Error("useAdminI18n must be used within AdminI18nProvider");
  }
  return ctx;
}
