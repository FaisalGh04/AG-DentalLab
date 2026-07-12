import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  withWordmark = false,
}: {
  className?: string;
  withWordmark?: boolean;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex h-12 w-40 shrink-0 items-center",
        withWordmark && "w-44",
        className,
      )}
    >
      <Image
        src="/ag-dental-lab-logo.svg"
        alt="AG Dental Lab"
        width={1567}
        height={974}
        priority
        unoptimized
        className="h-full w-auto object-contain"
      />
    </span>
  );
}
