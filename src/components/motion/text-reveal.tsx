"use client";

import * as React from "react";
import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

const container: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.055, delayChildren: 0.05 },
  },
};

const word: Variants = {
  hidden: { y: "115%", opacity: 0, filter: "blur(10px)" },
  show: {
    y: "0%",
    opacity: 1,
    filter: "blur(0px)",
    transition: { duration: 0.72, ease: [0.22, 1, 0.36, 1] },
  },
};

/**
 * Word-by-word blur/clip reveal. Each word rides up from a clipped baseline as
 * it enters view — the signature cinematic headline motion.
 */
export function TextReveal({
  text,
  className,
  delay = 0,
  once = true,
  inView = true,
}: {
  text: string;
  className?: string;
  delay?: number;
  once?: boolean;
  /** When false, reveal fires on mount instead of on scroll-into-view.
   *  Use for above-the-fold content (e.g. the hero headline). */
  inView?: boolean;
}) {
  const words = text.split(" ");
  const trigger = inView
    ? { whileInView: "show" as const, viewport: { once, margin: "-12% 0px" } }
    : { animate: "show" as const };
  return (
    <span className={cn("inline", className)}>
      <motion.span
        // Keying on `text` remounts the reveal whenever the copy changes (e.g. a
        // locale switch). Without this, the new words mount at `initial="hidden"`
        // but the parent's `whileInView` has already fired once (its observer is
        // gone), so the words would stay at opacity 0 — invisible until reload.
        // A fresh mount re-observes and re-reveals while on screen.
        key={text}
        variants={container}
        initial="hidden"
        {...trigger}
        transition={{ delayChildren: delay }}
        className="inline"
        aria-hidden
      >
        {words.map((w, i) => (
          <span
            key={`${w}-${i}`}
            // `overflow-hidden` masks the word as it slides up. Latin ascenders
            // fit the default box, but Arabic letters/diacritics sit taller and
            // get clipped at the top — so add top room in RTL only (the `rtl:`
            // variant keys off <html dir="rtl">, leaving LTR pixel-identical).
            className="inline-flex overflow-hidden pb-[0.12em] align-baseline rtl:pt-[0.28em]"
          >
            <motion.span variants={word} className="inline-block will-change-transform">
              {w}
            </motion.span>
            {i < words.length - 1 && <span>&nbsp;</span>}
          </span>
        ))}
      </motion.span>
      {/* Accessible, unstyled copy for screen readers / no-JS. */}
      <span className="sr-only">{text}</span>
    </span>
  );
}
