"use client";

import {
  useEffect,
  useState,
  type ImgHTMLAttributes,
} from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

type PortfolioImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src" | "alt" | "onError"
> & {
  src: string;
  alt: string;
  /** Match next/image's former fill layout without invoking its optimizer. */
  fill?: boolean;
  fallbackClassName?: string;
};

/** Native portfolio image with a visible, logged missing-image fallback. */
export function PortfolioImage({
  src,
  alt,
  fill = false,
  className,
  fallbackClassName,
  loading = "lazy",
  decoding = "async",
  ...props
}: PortfolioImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [src]);

  if (failed) {
    return (
      <div
        className={cn(
          fill
            ? "absolute inset-0 flex h-full w-full items-center justify-center"
            : "flex min-h-64 w-full items-center justify-center",
          "bg-muted text-muted-foreground",
          fallbackClassName,
        )}
      >
        <ImageOff className="h-6 w-6" aria-hidden="true" />
        {alt && <span className="sr-only">{alt}</span>}
      </div>
    );
  }

  return (
    // Portfolio assets intentionally bypass next/image: production must request
    // their real /images/gallery or /api/portfolio/images URL directly.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      src={src}
      alt={alt}
      loading={loading}
      decoding={decoding}
      className={cn(fill && "absolute inset-0 h-full w-full", className)}
      onError={() => {
        console.error("[portfolio] Image failed to load:", src);
        setFailed(true);
      }}
    />
  );
}
