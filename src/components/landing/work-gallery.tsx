"use client";

import { motion } from "framer-motion";
import { ImageIcon } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { cn } from "@/lib/utils";

// Empty placeholders — the lab owner will add real portfolio images later.
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
    <section id="work" className="relative bg-muted/30 py-24 md:py-32">
      <div className="container-tight">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="section-eyebrow">Our Work</span>
          <h2 className="mt-5 font-display text-4xl font-bold tracking-tight text-ink md:text-5xl">
            Craftsmanship you can see
          </h2>
          <p className="mt-4 text-muted-foreground">
            A curated gallery of our finest restorations. Images coming soon.
          </p>
        </Reveal>

        <div className="mt-16 grid auto-rows-[200px] grid-cols-2 gap-4 md:grid-cols-4">
          {PLACEHOLDERS.map((p, i) => (
            <motion.figure
              key={i}
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.5 }}
              whileHover={{ scale: 1.01 }}
              className={cn(
                "group relative flex items-center justify-center overflow-hidden rounded-2xl border border-dashed border-brand-200 bg-gradient-to-br from-white to-brand-50/50",
                p.span,
              )}
            >
              {/* Replace this placeholder with <Image /> once assets exist. */}
              <div className="flex flex-col items-center gap-2 text-brand-300 transition-transform duration-300 group-hover:scale-110">
                <ImageIcon className="h-8 w-8" />
                <span className="text-xs font-medium text-brand-400">
                  {p.label}
                </span>
              </div>
              <div className="absolute inset-0 bg-brand-gradient opacity-0 transition-opacity duration-300 group-hover:opacity-[0.06]" />
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
