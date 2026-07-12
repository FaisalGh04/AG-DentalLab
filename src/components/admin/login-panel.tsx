"use client";

import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { LoginForm } from "@/components/admin/login-form";
import { useAdminI18n } from "@/components/i18n/admin-i18n";

/**
 * Client shell for the login card so its text can be translated (the login
 * route isn't under AdminProviders; its own AdminI18nProvider wraps this). The
 * dark background orbs stay in the server page around this.
 */
export function LoginPanel() {
  const { t } = useAdminI18n();
  return (
    <div className="w-full max-w-md">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-brand-100/70 transition-colors hover:text-[#F5F5F0]"
      >
        <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" /> {t("login.backToHome")}
      </Link>

      <div className="login-glass p-8">
        <div className="relative z-[3] flex flex-col items-center text-center">
          <Logo className="h-14 w-auto justify-center brightness-0 invert drop-shadow-[0_0_16px_rgba(123,183,157,0.3)]" />
          <div className="mt-6 flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-300/25 bg-brand-500/15 text-[#F5F5F0] shadow-glow">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-bold text-[#F5F5F0]">
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
