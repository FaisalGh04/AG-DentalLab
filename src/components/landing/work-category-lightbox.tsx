"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageOff, ArrowLeft, Images } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { WorkZoomView } from "@/components/landing/work-gallery-lightbox";
import { useI18n } from "@/components/i18n/language-provider";
import type { PortfolioItemDTO } from "@/types/portfolio";
import { cn } from "@/lib/utils";

/**
 * Folder viewer — a single Radix Dialog whose content swaps between three views
 * (no nested dialogs, which is what fixes the stacked-modal zoom bug):
 *
 *   grid   → one tile per PortfolioItem (cover + localized title)
 *   detail → the selected item's title/description + ALL its images
 *   zoom   → one full-size photo (WorkZoomView)
 *
 * Back steps one level up (zoom→detail→grid); Escape/✕ closes the whole modal
 * from any view. Split into its own module + dynamically imported so the Radix
 * Dialog stays out of the initial landing bundle. Mounts already-open; closing
 * calls onClose so the parent can unmount it.
 *
 * The caller resolves `title` (the already-translated folder name); per-item
 * title/description resolve here from the active locale. Every item is expected
 * to have at least one image (the loader filters out imageless items).
 */
export function WorkCategoryLightbox({
  items,
  title,
  onClose,
}: {
  items: PortfolioItemDTO[];
  title: string;
  onClose: () => void;
}) {
  const { t, locale, dir } = useI18n();
  const isAr = locale === "ar";
  // null selectedIndex → grid; set + null zoomIndex → detail; both set → zoom.
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);

  const selectedItem = selectedIndex === null ? null : (items[selectedIndex] ?? null);
  const zoomImage =
    selectedItem && zoomIndex !== null ? (selectedItem.images[zoomIndex] ?? null) : null;

  const view = zoomImage ? "zoom" : selectedItem ? "detail" : "grid";

  // Back steps one level up; it never closes the modal (that's Escape/✕).
  const goBack = () => {
    if (zoomIndex !== null) setZoomIndex(null);
    else setSelectedIndex(null);
  };

  const label = (item: PortfolioItemDTO) => (isAr ? item.titleAr : item.titleEn);
  const desc = (item: PortfolioItemDTO) =>
    isAr ? item.descriptionAr : item.descriptionEn;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl border-brand-400/20 bg-background/96 p-4 sm:p-6">
        {/* Back control (detail + zoom only). Sits at the top-start; the ✕ close
            is at the top-end, so they never collide. Arrow flips in RTL. */}
        {view !== "grid" && (
          <button
            type="button"
            onClick={goBack}
            className="inline-flex w-fit items-center gap-1.5 rounded-full border border-brand-400/20 bg-brand-950/40 px-3 py-1.5 text-sm font-medium text-brand-50/90 transition-colors hover:bg-brand-900/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/70"
          >
            <ArrowLeft className={cn("h-4 w-4", dir === "rtl" && "rotate-180")} />
            {t("work.back")}
          </button>
        )}

        {/* ---------- GRID ---------- */}
        {view === "grid" && (
          <>
            <div className="text-start">
              <DialogTitle className="pe-8 font-display text-lg font-bold text-white sm:text-xl">
                {title}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-white/70">
                {items.length > 0
                  ? t("work.gallery.subtitle")
                  : t("work.gallery.empty")}
              </DialogDescription>
            </div>

            {items.length === 0 ? (
              // Empty folder — no cases yet. The "no cases" message sits in the
              // description above; here we just show a faint icon.
              <div className="flex flex-col items-center justify-center py-10">
                <ImageOff className="h-10 w-10 text-brand-200/40" />
              </div>
            ) : (
              /* Auto-placement follows the <html> dir attribute, so RTL mirrors
                 the flow with no special-casing. One tile per item (cover). */
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {items.map((item, i) => {
                  const cover = item.images[0];
                  if (!cover) return null; // defensive: loader filters imageless
                  const photoCount = item.images.length;
                  return (
                    <figure
                      key={item.id}
                      className="group relative overflow-hidden rounded-[1rem] border border-brand-400/20"
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedIndex(i)}
                        aria-label={t("work.openCase")}
                        className="block aspect-[4/3] w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      >
                        <Image
                          src={cover.url}
                          alt={label(item)}
                          fill
                          sizes="(min-width: 640px) 30vw, 45vw"
                          unoptimized={cover.url.startsWith("/api/")}
                          className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-brand-950/85 via-brand-950/10 to-transparent opacity-75 transition-opacity duration-300 group-hover:opacity-90" />
                        {/* Multi-photo indicator — only for items with >1 image,
                            so users know there's more inside before clicking.
                            Mirrors the folder-card count pill; top-end, so it
                            mirrors sides in RTL via `end`. */}
                        {photoCount > 1 && (
                          <div className="absolute end-2 top-2 inline-flex items-center gap-1 rounded-full border border-white/20 bg-brand-950/55 px-2 py-0.5 text-[0.7rem] font-medium text-brand-50/90 backdrop-blur">
                            <Images className="h-3 w-3" />
                            <span>{photoCount}</span>
                          </div>
                        )}
                        <figcaption className="absolute inset-x-0 bottom-0 p-2.5 text-start text-xs font-semibold text-brand-50/95">
                          {label(item)}
                        </figcaption>
                      </button>
                    </figure>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ---------- DETAIL (all images of the selected item) ---------- */}
        {view === "detail" && selectedItem && (
          <>
            <div className="text-start">
              <DialogTitle className="pe-8 font-display text-lg font-bold text-white sm:text-xl">
                {label(selectedItem)}
              </DialogTitle>
              <DialogDescription className="mt-2 text-sm leading-relaxed text-white/80">
                {desc(selectedItem)}
              </DialogDescription>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {selectedItem.images.map((img, j) => (
                <figure
                  key={img.id}
                  className="group relative overflow-hidden rounded-[1rem] border border-brand-400/20"
                >
                  <button
                    type="button"
                    onClick={() => setZoomIndex(j)}
                    aria-label={t("work.openImage")}
                    className="block aspect-[4/3] w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <Image
                      src={img.url}
                      alt={label(selectedItem)}
                      fill
                      sizes="(min-width: 640px) 30vw, 45vw"
                      unoptimized={img.url.startsWith("/api/")}
                      className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-950/70 via-transparent to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-80" />
                  </button>
                </figure>
              ))}
            </div>
          </>
        )}

        {/* ---------- ZOOM (single photo) ---------- */}
        {view === "zoom" && selectedItem && zoomImage && (
          <WorkZoomView
            src={zoomImage.url}
            width={zoomImage.width}
            height={zoomImage.height}
            title={label(selectedItem)}
            description={desc(selectedItem)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
