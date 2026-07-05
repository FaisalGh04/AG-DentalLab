"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

function StaticFallback() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="relative flex items-center justify-center">
        <div className="h-44 w-44 animate-pulse rounded-full bg-brand-500/25 blur-2xl" />
        <div className="absolute h-40 w-32 rounded-[45%_45%_38%_38%/48%_48%_52%_52%] border border-brand-300/25 bg-gradient-to-b from-[#f8f6ef]/25 via-[#dceae1]/12 to-transparent backdrop-blur-sm" />
      </div>
    </div>
  );
}

// The three.js scene is heavy and browser-only — code-split it and never SSR.
const ToothScene = dynamic(
  () => import("./tooth-scene").then((m) => m.ToothScene),
  { ssr: false, loading: () => null },
);

/**
 * Client boundary that mounts the 3D tooth. Disables interaction/animation for
 * users who prefer reduced motion (the scene then renders a single still frame).
 */
export function ToothHero({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const [isReady, setIsReady] = React.useState(false);
  const [supportsWebgl, setSupportsWebgl] = React.useState(true);

  React.useEffect(() => {
    const canvas = document.createElement("canvas");
    const gl2 = canvas.getContext("webgl2");
    const gl1 = canvas.getContext("webgl");
    setSupportsWebgl(!!gl2 || !!gl1);
  }, []);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      // Keep fallback visible if scene stalls or model fails.
      if (!isReady) setIsReady(false);
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [isReady]);

  return (
    <div className={cn("relative h-full w-full", className)}>
      {supportsWebgl && <ToothScene animate={!reduce} onReady={() => setIsReady(true)} />}
      {!isReady && <StaticFallback />}
    </div>
  );
}
