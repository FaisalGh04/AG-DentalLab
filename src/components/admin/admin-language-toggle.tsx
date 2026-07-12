"use client";

import { Languages } from "lucide-react";
import { useAdminI18n } from "@/components/i18n/admin-i18n";
import { LOCALE_LABEL } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

/**
 * Admin EN/AR switch. Drives the shared LanguageProvider locale (same cookie as
 * the public site), so switching here mirrors everywhere. Shows the language the
 * click will switch TO.
 */
export function AdminLanguageToggle({ className }: { className?: string }) {
  const { locale, toggle } = useAdminI18n();
  const next = locale === "en" ? "ar" : "en";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`${LOCALE_LABEL[next]}`}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border border-border/80 bg-white/70 px-3 py-2 text-sm font-medium text-foreground/70 shadow-inner-glow transition-colors hover:bg-brand-50/70 hover:text-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/40",
        className,
      )}
    >
      <Languages className="h-4 w-4 text-brand-500/80" />
      {LOCALE_LABEL[next]}
    </button>
  );
}
