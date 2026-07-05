import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = {
  title: "Admin Login",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main className="relative flex min-h-[100svh] items-center justify-center overflow-hidden p-6">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid-brand [background-size:32px_32px] opacity-50" />
        <div className="absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-brand-100/60 blur-[120px]" />
      </div>

      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <div className="glass rounded-[1.5rem] p-8 shadow-card">
          <div className="flex flex-col items-center text-center">
            <Logo className="h-14" />
            <div className="mt-6 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h1 className="mt-5 font-display text-2xl font-bold text-ink">
              Admin Sign In
            </h1>
            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
              Restricted access - AG Dental Lab management console.
            </p>
          </div>

          <div className="mt-8">
            <Suspense fallback={null}>
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  );
}
