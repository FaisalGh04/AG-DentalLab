"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { motion } from "framer-motion";
import { Images } from "lucide-react";
import { Reveal, staggerContainer, staggerItem } from "@/components/motion/reveal";
import { TextReveal } from "@/components/motion/text-reveal";
import { useI18n } from "@/components/i18n/language-provider";
import type { PortfolioFolderView } from "@/types/portfolio";
import { cn } from "@/lib/utils";

// Code-split the category grid (Radix Dialog) out of the initial landing
// bundle — it's only needed once a visitor opens a folder. It hosts the zoom
// lightbox internally.
const WorkCategoryLightbox = dynamic(
  () =>
    import("@/components/landing/work-category-lightbox").then(
      (m) => m.WorkCategoryLightbox,
    ),
  { ssr: false },
);

export function WorkGallery({ folders }: { folders: PortfolioFolderView[] }) {
  const { t, locale } = useI18n();
  const isAr = locale === "ar";
  const [openFolder, setOpenFolder] = useState<string | null>(null);

  const folderName = (f: PortfolioFolderView) => (isAr ? f.labelAr : f.labelEn);

  const activeFolder =
    openFolder === null
      ? null
      : (folders.find((f) => f.id === openFolder) ?? null);

  // Public landing shows only folders that have real content. A folder becomes
  // visible automatically once an admin adds an item with at least one photo;
  // zero-item (and photo-less) folders are hidden here. This is landing-only —
  // admin Manage Folders / case-groups pages read folders directly and still
  // see every folder.
  const visibleFolders = folders.filter((f) =>
    f.items.some((item) => item.images.length > 0),
  );

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

        {/* Folder cards. 3 cols on desktop, 2 on mobile. Auto-placement follows
            the <html> dir attribute, so RTL mirrors the flow with no
            special-casing. Only folders with a photographed item render (see
            visibleFolders) — empty ones are hidden, not placeholdered. */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className="mt-16 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5"
        >
          {visibleFolders.map((folder, i) => {
            const name = folderName(folder);
            const count = folder.items.length;
            // Cover = first image of the first photographed item. visibleFolders
            // guarantees one exists.
            const cover = folder.items.find((it) => it.images.length > 0)!
              .images[0]!;
            const isLast = i === visibleFolders.length - 1;
            return (
              <motion.button
                key={folder.id}
                type="button"
                variants={staggerItem}
                whileHover={{ y: -4 }}
                onClick={() => setOpenFolder(folder.id)}
                aria-label={t("work.openFolder", { name })}
                className={cn(
                  "group relative block overflow-hidden rounded-[1.5rem] border border-brand-400/20 text-start shadow-inner-glow transition-all duration-300 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  // An odd number of folders leaves a lonely half-tile on the
                  // 2-col mobile layout → let the trailing one span both.
                  isLast &&
                    visibleFolders.length % 2 === 1 &&
                    "col-span-2 md:col-span-1",
                )}
              >
                <div className="relative aspect-[4/3] w-full">
                  <Image
                    src={cover.url}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 30vw, 50vw"
                    // Uploaded images serve via the /api proxy route, which
                    // 302s to a signed URL — the Next optimizer can't follow
                    // that, so the browser must fetch it directly. Direct
                    // /public seed paths stay optimized.
                    unoptimized={cover.url.startsWith("/api/")}
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                  {/* Legibility wash — kept strong so the folder name + count
                      stay readable over any cover photo. */}
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-950/90 via-brand-950/35 to-brand-950/10 transition-opacity duration-300 group-hover:from-brand-950/95" />
                  {/* Photo-count pill, top-start (mirrors in RTL via `start`). */}
                  <div className="absolute start-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-brand-950/50 px-2.5 py-1 text-xs font-medium text-brand-50/90 backdrop-blur">
                    <Images className="h-3.5 w-3.5" />
                    <span>
                      {count}{" "}
                      {count === 1
                        ? t("work.folders.case")
                        : t("work.folders.cases")}
                    </span>
                  </div>
                  {/* Folder name. */}
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <h3 className="font-display text-base font-bold text-white sm:text-lg">
                      {name}
                    </h3>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      </div>

      {/* Category grid for the opened folder — dynamically imported so Radix
          Dialog only loads on first interaction. Items come from the DB-driven
          folder; per-item captions resolve to the active locale inside. */}
      {activeFolder && (
        <WorkCategoryLightbox
          items={activeFolder.items}
          title={folderName(activeFolder)}
          onClose={() => setOpenFolder(null)}
        />
      )}
    </section>
  );
}
