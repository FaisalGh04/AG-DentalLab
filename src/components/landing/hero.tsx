"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Search, ArrowRight, Sparkles, MousePointer2 } from "lucide-react";
import { LogoMark } from "@/components/brand/logo-mark";
import { ToothHero } from "@/components/three/tooth-hero";
import { AuroraBackground } from "@/components/motion/aurora-background";
import { TextReveal } from "@/components/motion/text-reveal";
import { Magnetic } from "@/components/motion/magnetic";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/constants";

const easeOut = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const contentOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const panelY = useTransform(scrollYProgress, [0, 1], [0, 70]);

  return (
    <section
      ref={ref}
      className="relative flex min-h-[100svh] items-center overflow-hidden pb-20 pt-28 lg:pt-32"
    >
      <AuroraBackground />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-background to-transparent" />

      <motion.div
        style={{ opacity: contentOpacity, y: panelY }}
        className="container-tight"
      >
        {/* ── ONE glass panel: logo (top-left) + 3D tooth (right) ─────────── */}
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, ease: easeOut }}
          className="premium-panel relative overflow-hidden p-6 sm:p-9 lg:p-12"
        >
          {/* Soft brand glow accents washing across the glass. */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-brand-700/30 blur-3xl"
          />
          {/* Top sheen. */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/[0.06] to-transparent" />

          <div className="relative flex flex-col gap-8 lg:grid lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:gap-x-12">
            {/* LOGO — top-left (desktop) / top-center (mobile) */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: easeOut }}
              className="order-1 flex justify-center lg:col-start-1 lg:row-start-1 lg:justify-start"
            >
              <LogoMark
                priority
                className="w-[220px] max-w-full brightness-0 invert drop-shadow-[0_0_26px_rgba(123,183,157,0.28)] sm:w-[260px]"
              />
            </motion.div>

            {/* 3D TOOTH — right of logo (desktop) / below logo (mobile) */}
            <div className="order-2 lg:order-none lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
              <div className="relative mx-auto aspect-square w-full max-w-[280px] sm:max-w-[360px] lg:max-w-[460px]">
                <div className="absolute inset-8 rounded-[50%] bg-brand-400/15 blur-3xl" />
                <ToothHero />
                <div className="pointer-events-none absolute bottom-1 left-1/2 hidden -translate-x-1/2 items-center gap-1.5 text-[0.68rem] font-medium uppercase tracking-[0.16em] text-brand-200/55 lg:flex">
                  <MousePointer2 className="h-3.5 w-3.5" />
                  Move to interact
                </div>
              </div>
            </div>

            {/* MESSAGE — cream, high-contrast; below logo (desktop) / below tooth (mobile) */}
            <div className="order-3 flex flex-col items-center text-center lg:col-start-1 lg:row-start-2 lg:items-start lg:text-left">
              <motion.span
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2, ease: easeOut }}
                className="section-eyebrow mb-6"
              >
                <Sparkles className="h-3.5 w-3.5 text-gold-300" />
                {SITE.descriptor}
              </motion.span>

              <h1 className="font-display text-4xl font-extrabold leading-[1.03] tracking-tight text-foreground text-balance sm:text-5xl lg:text-[3.2rem]">
                <TextReveal text="Your Partner in" inView={false} />
                <br />
                <TextReveal text="Perfect " delay={0.12} inView={false} />
                <span className="text-shine-gold font-display">
                  <TextReveal text="Smiles" delay={0.2} inView={false} />
                </span>
              </h1>

              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.45, ease: easeOut }}
                className="mt-5 max-w-xl text-base leading-8 text-muted-foreground md:text-lg"
              >
                Precision zirconia, CAD/CAM restorations, implant solutions and 3D
                printing — engineered for clinical success since 1994.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.55, ease: easeOut }}
                className="mt-8 flex flex-col gap-3 sm:flex-row"
              >
                <Magnetic strength={0.35}>
                  <Button
                    asChild
                    size="lg"
                    className="bg-[#F5F5F0] text-brand-900 shadow-glow hover:-translate-y-0.5 hover:bg-white"
                  >
                    <Link href="/track">
                      <Search className="h-5 w-5" /> Track Your Case
                    </Link>
                  </Button>
                </Magnetic>
                <Magnetic strength={0.35}>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="border-brand-300/40 bg-brand-900/30 text-foreground hover:border-brand-300/70 hover:bg-brand-800/50 hover:text-white"
                  >
                    <Link href="/#contact">
                      Contact Us <ArrowRight className="h-5 w-5" />
                    </Link>
                  </Button>
                </Magnetic>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <ScrollCue />
    </section>
  );
}

/** Subtle animated scroll indicator. */
function ScrollCue() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.1, duration: 0.8 }}
      className="pointer-events-none absolute inset-x-0 bottom-6 hidden justify-center lg:flex"
    >
      <div className="flex h-9 w-[22px] items-start justify-center rounded-full border border-brand-300/50 p-1.5">
        <motion.span
          animate={{ y: [0, 8, 0], opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="h-1.5 w-1 rounded-full bg-brand-300"
        />
      </div>
    </motion.div>
  );
}
