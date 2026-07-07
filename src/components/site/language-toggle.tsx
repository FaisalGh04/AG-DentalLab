"use client";

import { Globe } from "lucide-react";
import { useI18n } from "@/components/i18n/language-provider";
import { LOCALES, LOCALE_LABEL } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

/**
 * Compact segmented language switcher (🌐 EN | AR). One click sets the locale,
 * which flips direction (LTR/RTL) and persists the choice. Theme-aware: adapts
 * to both light and dark navbar surfaces (public pages currently render dark).
 */
export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      role="group"
      aria-label={t("nav.language")}
      className={cn(
        "flex items-center gap-0.5 rounded-xl border border-brand-200/70 bg-white/60 p-0.5 backdrop-blur-sm dark:border-white/15 dark:bg-white/5",
        className,
      )}
    >
      <Globe
        className="mx-1 h-3.5 w-3.5 shrink-0 text-foreground/45 dark:text-white/55"
        aria-hidden
      />
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          aria-pressed={locale === l}
          className={cn(
            "rounded-lg px-2 py-1 text-xs font-semibold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/50",
            locale === l
              ? "bg-brand-700 text-white shadow-sm dark:bg-white/90 dark:text-brand-900"
              : "text-foreground/60 hover:text-brand-800 dark:text-white/60 dark:hover:text-white",
          )}
        >
          {LOCALE_LABEL[l]}
        </button>
      ))}
    </div>
  );
}
