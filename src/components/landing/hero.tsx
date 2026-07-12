"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Search, ArrowRight, Sparkles } from "lucide-react";
import { LogoMark } from "@/components/brand/logo-mark";
import { HeroVideo } from "@/components/landing/hero-video";
import { AuroraBackground } from "@/components/motion/aurora-background";
import { TextReveal } from "@/components/motion/text-reveal";
import { Magnetic } from "@/components/motion/magnetic";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n/language-provider";

const easeOut = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  const { t, dir } = useI18n();
  const isRtl = dir === "rtl";
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const contentOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const panelY = useTransform(scrollYProgress, [0, 1], [0, 70]);

  return (
    <section
      id="hero"
      ref={ref}
      className="relative flex min-h-[100svh] items-center overflow-hidden pb-20 pt-28 lg:pt-32"
    >
      <AuroraBackground />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-background to-transparent" />

      <motion.div
        style={{ opacity: contentOpacity, y: panelY }}
        className="container-tight"
      >
        {/* ── ONE glass panel: centered, text-focused hero ───────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, ease: easeOut }}
          className="premium-panel relative overflow-hidden px-6 py-14 sm:px-9 sm:py-16 lg:px-12 lg:py-20"
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
          {/* Background intro video (behind content; overlay keeps contrast). */}
          <HeroVideo />

          {/* Top sheen. */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-white/[0.06] to-transparent" />

          {/* Layout mirrors purely off the <html> dir attribute: the text block
              is DOM-first (start edge → left in LTR, right in RTL) and the CTAs
              are DOM-second (end edge). No isRtl branching needed for the split. */}
          <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center gap-10 text-center lg:flex-row lg:items-center lg:justify-between lg:gap-12 lg:text-start">
            {/* ── TEXT BLOCK: logo + eyebrow + heading (start edge) ─────── */}
            <div className="flex flex-col items-center lg:items-start">
              {/* LOGO */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.1, ease: easeOut }}
                className="mb-6 flex"
              >
                <LogoMark
                  priority
                  className="w-[220px] max-w-full brightness-0 invert drop-shadow-[0_0_26px_rgba(123,183,157,0.28)] sm:w-[280px]"
                />
              </motion.div>

              {/* MESSAGE — cream, high-contrast */}
              <motion.span
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2, ease: easeOut }}
                className="section-eyebrow mb-6"
              >
                <Sparkles className="h-3.5 w-3.5 text-gold-300" />
                {t("hero.badge")}
              </motion.span>

              <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground text-balance sm:text-5xl lg:text-6xl">
                <TextReveal text={t("hero.title1")} inView={false} />
                <br />
                {/* Second line = two words. The gold highlight must land on
                    "Smiles" (ابتسامات), which is title3 in English but title2 in
                    Arabic (noun precedes adjective), so the highlighted slot is
                    locale-aware. DOM order stays title2→title3, keeping the
                    reading order correct in both directions. */}
                {[
                  { key: "hero.title2", delay: 0.12, gold: isRtl },
                  { key: "hero.title3", delay: 0.2, gold: !isRtl },
                ].map(({ key, delay, gold }) =>
                  gold ? (
                    // Gradient sits on the animated word span itself (not a
                    // wrapping ancestor) so mobile WebKit doesn't paint the
                    // background-clip:text word transparent. See TextReveal.
                    <TextReveal
                      key={key}
                      text={t(key)}
                      delay={delay}
                      inView={false}
                      wordClassName="text-shine-gold"
                    />
                  ) : (
                    <TextReveal key={key} text={t(key)} delay={delay} inView={false} />
                  ),
                )}
              </h1>
            </div>

            {/* ── CTA BLOCK: two buttons (end edge; mirrors via dir) ────── */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.45, ease: easeOut }}
              className="flex w-full max-w-xs flex-col gap-3 sm:max-w-sm lg:w-auto lg:shrink-0"
            >
              <Magnetic strength={0.35} className="w-full">
                <Button
                  asChild
                  size="lg"
                  className="w-full bg-[#F5F5F0] text-brand-900 shadow-glow hover:-translate-y-0.5 hover:bg-white"
                >
                  <Link href="/track">
                    <Search className="h-5 w-5" /> {t("hero.trackCase")}
                  </Link>
                </Button>
              </Magnetic>
              <Magnetic strength={0.35} className="w-full">
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="w-full border-brand-300/40 bg-brand-900/30 text-foreground hover:border-brand-300/70 hover:bg-brand-800/50 hover:text-white"
                >
                  <Link href="/#contact">
                    {t("hero.contactUs")} <ArrowRight className="h-5 w-5" />
                  </Link>
                </Button>
              </Magnetic>
            </motion.div>
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
