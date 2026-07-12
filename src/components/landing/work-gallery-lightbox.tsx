"use client";

import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

/**
 * Case-photo lightbox for the work gallery. Split into its own module so the
 * Radix Dialog code is code-split out of the landing bundle and only fetched
 * when a visitor opens a case (dynamically imported by WorkGallery). Mounts
 * already-open; closing calls onClose so the parent can unmount it.
 */
export function WorkGalleryLightbox({
  src,
  width,
  height,
  title,
  description,
  onClose,
}: {
  src: string;
  width: number;
  height: number;
  title: string;
  description: string;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl border-brand-400/20 bg-background/96 p-3 sm:p-4">
        <div className="flex flex-col gap-4">
          <Image
            src={src}
            alt={title}
            width={width}
            height={height}
            sizes="(min-width: 1024px) 720px, 92vw"
            className="h-auto max-h-[70vh] w-full rounded-[1rem] object-contain"
          />
          {/* pe-8 keeps the title clear of the top-end close (X) button in
              both LTR and RTL; bright text for readability on dark theme. */}
          <div className="text-start">
            <DialogTitle className="pe-8 font-display text-lg font-bold text-white sm:text-xl">
              {title}
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-relaxed text-white/85">
              {description}
            </DialogDescription>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
