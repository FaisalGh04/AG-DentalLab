import type { Metadata } from "next";
import { AdminI18nProvider } from "@/components/i18n/admin-i18n";
import { LoginPanel } from "@/components/admin/login-panel";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Admin Login",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main className="dark landing-dark-shell relative flex min-h-[100svh] items-center justify-center p-6">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid-brand [background-size:34px_34px] opacity-[0.07]" />
        {/* Bright brand orbs sat directly behind the card so the frosted blur
            has vivid, varied light to soften — this is what sells the glass. */}
        <div className="absolute left-1/2 top-1/2 h-[420px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/30 blur-[100px]" />
        <div className="absolute left-[38%] top-[36%] h-[280px] w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-300/20 blur-[90px]" />
        <div className="absolute left-[64%] top-[62%] h-[300px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-700/30 blur-[110px]" />
      </div>

      {/* Login is outside AdminProviders, so it gets its own admin-i18n scope. */}
      <AdminI18nProvider>
        <LoginPanel />
      </AdminI18nProvider>

      {/* Toast surface for sign-in errors (previously provided by the root
          layout; now scoped here since the landing page doesn't need it). */}
      <Toaster />
    </main>
  );
}
