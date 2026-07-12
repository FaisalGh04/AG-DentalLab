"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/**
 * Expanded hero-video lightbox — the unmuted, full-controls view. Split into
 * its own module so the Radix Dialog code is code-split out of the landing
 * bundle and only fetched when a visitor actually expands the video
 * (dynamically imported by HeroVideo). Mounts already-open; closing calls
 * onClose so the parent can unmount it.
 */
export function HeroVideoLightbox({
  src,
  poster,
  title,
  onClose,
}: {
  src: string;
  poster: string;
  title: string;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-auto max-w-[95vw] border-brand-400/20 bg-ink/95 p-2 sm:p-3">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <video
          className="mx-auto h-[78vh] max-h-[78vh] w-auto rounded-[1rem]"
          src={src}
          poster={poster}
          controls
          autoPlay
          playsInline
        />
      </DialogContent>
    </Dialog>
  );
}
