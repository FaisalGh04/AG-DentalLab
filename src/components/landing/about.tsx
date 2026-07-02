"use client";

import { motion } from "framer-motion";
import { Reveal } from "@/components/motion/reveal";
import { Counter } from "@/components/motion/counter";

const TIMELINE = [
  {
    year: "1994",
    title: "Founded",
    body: `AG Dental Lab was founded by Abdullatif Ghatasheh.`,
  },
  {
    year: "2006",
    title: "Digital Pioneer",
    body: "First dental lab in Jordan using digital CAD/CAM zirconia.",
  },
  {
    year: "2024",
    title: "AG Dental Lab",
    body: "Rebranded and became AG Dental Lab.",
  },
];

const COUNTERS = [
  { to: 35, suffix: "+", label: "Years Expertise" },
  { to: 150, suffix: "+", label: "Dentist Partners" },
  { to: 15000, suffix: "+", label: "Cases Delivered" },
  { to: 100000, suffix: "+", label: "Units Crafted" },
];

export function About() {
  return (
    <section id="about" className="relative py-24 md:py-32">
      <div className="container-tight">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="section-eyebrow">Our Story</span>
          <h2 className="mt-5 font-display text-4xl font-bold tracking-tight text-ink md:text-5xl">
            Three decades of dental craftsmanship
          </h2>
          <p className="mt-4 text-muted-foreground">
            From a single lab in Amman to a fully digital manufacturing partner
            trusted by dentists across the region.
          </p>
        </Reveal>

        {/* Timeline */}
        <div className="relative mt-16 grid gap-8 md:grid-cols-3">
          <div className="absolute left-0 right-0 top-6 hidden h-0.5 bg-gradient-to-r from-transparent via-brand-300 to-transparent md:block" />
          {TIMELINE.map((item, i) => (
            <Reveal key={item.year} delay={i * 0.12}>
              <div className="relative flex flex-col items-center text-center">
                <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-brand-gradient text-white shadow-glow">
                  <span className="text-xs font-bold">{item.year}</span>
                </div>
                <h3 className="mt-5 text-lg font-semibold text-ink">
                  {item.title}
                </h3>
                <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                  {item.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Counters */}
        <div className="mt-20 grid grid-cols-2 gap-6 md:grid-cols-4">
          {COUNTERS.map((c, i) => (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.6 }}
              className="glass rounded-2xl p-6 text-center"
            >
              <div className="font-display text-3xl font-extrabold text-gradient md:text-4xl">
                <Counter to={c.to} suffix={c.suffix} />
              </div>
              <p className="mt-2 text-sm font-medium text-muted-foreground">
                {c.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
