import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { TrackClient } from "@/components/track/track-client";

export const metadata: Metadata = {
  title: "Track Your Case",
  description:
    "Enter your AG Dental Lab tracking ID to see live case status and production timeline.",
  alternates: { canonical: "/track" },
};

export default function TrackPage() {
  return (
    <div className="dark min-h-dvh bg-background text-foreground">
      <Navbar />
      <main className="relative isolate min-h-[100svh] overflow-hidden pb-24 pt-36">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-background" />
          <div className="absolute left-[-12%] top-[-10%] h-[540px] w-[680px] rounded-full bg-brand-500/35 blur-[120px]" />
          <div className="absolute right-[-14%] top-10 h-[500px] w-[760px] rounded-full bg-brand-700/28 blur-[140px]" />
          <div className="absolute bottom-[-20%] left-1/2 h-[460px] w-[860px] -translate-x-1/2 rounded-full bg-brand-300/14 blur-[150px]" />
          <div className="absolute inset-0 bg-grid-brand [background-size:34px_34px] opacity-[0.08]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(83,136,111,0.16),transparent_42rem)]" />
        </div>

        <div className="container-tight">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-brand-100/70 transition-colors hover:text-cream"
          >
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>

          <div className="mx-auto mt-8 max-w-2xl text-center">
            <span className="section-eyebrow">
              Case Tracking
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold tracking-tight text-cream md:text-5xl">
              Track your case in seconds
            </h1>
            <p className="mt-4 text-brand-50/70">
              Enter the tracking ID provided by the lab to view real-time status
              and the full production timeline. No account required.
            </p>
          </div>

          <div className="mt-12">
            <TrackClient />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
