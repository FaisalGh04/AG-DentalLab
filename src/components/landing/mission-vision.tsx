"use client";

import { Target, Eye } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";

export function MissionVision() {
  return (
    <section className="relative py-24 md:py-36">
      <div className="container-tight grid gap-6 md:grid-cols-2">
        <Reveal direction="right">
          <div className="premium-panel relative h-full overflow-hidden p-8 md:p-10">
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-brand-50 to-transparent" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
              <Target className="h-7 w-7" />
            </div>
            <h3 className="relative mt-6 font-display text-2xl font-bold text-ink">
              Our Mission
            </h3>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              We are committed to providing integrated digital dental services
              including dental restorations, zirconia milling, precision metal
              fabrication, 3D printing, and technical support for dentists.
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Built on 35+ years of expertise and global quality standards, we
              deliver precise, reliable, and innovative solutions that improve
              clinical success and patient satisfaction.
            </p>
          </div>
        </Reveal>

        <Reveal direction="left" delay={0.1}>
          <div className="relative h-full overflow-hidden rounded-[1.5rem] border border-brand-800 bg-brand-950 p-8 text-white shadow-glow md:p-10">
            <div className="absolute inset-0 bg-grid-brand [background-size:30px_30px] opacity-[0.12]" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-brand-200 ring-1 ring-white/20">
              <Eye className="h-7 w-7" />
            </div>
            <h3 className="relative mt-6 font-display text-2xl font-bold">Our Vision</h3>
            <p className="mt-4 leading-relaxed text-white/70">
              To become the leading regional reference in integrated digital
              dental solutions by combining 30+ years of expertise with advanced
              digital manufacturing technologies.
            </p>
            <p className="mt-4 leading-relaxed text-white/70">
              We aim to elevate dental care quality and deliver better outcomes
              for dentists and patients.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
