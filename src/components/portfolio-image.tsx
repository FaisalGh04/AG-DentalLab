"use client";

import { useEffect, useState } from "react";
import Image, { type ImageProps } from "next/image";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

type PortfolioImageProps = Omit<ImageProps, "onError"> & {
  fallbackClassName?: string;
};

/** Shared portfolio renderer with a visible, logged missing-image fallback. */
export function PortfolioImage({ src, alt, fallbackClassName, ...props }: PortfolioImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  if (failed) {
    return (
      <div className={cn("absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground", fallbackClassName)}>
        <ImageOff className="h-6 w-6" aria-hidden="true" />
        {alt && <span className="sr-only">{alt}</span>}
      </div>
    );
  }

  return (
    <Image
      {...props}
      src={src}
      alt={alt}
      onError={() => {
        console.error("[portfolio] Image failed to load:", src);
        setFailed(true);
      }}
    />
  );
}
