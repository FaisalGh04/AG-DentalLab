"use client";

import * as React from "react";
import {
  useInView,
  useMotionValue,
  useSpring,
  motion,
} from "framer-motion";
import { formatNumber } from "@/lib/utils";

/** Animated number that counts up when scrolled into view. */
export function Counter({
  to,
  suffix = "",
  prefix = "",
  duration = 1.8,
  className,
  locale = "en",
}: {
  to: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
  /** Arabic renders the tally in Arabic-Indic digits. */
  locale?: string;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, {
    duration: duration * 1000,
    bounce: 0,
  });
  const [display, setDisplay] = React.useState(0);

  React.useEffect(() => {
    if (inView) motionValue.set(to);
  }, [inView, to, motionValue]);

  React.useEffect(() => {
    const unsub = spring.on("change", (v) => setDisplay(Math.round(v)));
    return () => unsub();
  }, [spring]);

  return (
    <motion.span ref={ref} className={className}>
      {prefix}
      {formatNumber(display, locale)}
      {suffix}
    </motion.span>
  );
}
