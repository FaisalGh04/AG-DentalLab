"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TrackingIdCopy({
  trackingId,
  className,
}: {
  trackingId: string;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);

  async function copyTrackingId() {
    try {
      await navigator.clipboard.writeText(trackingId);
      setCopied(true);
      toast.success("Tracking ID copied");
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      toast.error("Could not copy tracking ID");
    }
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-brand-100 bg-white/80 px-2.5 py-1 font-mono text-xs font-semibold tracking-wide text-brand-800 shadow-inner-glow",
        className,
      )}
    >
      {trackingId}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6 rounded-full text-brand-700 hover:bg-brand-50"
        aria-label={`Copy tracking ID ${trackingId}`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void copyTrackingId();
        }}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </span>
  );
}
