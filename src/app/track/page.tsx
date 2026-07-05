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
    <>
      <Navbar />
      <main className="relative min-h-[100svh] pb-24 pt-36">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-24 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-brand-100/50 blur-[120px]" />
          <div className="absolute inset-0 bg-grid-brand [background-size:32px_32px] opacity-40" />
        </div>

        <div className="container-tight">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-brand-700"
          >
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>

          <div className="mx-auto mt-8 max-w-2xl text-center">
            <span className="section-eyebrow">Case Tracking</span>
            <h1 className="mt-5 font-display text-4xl font-bold tracking-tight text-ink md:text-5xl">
              Track your case in seconds
            </h1>
            <p className="mt-4 text-muted-foreground">
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
    </>
  );
}
