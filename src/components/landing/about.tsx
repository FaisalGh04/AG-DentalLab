"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { CalendarDays, Users, PackageCheck, Boxes } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { Counter } from "@/components/motion/counter";
import { TextReveal } from "@/components/motion/text-reveal";
import { useI18n } from "@/components/i18n/language-provider";
import { cn } from "@/lib/utils";

// Static (year/icon/number) data; the translatable labels are keyed and
// resolved via t() at render time.
const TIMELINE = [
  { year: "1994", key: "founded" },
  { year: "2005", key: "digital" },
  { year: "2024", key: "rebrand" },
];

const COUNTERS = [
  { icon: CalendarDays, to: 35, suffix: "+", key: "years" },
  { icon: Users, to: 150, suffix: "+", key: "partners" },
  { icon: PackageCheck, to: 15000, suffix: "+", key: "cases" },
  { icon: Boxes, to: 100000, suffix: "+", key: "units" },
];

export function About() {
  const { t } = useI18n();
  return (
    <section id="about" className="relative py-24 md:py-36">
      <div className="container-tight">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="section-eyebrow">{t("about.eyebrow")}</span>
          <h2 className="mt-5 font-display text-4xl font-bold tracking-tight text-foreground text-balance md:text-5xl">
            <TextReveal text={t("about.title")} />
          </h2>
          <p className="mt-4 text-muted-foreground">{t("about.subtitle")}</p>
        </Reveal>

        {/* Premium stat cards */}
        <div className="mt-16 grid grid-cols-2 gap-4 md:grid-cols-4 lg:gap-6">
          {COUNTERS.map((c, i) => {
            const Icon = c.icon;
            return (
              <motion.div
                key={c.key}
                initial={{ opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -6 }}
                className="group premium-panel relative overflow-hidden p-6 text-center md:p-7"
              >
                {/* Gold hairline accent + hover sheen. */}
                <div className="absolute inset-x-0 top-0 h-px bg-gold-gradient opacity-70" />
                <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent to-brand-500/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-4 font-display text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
                  <Counter to={c.to} suffix={c.suffix} />
                </div>
                <p className="mt-1.5 text-sm font-medium text-muted-foreground">
                  {t(`about.counters.${c.key}`)}
                </p>
              </motion.div>
            );
          })}
        </div>

        <div className="mx-auto mt-20 hairline max-w-4xl" />

        <Timeline />
      </div>
    </section>
  );
}

/** Horizontal (desktop) / vertical (mobile) timeline with a scroll-filled line. */
function Timeline() {
  const { t, dir } = useI18n();
  const isRtl = dir === "rtl";
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 75%", "end 55%"],
  });
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const scaleY = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <div ref={ref} className="relative mt-16">
      {/* Desktop connecting track. */}
      <div className="absolute left-[16.66%] right-[16.66%] top-8 hidden h-px bg-brand-400/25 md:block">
        <motion.div
          style={{ scaleX }}
          className={cn(
            "h-full w-full from-brand-500 via-brand-600 to-gold-400",
            // Fill grows from the reading-start edge: left→right in LTR, and
            // right→left in RTL (where the year nodes render 2024 → 1994). The
            // mobile vertical line below is intentionally left untouched.
            isRtl
              ? "origin-right bg-gradient-to-l"
              : "origin-left bg-gradient-to-r",
          )}
        />
      </div>
      {/* Mobile vertical track. */}
      <div className="absolute bottom-4 left-8 top-4 w-px bg-brand-400/25 md:hidden">
        <motion.div
          style={{ scaleY }}
          className="h-full w-full origin-top bg-gradient-to-b from-brand-500 via-brand-600 to-gold-400"
        />
      </div>

      <div className="grid gap-8 md:grid-cols-3 md:gap-6">
        {TIMELINE.map((item, i) => (
          <motion.div
            key={item.year}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ delay: i * 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex items-start gap-5 pl-20 md:flex-col md:items-center md:pl-0 md:text-center"
          >
            {/* Year node. */}
            <div className="absolute left-0 top-0 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow ring-4 ring-background md:relative md:h-16 md:w-16">
              <span className="text-sm font-bold">{item.year}</span>
            </div>
            <div className="md:mt-6">
              <h3 className="text-lg font-semibold text-foreground">
                {t(`about.timeline.${item.key}.title`)}
              </h3>
              <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
                {t(`about.timeline.${item.key}.body`)}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
