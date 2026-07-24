"use client";

import { motion } from "framer-motion";
import { Layers, Crown, Shield, Cpu } from "lucide-react";
import { Reveal, staggerContainer, staggerItem } from "@/components/motion/reveal";
import { TextReveal } from "@/components/motion/text-reveal";
import { useI18n } from "@/components/i18n/language-provider";

// Icon + i18n key per service; titles and item chips resolve via t()/tList().
const SERVICES = [
  { icon: Layers, key: "fixed" },
  { icon: Crown, key: "implant" },
  { icon: Shield, key: "oral" },
  { icon: Cpu, key: "digital" },
];

export function Services() {
  const { t, tList } = useI18n();
  return (
    <section id="services" className="relative py-24 md:py-36">
      {/* Subtle teal wash (fades at edges → no hard section line). */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,transparent,rgba(71,133,109,0.05),transparent)]" />
      <div className="container-tight">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="section-eyebrow">{t("services.eyebrow")}</span>
          <h2 className="mt-5 font-display text-4xl font-bold tracking-tight text-foreground text-balance md:text-5xl">
            <TextReveal text={t("services.title")} />
          </h2>
          <p className="mt-4 text-muted-foreground">{t("services.subtitle")}</p>
        </Reveal>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-4"
        >
          {SERVICES.map((s) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.key}
                variants={staggerItem}
                whileHover={{ y: -6 }}
                className="group premium-panel relative min-h-[300px] overflow-hidden p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-glow"
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gold-gradient opacity-0 transition-opacity duration-300 group-hover:opacity-80" />
                <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-brand-400/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-foreground">
                  {t(`services.${s.key}.title`)}
                </h3>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {tList(`services.${s.key}.items`).map((item) => (
                    <li
                      key={item}
                      className="rounded-full border border-brand-400/20 bg-brand-500/10 px-2.5 py-1 text-xs font-medium text-brand-100/80 transition-colors group-hover:border-brand-300/40 group-hover:bg-brand-500/20 group-hover:text-brand-100"
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
