import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 active:translate-y-px active:scale-[0.99]",
  {
    variants: {
      variant: {
        default:
          "bg-brand-700 text-white shadow-soft hover:-translate-y-0.5 hover:bg-brand-800 hover:shadow-glow",
        gradient:
          "bg-brand-gradient text-white shadow-glow hover:-translate-y-0.5 hover:brightness-110",
        secondary:
          "bg-brand-50 text-brand-800 ring-1 ring-brand-200/80 hover:-translate-y-0.5 hover:bg-brand-100",
        outline:
          "border border-brand-200/80 bg-white/[0.72] text-ink shadow-inner-glow hover:-translate-y-0.5 hover:border-brand-300 hover:bg-white hover:shadow-soft",
        ghost: "text-foreground/72 hover:bg-brand-50 hover:text-brand-800",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        link: "text-brand-700 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 rounded-xl px-4 text-xs",
        lg: "h-12 rounded-[1.1rem] px-7 text-base",
        icon: "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
