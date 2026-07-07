"use client";

import { Target, Eye } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { useI18n } from "@/components/i18n/language-provider";

export function MissionVision() {
  const { t } = useI18n();
  return (
    <section id="mission" className="relative py-24 md:py-36">
      <div className="container-tight grid gap-6 md:grid-cols-2">
        <Reveal direction="right">
          <div className="premium-panel relative h-full overflow-hidden p-8 md:p-10">
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/[0.04] to-transparent" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
              <Target className="h-7 w-7" />
            </div>
            <h3 className="relative mt-6 font-display text-2xl font-bold text-foreground">
              {t("mission.title")}
            </h3>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              {t("mission.p1")}
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              {t("mission.p2")}
            </p>
          </div>
        </Reveal>

        <Reveal direction="left" delay={0.1}>
          <div className="premium-panel relative h-full overflow-hidden p-8 text-white md:p-10">
            {/* Richer brand fill marks this as the accent panel — same glass family. */}
            <div className="absolute inset-0 -z-10 bg-gradient-to-br from-brand-800/60 via-brand-900/40 to-transparent" />
            <div className="absolute inset-0 bg-grid-brand [background-size:30px_30px] opacity-[0.1]" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-brand-200 ring-1 ring-white/20">
              <Eye className="h-7 w-7" />
            </div>
            <h3 className="relative mt-6 font-display text-2xl font-bold text-foreground">
              {t("vision.title")}
            </h3>
            <p className="mt-4 leading-relaxed text-white/70">{t("vision.p1")}</p>
            <p className="mt-4 leading-relaxed text-white/70">{t("vision.p2")}</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
