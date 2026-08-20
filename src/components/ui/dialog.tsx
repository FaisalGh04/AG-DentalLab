"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-ink/36 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(
  (
    {
      className,
      children,
      onPointerDownOutside,
      onInteractOutside,
      onEscapeKeyDown,
      ...props
    },
    ref,
  ) => {
    const pathname = usePathname();
    const protectAdminDialog = pathname.startsWith("/admin");

    return (
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            "fixed left-1/2 top-[50dvh] z-50 grid max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto overscroll-contain rounded-[1.5rem] border border-white/70 bg-background/96 p-4 shadow-glow shadow-inner-glow duration-300 [scrollbar-gutter:stable] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100%-2rem)] sm:p-6 xl:max-h-[90dvh]",
            className,
          )}
          onPointerDownOutside={(event) => {
            onPointerDownOutside?.(event);
            if (protectAdminDialog) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            onInteractOutside?.(event);
            if (protectAdminDialog) event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            onEscapeKeyDown?.(event);
            if (protectAdminDialog) event.preventDefault();
          }}
          {...props}
        >
          {children}
          {/* Close control. On mobile it's a clearly visible 44x44 chip (solid
              backdrop + border so it reads over any content, incl. the dark video
              lightbox) since hover never fires on touch. From `sm:` up it collapses
              back to the subtle desktop X. z-10 keeps it above dialog content like
              the lightbox video + its native controls. */}
          <DialogPrimitive.Close className="absolute end-3 top-3 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/40 bg-background/80 text-foreground opacity-95 backdrop-blur transition-all hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 sm:end-4 sm:top-4 sm:h-8 sm:w-8 sm:border-transparent sm:bg-transparent sm:opacity-70 sm:backdrop-blur-none sm:hover:bg-brand-50 sm:hover:text-brand-800 sm:hover:opacity-100">
            <X className="h-5 w-5 sm:h-4 sm:w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPortal>
    );
  }
);
DialogContent.displayName = DialogPrimitive.Content.displayName;

/**
 * Reserves the close button's corner for the WHOLE header, title and
 * description alike.
 *
 * The button is absolutely positioned and, on mobile, 44px tall (h-11 top-3) —
 * tall enough to reach past the title and into the first line of the
 * description. Padding the title alone therefore cannot clear it, which is what
 * put "…and when." underneath the X on a 390px phone. Sized to match the
 * button: 44px + gutter below sm, 32px + gutter from sm up.
 */
const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col space-y-1.5 pe-12 sm:pe-9", className)}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
      className,
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-xl font-semibold tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
