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
  const toothY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const logoY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative flex min-h-[100svh] items-center overflow-hidden pb-16 pt-28 lg:pt-24"
    >
      <AuroraBackground />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-background to-transparent" />

      <motion.div
        style={{ opacity: contentOpacity }}
        className="container-tight grid items-center gap-10 lg:grid-cols-2 lg:gap-8"
      >
        {/* LEFT — 3D ceramic tooth */}
        <motion.div
          style={{ y: toothY }}
          className="relative order-2 lg:order-1"
        >
          <div className="relative mx-auto aspect-square w-full max-w-[300px] sm:max-w-[420px] lg:max-w-[560px]">
            {/* Pedestal glow. */}
            <div className="absolute inset-x-8 bottom-6 top-10 rounded-[50%] bg-brand-300/25 blur-3xl" />
            <ToothHero />
            <div className="pointer-events-none absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-1.5 text-[0.7rem] font-medium uppercase tracking-[0.16em] text-brand-600/70">
              <MousePointer2 className="h-3.5 w-3.5" />
              Move to interact
            </div>
          </div>
        </motion.div>

        {/* RIGHT — logo centerpiece + message */}
        <motion.div
          style={{ y: logoY }}
          className="order-1 flex flex-col items-center text-center lg:order-2 lg:items-start lg:text-left"
        >
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: easeOut }}
            className="section-eyebrow mb-8"
          >
            <Sparkles className="h-3.5 w-3.5 text-gold-500" />
            {SITE.descriptor}
          </motion.span>

          {/* The logo presentation — floating glass panel + orbiting rings. */}
          <LogoStage />

          <h1 className="mt-9 font-display text-4xl font-extrabold leading-[1.02] tracking-tight text-ink text-balance sm:text-5xl lg:text-[3.4rem]">
            <TextReveal text="Your Partner in" />
            <br />
            <TextReveal text="Perfect " delay={0.12} />
            <span className="text-shine-gold font-display">
              <TextReveal text="Smiles" delay={0.2} />
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4, ease: easeOut }}
            className="mt-6 max-w-xl text-base leading-8 text-muted-foreground md:text-lg"
          >
            Precision zirconia, CAD/CAM restorations, implant solutions and 3D
            printing — engineered for clinical success since 1994.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5, ease: easeOut }}
            className="mt-10 flex flex-col gap-3 sm:flex-row"
          >
            <Magnetic strength={0.35}>
              <Button asChild size="lg" variant="gradient">
                <Link href="/track">
                  <Search className="h-5 w-5" /> Track Your Case
                </Link>
              </Button>
            </Magnetic>
            <Magnetic strength={0.35}>
              <Button asChild size="lg" variant="outline">
                <Link href="/#contact">
                  Contact Us <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
            </Magnetic>
          </motion.div>
        </motion.div>
      </motion.div>

      <ScrollCue />
    </section>
  );
}

/** Floating glass logo panel with two counter-rotating accent rings + glow. */
function LogoStage() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.15, ease: easeOut }}
      className="relative flex w-full max-w-[440px] items-center justify-center"
    >
      {/* Ambient glow. */}
      <div className="absolute -inset-6 rounded-[50%] bg-gradient-to-br from-brand-200/50 via-white/20 to-gold-200/25 blur-3xl" />

      {/* Orbiting rings. */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="absolute aspect-square w-[118%] animate-spin-slow rounded-full border border-dashed border-brand-300/40" />
        <div className="absolute aspect-square w-[136%] animate-spin-reverse rounded-full border border-gold-300/25">
          <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-gold-400 shadow-gold-soft" />
          <span className="absolute -bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-brand-400" />
        </div>
      </div>

      {/* Floating glass card holding the mark. */}
      <motion.div
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="premium-panel relative grid aspect-[16/10] w-full place-items-center overflow-hidden p-8 sm:p-10"
      >
        <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/60 to-transparent" />
        <LogoMark priority className="relative max-w-[300px] sm:max-w-[340px]" />
      </motion.div>
    </motion.div>
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
      <div className="flex h-9 w-[22px] items-start justify-center rounded-full border border-brand-300/60 p-1.5">
        <motion.span
          animate={{ y: [0, 8, 0], opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="h-1.5 w-1 rounded-full bg-brand-500"
        />
      </div>
    </motion.div>
  );
}
