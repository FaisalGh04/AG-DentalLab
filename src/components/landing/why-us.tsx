"use client";

import { motion } from "framer-motion";
import {
  BadgeCheck,
  Award,
  Clock,
  ShieldCheck,
  MessageCircle,
  Repeat,
  Handshake,
  Workflow,
} from "lucide-react";
import { Reveal, staggerContainer, staggerItem } from "@/components/motion/reveal";

const REASONS = [
  { icon: BadgeCheck, title: "Predictable Quality", body: "Consistent, repeatable results on every single case." },
  { icon: Award, title: "Pioneer in Jordan", body: "First lab in Jordan to adopt digital CAD/CAM zirconia." },
  { icon: Clock, title: "35+ Years Experience", body: "Decades of refined dental craftsmanship." },
  { icon: ShieldCheck, title: "Trusted Warranty", body: "Confidence backed by a dependable guarantee." },
  { icon: MessageCircle, title: "Direct Communication", body: "Talk straight to the lab, no middlemen." },
  { icon: Repeat, title: "Ongoing Follow-up", body: "We stay with each case until it's perfect." },
  { icon: Handshake, title: "Long-Term Partnership", body: "We grow together with our dentist partners." },
  { icon: Workflow, title: "Integrated Digital System", body: "One seamless workflow from scan to delivery." },
];

export function WhyUs() {
  return (
    <section id="why" className="relative py-24 md:py-32">
      <div className="container-tight">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="section-eyebrow">Why Choose Us</span>
          <h2 className="mt-5 font-display text-4xl font-bold tracking-tight text-ink md:text-5xl">
            The partner dentists rely on
          </h2>
        </Reveal>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {REASONS.map((r) => {
            const Icon = r.icon;
            return (
              <motion.div
                key={r.title}
                variants={staggerItem}
                whileHover={{ y: -5 }}
                className="group rounded-2xl border border-border bg-card p-6 shadow-soft transition-shadow hover:shadow-glow"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 transition-colors group-hover:bg-brand-gradient group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold text-ink">{r.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{r.body}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
