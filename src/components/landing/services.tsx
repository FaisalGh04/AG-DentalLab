"use client";

import { motion } from "framer-motion";
import { Layers, Anchor, Shield, Cpu } from "lucide-react";
import { Reveal, staggerContainer, staggerItem } from "@/components/motion/reveal";

const SERVICES = [
  {
    icon: Layers,
    title: "Fixed Restorations",
    items: [
      "Crowns",
      "Bridges",
      "Veneers",
      "Zirconia",
      "E.max",
      "PFM",
      "Inlay",
      "Onlay",
      "PMMA",
    ],
  },
  {
    icon: Anchor,
    title: "Implant Solutions",
    items: ["Single", "Multiple", "Full-Arch", "Custom Abutments"],
  },
  {
    icon: Shield,
    title: "Oral Appliances",
    items: ["Retainers", "Night Guards", "Sports Guards", "Bleaching Trays"],
  },
  {
    icon: Cpu,
    title: "Digital Dentistry",
    items: [
      "CAD/CAM",
      "Digital Design",
      "Milling",
      "3D Printing",
      "Digital Workflow",
    ],
  },
];

export function Services() {
  return (
    <section id="services" className="relative bg-muted/30 py-24 md:py-32">
      <div className="container-tight">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="section-eyebrow">What We Do</span>
          <h2 className="mt-5 font-display text-4xl font-bold tracking-tight text-ink md:text-5xl">
            A complete digital dental portfolio
          </h2>
          <p className="mt-4 text-muted-foreground">
            Every restoration produced in-house with an integrated digital
            workflow — from scan to delivery.
          </p>
        </Reveal>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4"
        >
          {SERVICES.map((s) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.title}
                variants={staggerItem}
                whileHover={{ y: -6 }}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-card transition-shadow hover:shadow-glow"
              >
                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-brand-100 opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-ink">
                  {s.title}
                </h3>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {s.items.map((item) => (
                    <li
                      key={item}
                      className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors group-hover:bg-brand-50 group-hover:text-brand-700"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
