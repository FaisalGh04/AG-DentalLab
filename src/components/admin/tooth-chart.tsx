"use client";

import * as React from "react";
import {
  LOWER_TEETH,
  TOOTH_HEIGHT,
  TOOTH_WIDTH,
  UPPER_TEETH,
  toothKind,
  type ToothKind,
} from "@/lib/teeth";
import { cn } from "@/lib/utils";

/**
 * THE tooth chart. Controlled, presentational, and reusable — it renders a
 * selection and reports clicks; it owns no state and knows nothing about
 * dialogs, forms or the API.
 *
 * SVG, not WebGL. The depth here is shading (a gloss gradient + a soft drop
 * shadow) over flat theme-aware fills, which gives the moulded look without a
 * 3D runtime: no GPU dependency, no loading state, it prints, it scales to any
 * width, and every tooth stays a real focusable element for keyboard and
 * screen-reader users. A Three.js jaw would be heavier and strictly worse on
 * all five counts.
 */

const VIEW_W = 660;
// Taller than the arches strictly need: the extra top and bottom bands are what
// the UPPER JAW / LOWER JAW labels sit in, each one touching its own arch.
const VIEW_H = 448;
const PAD_X = 34;
const MID_Y = VIEW_H / 2;
/** Vertical clearance between the two arches, where the numbers sit. */
const ARCH_GAP = 30;
/** How far the back teeth ride above/below the front teeth. */
const ARCH_DEPTH = 104;
/** Nominal crown box; per-tooth multipliers in TOOTH_WIDTH/HEIGHT scale it. */
const BASE_W = 34;
const BASE_H = 42;
/** Tilt of the outermost teeth, in degrees — teeth fan out along the arch. */
const MAX_TILT = 24;

interface Placed {
  tooth: number;
  x: number;
  y: number;
  rotation: number;
  w: number;
  h: number;
  kind: ToothKind;
  upper: boolean;
}

/**
 * Lay one arch out as a horseshoe: a parabola in `t`, so the central incisors
 * sit closest to the occlusal midline and the third molars ride furthest back.
 */
function placeArch(teeth: readonly number[], upper: boolean): Placed[] {
  const span = VIEW_W - PAD_X * 2;
  // Space by CUMULATIVE crown width, not by index. Even spacing collides the
  // wide molars at the ends of the arch while leaving gaps between the narrow
  // incisors — the teeth have to sit shoulder to shoulder to read as one jaw.
  const widths = teeth.map((n) => TOOTH_WIDTH[toothKind(n)]);
  const totalWidth = widths.reduce((sum, w) => sum + w, 0);
  let consumed = 0;
  return teeth.map((tooth, i) => {
    // Centre of this crown as a fraction of the arch, so gaps stay uniform.
    const t = (consumed + widths[i]! / 2) / totalWidth;
    consumed += widths[i]!;
    const offset = 2 * t - 1; // -1 at the left end, 0 at centre, +1 at the right
    const depth = ARCH_DEPTH * offset * offset;
    const kind = toothKind(tooth);
    return {
      tooth,
      x: PAD_X + t * span,
      y: upper ? MID_Y - ARCH_GAP - depth : MID_Y + ARCH_GAP + depth,
      // Mirrored between arches so both fan outward from the midline rather
      // than both leaning the same way.
      rotation: (upper ? 1 : -1) * MAX_TILT * offset,
      w: BASE_W * TOOTH_WIDTH[kind],
      h: BASE_H * TOOTH_HEIGHT[kind],
      kind,
      upper,
    };
  });
}

/** Occlusal (biting) edge: cusps for the back teeth, a blade for the front. */
function cuspEdge(halfW: number, y: number, kind: ToothKind): string {
  const x0 = -halfW * 0.92;
  const x1 = halfW * 0.92;
  if (kind === "canine") {
    // Single pointed cusp — the canine's defining feature.
    return ` L 0 ${(y + 13).toFixed(2)} L ${x1.toFixed(2)} ${y.toFixed(2)}`;
  }
  const cusps = kind === "molar" ? 4 : kind === "premolar" ? 2 : 1;
  const depth = kind === "incisor" ? 4 : 7;
  const seg = (x1 - x0) / cusps;
  let d = "";
  for (let i = 0; i < cusps; i += 1) {
    const sx = x0 + seg * i;
    const ex = x0 + seg * (i + 1);
    d += ` Q ${((sx + ex) / 2).toFixed(2)} ${(y + depth).toFixed(2)} ${ex.toFixed(2)} ${y.toFixed(2)}`;
  }
  return d;
}

/**
 * Crown outline in LOCAL coordinates, centred on the origin with the biting
 * edge at +y. The lower arch reuses it flipped, so one shape serves both.
 */
function toothPath(kind: ToothKind, w: number, h: number): string {
  const hw = w / 2;
  const hh = h / 2;
  const rootW = hw * (kind === "molar" ? 0.74 : 0.62);
  const edgeY = hh * 0.62;
  return [
    `M ${(-rootW).toFixed(2)} ${(-hh).toFixed(2)}`,
    // Left flank, bulging out to the widest point below the neck.
    `C ${(-hw).toFixed(2)} ${(-hh * 0.2).toFixed(2)} ${(-hw).toFixed(2)} ${(hh * 0.2).toFixed(2)} ${(-hw * 0.92).toFixed(2)} ${edgeY.toFixed(2)}`,
    cuspEdge(hw, edgeY, kind),
    // Right flank, mirrored back up to the root.
    `C ${hw.toFixed(2)} ${(hh * 0.2).toFixed(2)} ${hw.toFixed(2)} ${(-hh * 0.2).toFixed(2)} ${rootW.toFixed(2)} ${(-hh).toFixed(2)}`,
    // Rounded root shoulder.
    `Q 0 ${(-hh * 1.2).toFixed(2)} ${(-rootW).toFixed(2)} ${(-hh).toFixed(2)}`,
    "Z",
  ].join(" ");
}

export function ToothChart({
  selected,
  onToggle,
  disabled,
  toothLabel,
  upperLabel,
  lowerLabel,
  className,
}: {
  selected: readonly number[];
  onToggle: (tooth: number) => void;
  disabled?: boolean;
  /** Localized accessible name, e.g. "Tooth 6". */
  toothLabel: (tooth: number) => string;
  /** Localized "Upper Jaw" / "Lower Jaw", drawn beside their own arch. */
  upperLabel: string;
  lowerLabel: string;
  className?: string;
}) {
  const selectedSet = React.useMemo(() => new Set(selected), [selected]);
  const placed = React.useMemo(
    () => [...placeArch(UPPER_TEETH, true), ...placeArch(LOWER_TEETH, false)],
    [],
  );

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className={cn("h-auto w-full touch-manipulation select-none", className)}
      role="group"
      aria-label="Tooth chart"
    >
      <defs>
        {/* Gloss pass laid OVER the themed fill rather than replacing it, so the
            moulded look survives both palettes instead of baking in one. */}
        <linearGradient id="tooth-shine" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.14" />
        </linearGradient>
        <filter id="tooth-shadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow
            dx="0"
            dy="1.2"
            stdDeviation="1.6"
            floodColor="#0b211c"
            floodOpacity="0.28"
          />
        </filter>
      </defs>

      {/* Each jaw gets its own tinted panel. Two separated fields read as upper
          and lower instantly; a single dashed rule between two rows of shapes
          left it to the viewer to work out which half was which. */}
      <rect
        x="2"
        y="2"
        width={VIEW_W - 4}
        height={MID_Y - 10}
        rx="18"
        className="fill-brand-50/60 dark:fill-brand-400/[0.06]"
      />
      <rect
        x="2"
        y={MID_Y + 8}
        width={VIEW_W - 4}
        height={VIEW_H - MID_Y - 10}
        rx="18"
        className="fill-brand-50/60 dark:fill-brand-400/[0.06]"
      />

      {/* Occlusal midline, sitting in the gap between the two panels. */}
      <line
        x1={PAD_X - 12}
        y1={MID_Y}
        x2={VIEW_W - PAD_X + 12}
        y2={MID_Y}
        className="stroke-brand-300/70 dark:stroke-brand-400/25"
        strokeWidth="1.5"
        strokeDasharray="5 7"
      />

      {/* Jaw labels, centred in their own panel and touching their own arch.
          Inside the SVG rather than above it so the label can never drift away
          from the geometry it names, whatever width the chart is scaled to. */}
      {(
        [
          { text: upperLabel, range: "1-16", y: 32 },
          { text: lowerLabel, range: "17-32", y: VIEW_H - 38 },
        ] as const
      ).map((band) => (
        <g key={band.range} pointerEvents="none">
          <text
            x={VIEW_W / 2}
            y={band.y}
            textAnchor="middle"
            fontSize="17"
            fontWeight="700"
            letterSpacing="1.4"
            className="fill-brand-800 dark:fill-brand-50"
          >
            {band.text.toUpperCase()}
          </text>
          {/* Number range as a quiet second line — the legend, without a
              separate legend block to clutter the panel. */}
          <text
            x={VIEW_W / 2}
            y={band.y + 17}
            textAnchor="middle"
            fontSize="13"
            fontWeight="600"
            // direction, not dir: SVG <text> has no dir attribute in React's
            // types. Without it "1-16" bidi-reorders to "16-1" in Arabic.
            style={{ direction: "ltr" }}
            className="fill-brand-700/70 dark:fill-brand-100/60"
          >
            {band.range}
          </text>
        </g>
      ))}

      {placed.map((p) => {
        const isSelected = selectedSet.has(p.tooth);
        const d = toothPath(p.kind, p.w, p.h);
        // Flip the shared shape for the lower arch so its cusps point up.
        const flip = p.upper ? "" : " scale(1,-1)";
        return (
          <g
            key={p.tooth}
            role="button"
            aria-pressed={isSelected}
            aria-label={toothLabel(p.tooth)}
            aria-disabled={disabled || undefined}
            tabIndex={disabled ? -1 : 0}
            className={cn(
              "group outline-none",
              disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
            )}
            onClick={() => !disabled && onToggle(p.tooth)}
            onKeyDown={(e) => {
              if (disabled) return;
              // Enter and Space are what a real <button> would answer to; an
              // SVG <g> gets neither for free.
              if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
                e.preventDefault();
                onToggle(p.tooth);
              }
            }}
          >
            <g transform={`translate(${p.x} ${p.y}) rotate(${p.rotation})${flip}`}>
              {/* Hit area first and always rectangular: the crown outline alone
                  leaves dead gaps between cusps, and this guarantees a finger
                  target on a tablet regardless of how narrow an incisor is. */}
              <rect
                x={-Math.max(p.w, 26) / 2}
                y={-p.h / 2 - 4}
                width={Math.max(p.w, 26)}
                height={p.h + 8}
                fill="transparent"
              />
              <path
                d={d}
                filter="url(#tooth-shadow)"
                strokeWidth="1.4"
                className={cn(
                  "transition-[fill,stroke] duration-150",
                  isSelected
                    ? "fill-brand-600 stroke-brand-800 dark:fill-brand-500 dark:stroke-brand-200"
                    : "fill-white stroke-brand-300 group-hover:fill-brand-100 dark:fill-brand-950 dark:stroke-brand-400/40 dark:group-hover:fill-brand-900",
                )}
              />
              <path d={d} fill="url(#tooth-shine)" pointerEvents="none" />
              {/* Focus ring. Drawn as geometry rather than a CSS outline, which
                  Safari refuses to render on SVG children. */}
              <path
                d={d}
                fill="none"
                strokeWidth="2.5"
                pointerEvents="none"
                className="stroke-transparent group-focus-visible:stroke-brand-400"
              />
            </g>
            {/* Number stays upright and unrotated — a tilted molar's label is
                still read horizontally. */}
            <text
              x={p.x}
              y={p.y + (p.upper ? -1 : 1)}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="11.5"
              fontWeight="700"
              pointerEvents="none"
              className={cn(
                "transition-colors",
                isSelected
                  ? "fill-white dark:fill-brand-950"
                  : "fill-brand-700 dark:fill-brand-100/70",
              )}
            >
              {p.tooth}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
