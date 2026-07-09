"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { TextReveal } from "@/components/motion/text-reveal";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n/language-provider";
import { cn } from "@/lib/utils";

// Real portfolio photos, indexed 1:1 with the localized `work.cases` array.
// Intrinsic width/height let next/image reserve the right box and render each
// image at its true aspect in the lightbox (they aren't all 4:3). Static public
// assets → optimized directly by next/image (no DB-backed signed-URL proxy
// needed here, unlike admin case images).
// Display order is a deliberate reorder of the original case identities
// (4,5,8,9,10,6,7,3,1,2). Kept in lockstep with the `work.cases` arrays in
// en.json/ar.json — index i here pairs with cases[i], so both must use the
// same order or images and captions desync.
const GALLERY = [
  { src: "/images/gallery/case-4-full-arch-implant-prosthesis.jpeg", w: 1447, h: 1087 },
  { src: "/images/gallery/case-5-implant-anterior-bridge-gingival-ceramic.jpeg", w: 1280, h: 960 },
  { src: "/images/gallery/case-8-anterior-restoration-bisque-stage.jpeg", w: 1280, h: 960 },
  { src: "/images/gallery/case-9-final-clinical-result.jpeg", w: 1280, h: 960 },
  { src: "/images/gallery/case-10-anterior-veneers-final-result.jpeg", w: 3596, h: 2179 },
  { src: "/images/gallery/case-6-anterior-crowns-veneers-master-model.jpeg", w: 1280, h: 960 },
  { src: "/images/gallery/case-7-full-arch-implant-bridge-side-view.jpeg", w: 1280, h: 960 },
  { src: "/images/gallery/case-3-anterior-zirconia-bridge-detail.jpeg", w: 1600, h: 1200 },
  { src: "/images/gallery/case-1-lower-anterior-zirconia-bridge.jpeg", w: 1600, h: 1200 },
  { src: "/images/gallery/case-2-posterior-pfm-crowns.jpeg", w: 1600, h: 1200 },
];

// Show a clean 3×3 preview; "More" reveals the rest in place. Scales to any
// future case count without ever breaking the grid.
const PREVIEW_COUNT = 9;

interface CaseText {
  title: string;
  description: string;
}

export function WorkGallery() {
  const { t, tList } = useI18n();
  const cases = tList<CaseText>("work.cases");
  const [expanded, setExpanded] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const visibleItems = expanded ? GALLERY : GALLERY.slice(0, PREVIEW_COUNT);
  const hasMore = GALLERY.length > PREVIEW_COUNT;
  const active = openIndex === null ? null : cases[openIndex];
  const activeItem = openIndex === null ? null : GALLERY[openIndex];

  return (
    <section id="work" className="relative py-24 md:py-36">
      {/* Subtle teal wash (fades at edges → no hard section line). */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,transparent,rgba(71,133,109,0.05),transparent)]" />
      <div className="container-tight">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="section-eyebrow">{t("work.eyebrow")}</span>
          <h2 className="mt-5 font-display text-4xl font-bold tracking-tight text-foreground text-balance md:text-5xl">
            <TextReveal text={t("work.title")} />
          </h2>
          <p className="mt-4 text-muted-foreground">{t("work.subtitle")}</p>
        </Reveal>

        {/* 3 cols on desktop, 2 on mobile. Auto-placement follows the <html> dir
            attribute, so RTL mirrors the flow with no special-casing. */}
        <div className="mt-16 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5">
          {visibleItems.map((item, i) => {
            const label = cases[i]?.title ?? "";
            const isLast = i === visibleItems.length - 1;
            return (
              <motion.figure
                key={item.src}
                initial={{ opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: (i % 3) * 0.06, duration: 0.5 }}
                className={cn(
                  "group relative overflow-hidden rounded-[1.5rem] border border-brand-400/20 shadow-inner-glow transition-all duration-300 hover:-translate-y-1 hover:shadow-glow",
                  // An odd number of visible tiles leaves a lonely half-tile on
                  // the 2-col mobile layout → let the trailing one span both.
                  isLast && visibleItems.length % 2 === 1 && "col-span-2 md:col-span-1",
                )}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(i)}
                  aria-label={t("work.openCase")}
                  className="block aspect-[4/3] w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <Image
                    src={item.src}
                    alt={label}
                    fill
                    sizes="(min-width: 768px) 30vw, 50vw"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                  {/* Legibility wash + always-on title. */}
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-950/85 via-brand-950/10 to-transparent opacity-75 transition-opacity duration-300 group-hover:opacity-90" />
                  <figcaption className="absolute inset-x-0 bottom-0 p-3 text-start text-xs font-semibold text-brand-50/95 sm:p-4 sm:text-sm">
                    {label}
                  </figcaption>
                </button>
              </motion.figure>
            );
          })}
        </div>

        {hasMore && (
          <div className="mt-8 flex justify-center md:mt-10">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="border-brand-300/40 bg-brand-900/30 text-foreground hover:border-brand-300/70 hover:bg-brand-800/50 hover:text-white"
            >
              {expanded ? t("work.less") : t("work.more")}
              {expanded ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Shared lightbox — reuses the site Dialog (same component as the hero
          video lightbox). Title/description come from t()/tList so they follow
          the active locale automatically. */}
      <Dialog
        open={openIndex !== null}
        onOpenChange={(o) => !o && setOpenIndex(null)}
      >
        <DialogContent className="max-w-3xl border-brand-400/20 bg-background/96 p-3 sm:p-4">
          {active && activeItem && (
            <div className="flex flex-col gap-4">
              <Image
                src={activeItem.src}
                alt={active.title}
                width={activeItem.w}
                height={activeItem.h}
                sizes="(min-width: 1024px) 720px, 92vw"
                className="h-auto max-h-[70vh] w-full rounded-[1rem] object-contain"
              />
              {/* pe-8 keeps the title clear of the top-end close (X) button in
                  both LTR and RTL; bright text for readability on dark theme. */}
              <div className="text-start">
                <DialogTitle className="pe-8 font-display text-lg font-bold text-white sm:text-xl">
                  {active.title}
                </DialogTitle>
                <DialogDescription className="mt-2 text-sm leading-relaxed text-white/85">
                  {active.description}
                </DialogDescription>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
