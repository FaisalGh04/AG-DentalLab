"use client";

import { PortfolioImage } from "@/components/portfolio-image";
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
      <PortfolioImage
        src={src}
        alt={title}
        width={width}
        height={height}
        // Render the exact portfolio URL without Next's image optimizer.
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
