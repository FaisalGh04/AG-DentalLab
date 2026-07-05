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
import { TextReveal } from "@/components/motion/text-reveal";

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
    <section id="why" className="relative overflow-hidden py-24 md:py-36">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_15%,rgba(123,183,157,0.14),transparent_28rem),linear-gradient(180deg,transparent,rgba(255,255,255,0.42),transparent)]" />
      <div className="container-tight">
        <Reveal className="mx-auto max-w-3xl text-center">
          <span className="section-eyebrow">Why Choose Us</span>
          <h2 className="mt-5 font-display text-4xl font-bold tracking-tight text-ink text-balance md:text-5xl">
            <TextReveal text="The partner dentists rely on" />
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            Built for clinicians who need dependable communication, clean
            workflows, and restoration quality that stays consistent from one
            case to the next.
          </p>
        </Reveal>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {REASONS.map((r) => {
            const Icon = r.icon;
            return (
              <motion.div
                key={r.title}
                variants={staggerItem}
                whileHover={{ y: -5 }}
                className="group premium-panel relative min-h-48 overflow-hidden p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-glow"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gold-gradient opacity-0 transition-opacity duration-300 group-hover:opacity-70" />
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-brand-50/80 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100 transition-colors group-hover:bg-brand-gradient group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="relative mt-4 font-semibold text-ink">{r.title}</h3>
                <p className="relative mt-2 text-sm leading-6 text-muted-foreground">{r.body}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
