import { cn } from "@/lib/utils";

/**
 * AG Dental Lab mark — an abstract tooth + "AG" monogram rendered in the
 * brand gradient. Pure SVG so it stays crisp and lazy-loads instantly.
 */
export function Logo({
  className,
  withWordmark = false,
}: {
  className?: string;
  withWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <svg
        viewBox="0 0 64 64"
        className="h-full w-auto"
        role="img"
        aria-label="AG Dental Lab logo"
      >
        <defs>
          <linearGradient id="agGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0D9488" />
            <stop offset="50%" stopColor="#14B8A6" />
            <stop offset="100%" stopColor="#2DD4BF" />
          </linearGradient>
        </defs>
        {/* tooth silhouette */}
        <path
          d="M32 6c-7 0-11 3-16 3S8 6 8 16c0 12 4 20 7 30 2 7 4 12 8 12 4 0 4-9 9-9s5 9 9 9c4 0 6-5 8-12 3-10 7-18 7-30 0-10-3-7-8-7s-9-3-16-3Z"
          fill="url(#agGrad)"
          opacity="0.14"
        />
        <path
          d="M32 6c-7 0-11 3-16 3S8 6 8 16c0 12 4 20 7 30 2 7 4 12 8 12 4 0 4-9 9-9s5 9 9 9c4 0 6-5 8-12 3-10 7-18 7-30 0-10-3-7-8-7s-9-3-16-3Z"
          fill="none"
          stroke="url(#agGrad)"
          strokeWidth="2.5"
        />
        <text
          x="32"
          y="40"
          textAnchor="middle"
          fontSize="22"
          fontWeight="800"
          fill="url(#agGrad)"
          fontFamily="var(--font-geist), sans-serif"
        >
          AG
        </text>
      </svg>
      {withWordmark && (
        <span className="font-display text-lg font-bold tracking-tight text-ink">
          AG Dental Lab
        </span>
      )}
    </span>
  );
}
