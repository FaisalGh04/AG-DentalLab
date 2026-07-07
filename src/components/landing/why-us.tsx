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
import { useI18n } from "@/components/i18n/language-provider";

// Icons only; the title/body for each reason come from the "why.reasons" array
// (index-aligned) so they translate with the locale.
const REASON_ICONS = [
  BadgeCheck,
  Award,
  Clock,
  ShieldCheck,
  MessageCircle,
  Repeat,
  Handshake,
  Workflow,
];

export function WhyUs() {
  const { t, tList } = useI18n();
  const reasons = tList<{ title: string; body: string }>("why.reasons");
  return (
    <section id="why" className="relative overflow-hidden py-24 md:py-36">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_15%,rgba(123,183,157,0.12),transparent_28rem)]" />
      <div className="container-tight">
        <Reveal className="mx-auto max-w-3xl text-center">
          <span className="section-eyebrow">{t("why.eyebrow")}</span>
          <h2 className="mt-5 font-display text-4xl font-bold tracking-tight text-foreground text-balance md:text-5xl">
            <TextReveal text={t("why.title")} />
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            {t("why.subtitle")}
          </p>
        </Reveal>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {REASON_ICONS.map((Icon, i) => {
            const reason = reasons[i];
            return (
              <motion.div
                key={i}
                variants={staggerItem}
                whileHover={{ y: -5 }}
                className="group premium-panel relative min-h-48 overflow-hidden p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-glow"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gold-gradient opacity-0 transition-opacity duration-300 group-hover:opacity-70" />
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-brand-400/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="relative mt-4 font-semibold text-foreground">
                  {reason?.title}
                </h3>
                <p className="relative mt-2 text-sm leading-6 text-muted-foreground">
                  {reason?.body}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
