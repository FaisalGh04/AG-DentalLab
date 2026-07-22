"use client";

import Image from "next/image";
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";

/**
 * View C — the full-size single-photo view. Presentational only: it renders the
 * image + the item's title/description as the body of the shared category
 * Dialog (no Dialog wrapper of its own). De-nesting the zoom out of a second
 * Radix modal dialog is what removes the stacked-dialog fragility; navigation
 * (back / close) is owned by the parent WorkCategoryLightbox.
 *
 * Provides the Dialog's accessible title/description while this view is active.
 */
export function WorkZoomView({
  src,
  width,
  height,
  title,
  description,
}: {
  src: string;
  width: number;
  height: number;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Image
        src={src}
        alt={title}
        width={width}
        height={height}
        sizes="(min-width: 1024px) 720px, 92vw"
        // Uploaded images serve via the /api proxy (302 → signed URL); the
        // optimizer can't follow the redirect, so let the browser fetch
        // directly. Seed /public paths stay optimized.
        unoptimized={src.startsWith("/api/")}
        className="h-auto max-h-[65vh] w-full rounded-[1rem] object-contain"
      />
      <div className="text-start">
        <DialogTitle className="font-display text-lg font-bold text-white sm:text-xl">
          {title}
        </DialogTitle>
        <DialogDescription className="mt-2 text-sm leading-relaxed text-white/85">
          {description}
        </DialogDescription>
      </div>
    </div>
  );
}
