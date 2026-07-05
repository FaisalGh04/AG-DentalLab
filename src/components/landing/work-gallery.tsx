"use client";

import { motion } from "framer-motion";
import { ImageIcon } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { TextReveal } from "@/components/motion/text-reveal";
import { cn } from "@/lib/utils";

// Empty placeholders until the lab owner adds real portfolio images later.
// A varied grid layout keeps the section looking intentional while empty.
const PLACEHOLDERS = [
  { span: "md:col-span-2 md:row-span-2", label: "Full-Arch Zirconia" },
  { span: "", label: "E.max Veneers" },
  { span: "", label: "Implant Bridge" },
  { span: "md:col-span-2", label: "Digital Smile Design" },
  { span: "", label: "PFM Crown" },
  { span: "", label: "Night Guard" },
];

export function WorkGallery() {
  return (
    <section id="work" className="relative py-24 md:py-36">
      {/* Subtle teal wash (fades at edges → no hard section line). */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,transparent,rgba(71,133,109,0.05),transparent)]" />
      <div className="container-tight">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="section-eyebrow">Our Work</span>
          <h2 className="mt-5 font-display text-4xl font-bold tracking-tight text-foreground text-balance md:text-5xl">
            <TextReveal text="Craftsmanship you can see" />
          </h2>
          <p className="mt-4 text-muted-foreground">
            A curated gallery of our finest restorations. Images coming soon.
          </p>
        </Reveal>

        <div className="mt-16 grid auto-rows-[180px] grid-cols-2 gap-3 md:auto-rows-[220px] md:grid-cols-4 md:gap-5">
          {PLACEHOLDERS.map((p, i) => (
            <motion.figure
              key={i}
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.5 }}
              whileHover={{ scale: 1.01 }}
              className={cn(
                "premium-panel group relative flex items-center justify-center overflow-hidden border-dashed border-brand-400/25 transition-all duration-300 hover:-translate-y-1 hover:shadow-glow",
                p.span,
              )}
            >
              {/* Replace this placeholder with <Image /> once assets exist. */}
              <div className="relative z-10 flex flex-col items-center gap-3 text-brand-200/55 transition-transform duration-300 group-hover:scale-105 group-hover:text-brand-200/80">
                <ImageIcon className="h-8 w-8" />
                <span className="max-w-[9rem] text-center text-xs font-semibold text-brand-100/70">
                  {p.label}
                </span>
              </div>
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-brand-500/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
