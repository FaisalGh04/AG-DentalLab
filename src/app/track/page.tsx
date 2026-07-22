import type { Metadata } from "next";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { TrackClient } from "@/components/track/track-client";
import { TrackHeader } from "@/components/track/track-header";
import { getLifecycleConfig } from "@/lib/lifecycle";

export const metadata: Metadata = {
  title: "Track Your Case",
  description:
    "Enter your AG Dental Lab tracking ID to see live case status and production timeline.",
  alternates: { canonical: "/track" },
};

// ISR: the lifecycle config is loaded at build/revalidate time (not per request),
// so the page stays statically cached. Rarely changes; refreshed at most hourly.
export const revalidate = 3600;

export default async function TrackPage() {
  const lifecycleConfig = await getLifecycleConfig();
  return (
    <div className="dark min-h-dvh bg-background text-foreground">
      <Navbar />
      <main className="relative isolate min-h-[100svh] overflow-hidden pb-24 pt-36">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-background" />
          {/* Mobile-reduced blur radius. At full radius these huge filter:blur
              orbs re-rasterize on every iOS-Safari toolbar-collapse viewport
              resize during scroll, stalling the page for ~20s (desktop and
              fixed-toolbar browsers are unaffected). md: keeps the original
              desktop look pixel-identical. See globals.css mobile perf guards. */}
          <div className="absolute left-[-12%] top-[-10%] h-[540px] w-[680px] rounded-full bg-brand-500/35 blur-[45px] md:blur-[120px]" />
          <div className="absolute right-[-14%] top-10 h-[500px] w-[760px] rounded-full bg-brand-700/28 blur-[50px] md:blur-[140px]" />
          <div className="absolute bottom-[-20%] left-1/2 h-[460px] w-[860px] -translate-x-1/2 rounded-full bg-brand-300/14 blur-[55px] md:blur-[150px]" />
          <div className="absolute inset-0 bg-grid-brand [background-size:34px_34px] opacity-[0.08]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(83,136,111,0.16),transparent_42rem)]" />
        </div>

        <div className="container-tight">
          <TrackHeader />

          <div className="mt-12">
            <TrackClient config={lifecycleConfig} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
