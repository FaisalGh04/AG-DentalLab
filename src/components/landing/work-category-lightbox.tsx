"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { WorkGalleryLightbox } from "@/components/landing/work-gallery-lightbox";
import { useI18n } from "@/components/i18n/language-provider";
import { type GalleryImage } from "@/lib/gallery";

interface CaseText {
  title: string;
  description: string;
}

/**
 * Category grid for one folder of portfolio photos. Opened from the Work
 * section's folder cards; shows the passed-in `images` in a grid, and reuses
 * the single-image WorkGalleryLightbox for the zoomed view. Split into its own
 * module + dynamically imported so the Radix Dialog stays out of the initial
 * landing bundle. Mounts already-open; closing calls onClose so the parent can
 * unmount it.
 *
 * The caller resolves both `images` (from the gallery.ts folder mapping) and
 * `title` (the already-translated folder name), so this component stays
 * locale-agnostic — it only pulls per-photo captions from the localized
 * `work.cases` array via each image's caseIndex.
 */
export function WorkCategoryLightbox({
  images,
  title,
  onClose,
}: {
  images: GalleryImage[];
  title: string;
  onClose: () => void;
}) {
  const { t, tList } = useI18n();
  const cases = tList<CaseText>("work.cases");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const zoom = openIndex === null ? null : images[openIndex];
  const zoomCase = zoom ? cases[zoom.caseIndex] : null;

  return (
    <>
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-3xl border-brand-400/20 bg-background/96 p-4 sm:p-6">
          {/* pe-8 keeps the title clear of the top-end close (X) button in both
              LTR and RTL. */}
          <div className="text-start">
            <DialogTitle className="pe-8 font-display text-lg font-bold text-white sm:text-xl">
              {title}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-white/70">
              {images.length > 0
                ? t("work.gallery.subtitle")
                : t("work.gallery.empty")}
            </DialogDescription>
          </div>

          {images.length === 0 ? (
            // Empty folder — no photos uploaded yet. The "no cases" message sits
            // in the description above; here we just show a faint icon.
            <div className="flex flex-col items-center justify-center py-10">
              <ImageOff className="h-10 w-10 text-brand-200/40" />
            </div>
          ) : (
            /* Auto-placement follows the <html> dir attribute, so RTL mirrors the
               flow with no special-casing. */
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {images.map((img, i) => {
                const label = cases[img.caseIndex]?.title ?? "";
                return (
                  <figure
                    key={img.src}
                    className="group relative overflow-hidden rounded-[1rem] border border-brand-400/20"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenIndex(i)}
                      aria-label={t("work.openCase")}
                      className="block aspect-[4/3] w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <Image
                        src={img.src}
                        alt={label}
                        fill
                        sizes="(min-width: 640px) 30vw, 45vw"
                        className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-brand-950/85 via-brand-950/10 to-transparent opacity-75 transition-opacity duration-300 group-hover:opacity-90" />
                      <figcaption className="absolute inset-x-0 bottom-0 p-2.5 text-start text-xs font-semibold text-brand-50/95">
                        {label}
                      </figcaption>
                    </button>
                  </figure>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Zoomed single-image view — the exact lightbox the Work gallery uses.
          Layers above the category dialog (Radix portals both); closing it
          returns to the grid without dismissing the category gallery. */}
      {zoom && zoomCase && (
        <WorkGalleryLightbox
          src={zoom.src}
          width={zoom.w}
          height={zoom.h}
          title={zoomCase.title}
          description={zoomCase.description}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </>
  );
}
