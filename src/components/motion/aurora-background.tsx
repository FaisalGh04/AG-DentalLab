import { cn } from "@/lib/utils";

/**
 * Living ambient backdrop: slow-drifting blurred orbs (brand + a whisper of
 * gold), a fine dot grid, and film grain. Purely decorative and pointer-safe.
 * Kept server-renderable — animation is CSS-only.
 */
export function AuroraBackground({
  className,
  withGrid = true,
}: {
  className?: string;
  withGrid?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 -z-10 overflow-hidden",
        className,
      )}
    >
      <div className="brand-orb -left-24 top-[-6rem] h-[34rem] w-[34rem] animate-aurora-1 bg-brand-300/40" />
      <div className="brand-orb right-[-8rem] top-[10%] h-[30rem] w-[30rem] animate-aurora-2 bg-brand-500/25" />
      <div className="brand-orb bottom-[-10rem] left-[35%] h-[28rem] w-[28rem] animate-aurora-1 bg-gold-300/[0.14] [animation-delay:-8s]" />
      {withGrid && (
        <div className="absolute inset-0 bg-grid-brand [background-size:34px_34px] opacity-[0.22]" />
      )}
      <div className="grain absolute inset-0" />
    </div>
  );
}
