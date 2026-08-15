"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { ThemeProvider, useTheme } from "next-themes";
import { useAdminI18n } from "@/components/i18n/admin-i18n";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "ag-admin-theme";

function AdminThemeBoundary({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    document.body.dataset.adminThemeActive = "true";
    return () => {
      delete document.body.dataset.adminThemeActive;
      document.documentElement.classList.remove("light", "dark");
      document.documentElement.style.colorScheme = "";
    };
  }, []);
  return children;
}

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      storageKey={STORAGE_KEY}
      defaultTheme="light"
      enableSystem={false}
      enableColorScheme
      disableTransitionOnChange
    >
      <AdminThemeBoundary>{children}</AdminThemeBoundary>
    </ThemeProvider>
  );
}

export function AdminThemeToggle({ className }: { className?: string }) {
  const { t } = useAdminI18n();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";
  const label = dark ? t("theme.switchToLight") : t("theme.switchToDark");

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={dark}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className={cn(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border/80 bg-white/70 px-3 py-2 text-sm font-medium text-foreground/70 shadow-inner-glow transition-colors hover:bg-brand-50/70 hover:text-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/40 dark:bg-white/[0.06] dark:text-brand-100/80 dark:hover:bg-brand-500/15 dark:hover:text-brand-50",
        className,
      )}
    >
      {dark ? (
        <Sun className="h-4 w-4 text-gold-400" />
      ) : (
        <Moon className="h-4 w-4 text-brand-600" />
      )}
      <span>{mounted ? (dark ? t("theme.light") : t("theme.dark")) : t("theme.theme")}</span>
    </button>
  );
}
