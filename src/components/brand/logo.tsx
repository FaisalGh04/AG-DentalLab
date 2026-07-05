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
        src="/ag-dental-lab-logo.png"
        alt="AG Dental Lab"
        width={1477}
        height={885}
        priority
        className="h-full w-auto object-contain"
        sizes="(max-width: 768px) 160px, 220px"
      />
    </span>
  );
}
