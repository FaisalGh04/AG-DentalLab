"use client";

import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { LoginForm } from "@/components/admin/login-form";
import { useAdminI18n } from "@/components/i18n/admin-i18n";
import { AdminThemeToggle } from "@/components/admin/admin-theme";

/**
 * Client shell for the login card so its text can be translated (the login
 * route isn't under AdminProviders; its own AdminI18nProvider wraps this). The
 * dark background orbs stay in the server page around this.
 */
export function LoginPanel() {
  const { t } = useAdminI18n();
  return (
    <div className="w-full max-w-md">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-brand-800 dark:text-brand-100/70 dark:hover:text-brand-50"
      >
        <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" /> {t("login.backToHome")}
        </Link>
        <AdminThemeToggle className="shrink-0 [&_span]:hidden sm:[&_span]:inline" />
      </div>

      <div className="login-glass p-8">
        <div className="relative z-[3] flex flex-col items-center text-center">
          <Logo className="h-14 w-auto justify-center dark:brightness-0 dark:invert dark:drop-shadow-[0_0_16px_rgba(123,183,157,0.3)]" />
          <div className="mt-6 flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-300/25 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-50 shadow-glow">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-bold text-ink dark:text-foreground">
            {t("login.title")}
          </h1>
        </div>

        <div className="relative z-[3] mt-8">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
