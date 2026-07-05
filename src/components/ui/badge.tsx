import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold shadow-inner-glow transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-brand-200/80 bg-brand-50 text-brand-800 dark:border-brand-300/30 dark:bg-brand-400/12 dark:text-brand-100",
        secondary:
          "border-border bg-muted text-muted-foreground dark:border-brand-400/25 dark:bg-brand-950/45 dark:text-brand-100/65",
        outline:
          "border-border text-foreground dark:border-brand-400/25 dark:text-brand-50",
        success:
          "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-300/30 dark:bg-emerald-400/12 dark:text-emerald-100",
        info:
          "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-300/30 dark:bg-sky-400/12 dark:text-sky-100",
        warning:
          "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-300/30 dark:bg-amber-400/12 dark:text-amber-100",
        neutral:
          "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-brand-300/25 dark:bg-brand-950/45 dark:text-brand-50/75",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
