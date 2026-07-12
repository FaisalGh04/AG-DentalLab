import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { LoginForm } from "@/components/admin/login-form";
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

      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-brand-100/70 transition-colors hover:text-[#F5F5F0]"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <div className="login-glass p-8">
          <div className="relative z-[3] flex flex-col items-center text-center">
            <Logo className="h-14 w-auto justify-center brightness-0 invert drop-shadow-[0_0_16px_rgba(123,183,157,0.3)]" />
            <div className="mt-6 flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-300/25 bg-brand-500/15 text-[#F5F5F0] shadow-glow">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h1 className="mt-5 font-display text-2xl font-bold text-[#F5F5F0]">
              Admin Sign In
            </h1>
          </div>

          <div className="relative z-[3] mt-8">
            <Suspense fallback={null}>
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Toast surface for sign-in errors (previously provided by the root
          layout; now scoped here since the landing page doesn't need it). */}
      <Toaster />
    </main>
  );
}
