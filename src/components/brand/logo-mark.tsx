import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The full official AG Dental Lab logo (vector). Used as the hero centerpiece.
 * SVG is served as-is (unoptimized) so the mark stays perfectly crisp at scale.
 */
export function LogoMark({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/ag-dental-lab-logo.svg"
      alt="AG Dental Lab"
      width={1567}
      height={974}
      priority={priority}
      unoptimized
      className={cn("h-auto w-full object-contain", className)}
    />
  );
}
