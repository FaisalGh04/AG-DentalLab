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
 *
 * Lives in components/case, not components/admin, because the PUBLIC tracker
 * renders it too. `variant` is the only difference between the two: the admin
 * panel follows the light/dark theme, while the public site is permanently on a
 * dark green surface and needs its own fixed palette. The geometry — the one
 * thing that must never diverge between them — is shared.
 */

export type ToothChartVariant = "admin" | "public";

/**
 * Palette per surface. Kept as whole class strings rather than assembled from
 * fragments so Tailwind's scanner can see every one of them.
 */
const PALETTE: Record<
  ToothChartVariant,
  { panel: string; midline: string; label: string; range: string; selected: string; idle: string; selectedText: string; idleText: string }
> = {
  admin: {
    panel: "fill-brand-50/60 dark:fill-brand-400/[0.06]",
    midline: "stroke-brand-300/70 dark:stroke-brand-400/25",
    label: "fill-brand-800 dark:fill-brand-50",
    range: "fill-brand-700/70 dark:fill-brand-100/60",
    selected: "fill-brand-600 stroke-brand-800 dark:fill-brand-500 dark:stroke-brand-200",
    idle: "fill-white stroke-brand-300 dark:fill-brand-950 dark:stroke-brand-400/40",
    selectedText: "fill-white dark:fill-brand-950",
    idleText: "fill-brand-700 dark:fill-brand-100/70",
  },
  // The public tracker is dark green in BOTH themes, so these are fixed. Idle
  // teeth are deliberately low-contrast: on this surface the green selected
  // teeth are the message, and 26 muted ones must not compete with them.
  public: {
    panel: "fill-brand-400/[0.07]",
    midline: "stroke-brand-400/30",
    // brand-50, not cream: `cream` is only a CSS variable in globals.css and
    // not a Tailwind theme colour, so `fill-cream` never compiles and the text
    // silently falls back to black on this dark panel.
    label: "fill-brand-50",
    range: "fill-brand-100/60",
    selected: "fill-brand-400 stroke-brand-200",
    idle: "fill-brand-900/70 stroke-brand-400/25",
    selectedText: "fill-brand-950",
    idleText: "fill-brand-100/45",
  },
};

const VIEW_W = 356;
const VIEW_H = 336;
const CX = VIEW_W / 2;
const MID_Y = VIEW_H / 2;

/**
 * ARCH SHAPE — ONE OVAL, NOT TWO HORSESHOES.
 *
 * Both jaws share a single ellipse centred on (CX, MID_Y). The upper arch takes
 * its TOP half and the lower arch its BOTTOM half, so the thirty-two crowns
 * close into one continuous ring: front teeth at the very top and bottom,
 * molars running round to meet at the left and right.
 *
 * This is the correction from the previous layout, where each jaw had its own
 * centre placed OUTSIDE the arch. That put both sets of front teeth in the
 * middle of the chart and both sets of molars at the outside, so the upper jaw
 * curved down like a U and the lower curved up — two horseshoes facing each
 * other across a gutter, rather than one oval. Sharing the centre inverts both:
 * the upper now bulges up, the lower down.
 *
 * ARCH_SWEEP must stay BELOW 90°. At exactly 90° the two halves would meet at
 * the sides and tooth 1 would land on top of tooth 32; the shortfall is what
 * opens the gap at each side that the R and L markers sit in. The gap is
 * 2 * RY * cos(ARCH_SWEEP), so lowering the sweep widens it.
 *
 * ARCH_RATIO is RY/RX — just under 1 for an oval a little wider than tall,
 * which keeps the chart from getting taller than the dialog can show.
 *
 * RX is NOT a constant — it is solved from the teeth (see ARCH below), so each
 * half is always exactly long enough to seat its sixteen crowns shoulder to
 * shoulder. Change the tooth sizes and the oval resizes itself.
 */
const ARCH_RATIO = 0.9;
const ARCH_SWEEP = 74;

/**
 * Nominal crown box. Much smaller than the old 34x42: at this size sixteen
 * teeth fit a compact arch, which lets the whole viewBox shrink from 660 wide
 * to 430 — so every tooth actually renders LARGER on a phone than it used to,
 * despite being smaller in chart units.
 */
const BASE_W = 25;
const BASE_H = 29;
/**
 * How much of the per-kind size variation in TOOTH_WIDTH/HEIGHT to keep.
 * 0 = every tooth identical, 1 = full anatomical variation. Damped to 0.45 for
 * the "neat and clinical" read: a molar is still visibly the widest tooth, but
 * the row no longer lurches between a 28px molar and a 21px incisor.
 * Applied HERE, not in src/lib/teeth.ts — those ratios are shared anatomy data
 * and stay the single source of truth.
 */
const UNIFORMITY = 0.45;
/**
 * Slot width as a fraction of the crown width. Slightly under 1 so neighbouring
 * crowns just touch: teeth sit on the OUTSIDE of the curve, where the arc their
 * outer edge follows is longer than the arc through their centres, so slots
 * sized exactly to the crown leave a visible gap between every pair.
 */
const PACKING = 0.94;
/** Clear arc length held open between the central incisors, in px. */
const MIDLINE_GAP = 15;
/** A little slack at each end so the third molars are not flush with the tips. */
const ARCH_END_PAD = 4;
/**
 * The dental midline is drawn as FOUR segments, not two.
 *
 * The front teeth now sit at the top and bottom of the ring, so the line has to
 * start out there — level with the incisal edges of 8|9 and 24|25 — to actually
 * run between them, which is the whole point of it. Between there and the
 * occlusal gutter it would cross the jaw label, so each half is broken around
 * its label: tip -> above the label, then below the label -> the gutter.
 *
 * All four are drawn from the end nearest the label outward, so the dash phase
 * is mirror-symmetric about both axes.
 */
/** Outer end, level with the incisal edges of the central incisors. */
const MIDLINE_TIP = 16;
/** Clear of the jaw label block (label baseline 66, range descender ~83). */
const MIDLINE_LABEL_TOP = 50;
const MIDLINE_LABEL_BOTTOM = 90;
/** Where it stops short of the occlusal line, leaving the gutter clear. */
const MIDLINE_GUTTER = 8;

/** Damped crown box for one kind, in px. */
function crownSize(kind: ToothKind): { w: number; h: number } {
  return {
    w: BASE_W * (1 + (TOOTH_WIDTH[kind] - 1) * UNIFORMITY),
    h: BASE_H * (1 + (TOOTH_HEIGHT[kind] - 1) * UNIFORMITY),
  };
}

const DEG = Math.PI / 180;

/**
 * The arch curve, as an arc-length lookup.
 *
 * Teeth must be spaced by ARC LENGTH, not by angle. On a flattened ellipse an
 * equal angular step covers ~RX of arc at the front and only ~RY at the sides,
 * so equal angles would leave gaps between the incisors while overlapping the
 * molars — the exact failure the old straight-line layout avoided by spacing on
 * cumulative crown width. This keeps that rule and bends it round the ellipse.
 */
interface ArchCurve {
  rx: number;
  ry: number;
  /** Cumulative arc length at each sample. */
  cum: number[];
  /** Sample angle in degrees, parallel to `cum`. */
  ang: number[];
  length: number;
}

const CURVE_SAMPLES = 720;

/** Sample the arc for a given RX and return its cumulative-length table. */
function sampleArch(rx: number): ArchCurve {
  const ry = rx * ARCH_RATIO;
  const cum: number[] = [0];
  const ang: number[] = [-ARCH_SWEEP];
  let prevX = rx * Math.sin(-ARCH_SWEEP * DEG);
  let prevY = ry * Math.cos(-ARCH_SWEEP * DEG);
  let total = 0;
  for (let i = 1; i <= CURVE_SAMPLES; i += 1) {
    const a = -ARCH_SWEEP + (2 * ARCH_SWEEP * i) / CURVE_SAMPLES;
    const x = rx * Math.sin(a * DEG);
    const y = ry * Math.cos(a * DEG);
    total += Math.hypot(x - prevX, y - prevY);
    cum.push(total);
    ang.push(a);
    prevX = x;
    prevY = y;
  }
  return { rx, ry, cum, ang, length: total };
}

/** Angle (degrees) at a given arc length along the curve. */
function angleAt(curve: ArchCurve, s: number): number {
  const { cum, ang } = curve;
  let lo = 0;
  let hi = cum.length - 1;
  const target = Math.min(Math.max(s, 0), curve.length);
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid]! <= target) lo = mid;
    else hi = mid;
  }
  const span = cum[hi]! - cum[lo]!;
  const t = span > 0 ? (target - cum[lo]!) / span : 0;
  return ang[lo]! + (ang[hi]! - ang[lo]!) * t;
}

/**
 * ONE arch, solved once at module load.
 *
 * The sixteen crown widths plus the midline gap and the end padding give the
 * arc length the arch has to provide; arc length scales linearly with RX at a
 * fixed ratio, so RX falls straight out of a unit-radius sample. The result is
 * an oval sized by its teeth rather than by a hand-tuned magic number.
 */
const ARCH = (() => {
  const widths = UPPER_TEETH.map((n) => crownSize(toothKind(n)).w * PACKING);
  const needed =
    widths.reduce((sum, w) => sum + w, 0) + MIDLINE_GAP + ARCH_END_PAD * 2;
  const unit = sampleArch(1).length;
  return sampleArch(needed / unit);
})();

/**
 * Horizontal half-extent of the ring, measured to the CENTRES of the side
 * molars. Also where the R and L markers sit.
 */
const ARCH_HALF_W = ARCH.rx * Math.sin(ARCH_SWEEP * DEG);

interface Placed {
  tooth: number;
  x: number;
  y: number;
  rotation: number;
  kind: ToothKind;
  upper: boolean;
  /** Hit-area box; widened so a narrow incisor stays tappable on a tablet. */
  hitW: number;
  hitH: number;
  /** Crown outline, built ONCE with the layout rather than on every render. */
  d: string;
}

/**
 * Seat one arch's sixteen teeth around the ellipse.
 *
 * Each crown gets a slot of its own width along the arc, with the midline gap
 * inserted at the halfway index — 8|9 above, 24|25 below. Both halves of an
 * arch carry identical crown widths, so budgeting the gap this way keeps its
 * centre exactly on CX and the arch symmetric about it.
 *
 * Every tooth is rotated so its crown points radially OUTWARD from the shared
 * centre — the ring radiates like petals, incisors facing straight up (upper)
 * or straight down (lower) and molars facing the cheeks. One rule for all
 * thirty-two, replacing the old linear tilt fan.
 */
function placeArch(teeth: readonly number[], upper: boolean): Placed[] {
  const sizes = teeth.map((n) => crownSize(toothKind(n)));
  const midIndex = Math.floor(teeth.length / 2);
  // ONE centre for both jaws — see the ARCH SHAPE note above. `upper` only
  // decides which half of the ellipse the teeth are mirrored onto.
  const sign = upper ? -1 : 1;

  let consumed = ARCH_END_PAD;
  return teeth.map((tooth, i) => {
    if (i === midIndex) consumed += MIDLINE_GAP;
    const { w, h } = sizes[i]!;
    // The SLOT is PACKING x the crown, so the crowns overlap a little and read
    // as one continuous arch rather than a row of separate shapes.
    const slot = w * PACKING;
    const centreS = consumed + slot / 2;
    consumed += slot;

    const a = angleAt(ARCH, centreS);
    const sin = Math.sin(a * DEG);
    const cos = Math.cos(a * DEG);
    const kind = toothKind(tooth);

    // Outward radial direction. atan2 of the ellipse RADIUS VECTOR, not of `a`
    // itself — on a non-circular ellipse the two differ, and using `a` would
    // point the side teeth off at the wrong angle.
    const radial = Math.atan2(ARCH.rx * sin, ARCH.ry * cos) / DEG;

    // Neighbour spacing along the arc, so hit boxes TILE instead of leaving
    // dead gaps between crowns. On a phone the crowns are ~19px across; without
    // this a tap landing between two of them would do nothing at all.
    const pitch = (ARCH.length - MIDLINE_GAP - ARCH_END_PAD * 2) / teeth.length;

    return {
      tooth,
      x: CX + ARCH.rx * sin,
      // Top half for the upper jaw, bottom half for the lower.
      y: MID_Y + sign * ARCH.ry * cos,
      // The UPPER crown path is the flipped one now (see `flip` in the render):
      // pointing a crown outward from a shared centre means the upper jaw's
      // teeth point UP, which is the mirror of what they did when each jaw had
      // its own centre below/above it. The rotation sign flips with the path.
      // Checked at both ends: at the midline the front teeth point straight
      // away from the centre, and the side molars of both jaws point outward.
      rotation: sign * -radial,
      kind,
      upper,
      hitW: Math.max(pitch, w + 6),
      hitH: h + 12,
      d: toothPath(kind, w, h),
    };
  });
}

/** Occlusal (biting) edge: cusps for the back teeth, a blade for the front. */
function cuspEdge(halfW: number, y: number, kind: ToothKind): string {
  const x0 = -halfW * 0.92;
  const x1 = halfW * 0.92;
  if (kind === "canine") {
    // Single pointed cusp — the canine's defining feature. Proportional to the
    // crown rather than a fixed 13px: at the new size that constant was almost
    // the whole tooth and the canines came out as spikes.
    return ` L 0 ${(y + halfW * 0.9).toFixed(2)} L ${x1.toFixed(2)} ${y.toFixed(2)}`;
  }
  const cusps = kind === "molar" ? 4 : kind === "premolar" ? 2 : 1;
  const depth = halfW * (kind === "incisor" ? 0.28 : 0.48);
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
  variant = "admin",
  idleInteractive = true,
  className,
}: {
  selected: readonly number[];
  onToggle: (tooth: number) => void;
  disabled?: boolean;
  /** Localized accessible name, e.g. "Tooth 6, 3 treatments". */
  toothLabel: (tooth: number) => string;
  /** Localized "Upper Jaw" / "Lower Jaw", drawn beside their own arch. */
  upperLabel: string;
  lowerLabel: string;
  /** Which surface this is drawn on. See PALETTE. */
  variant?: ToothChartVariant;
  /**
   * Whether UNSELECTED teeth respond to input. The admin picker needs them to
   * (that is how a tooth gets selected); the public tracker does not — there is
   * nothing behind a tooth the lab did not plan, so it must not invite a tap
   * that does nothing.
   */
  idleInteractive?: boolean;
  className?: string;
}) {
  const selectedSet = React.useMemo(() => new Set(selected), [selected]);
  const palette = PALETTE[variant];
  // Geometry and crown paths are viewport-independent, so they are built once
  // per mount and survive every selection change.
  const placed = React.useMemo(
    () => [...placeArch(UPPER_TEETH, true), ...placeArch(LOWER_TEETH, false)],
    [],
  );

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className={cn(
        // max-w: this arch is nearly as tall as it is wide, so stretching it to
        // the full width of a max-w-3xl dialog would make it ~750px tall and
        // push Confirm/Cancel off screen. Capped and centred instead — a 448px
        // arch is comfortably readable, and callers can still override.
        "mx-auto h-auto w-full max-w-[28rem] touch-manipulation select-none",
        className,
      )}
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
            dy="0.8"
            stdDeviation="1"
            floodColor="#0b211c"
            floodOpacity="0.26"
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
        rx="14"
        className={palette.panel}
      />
      <rect
        x="2"
        y={MID_Y + 8}
        width={VIEW_W - 4}
        height={VIEW_H - MID_Y - 10}
        rx="14"
        className={palette.panel}
      />

      {/* Occlusal line, in the gutter between the panels. Stops short of the
          R and L markers rather than running under them, so the three read as
          one axis with its two ends labelled. */}
      <line
        x1={CX - ARCH_HALF_W + 26}
        y1={MID_Y}
        x2={CX + ARCH_HALF_W - 26}
        y2={MID_Y}
        className={palette.midline}
        strokeWidth="1.5"
        strokeDasharray="5 7"
      />

      {/* Dental midline, running through the gap between the central incisors
          — 8|9 at the top of the ring, 24|25 at the bottom. Four segments, see
          MIDLINE_TIP. Drawn before the teeth so a crown always wins the
          overlap, and never interactive. */}
      {(
        [
          { id: "upper-tip", from: MIDLINE_LABEL_TOP, to: MIDLINE_TIP },
          { id: "upper-inner", from: MID_Y - MIDLINE_GUTTER, to: MIDLINE_LABEL_BOTTOM },
          {
            id: "lower-inner",
            from: MID_Y + MIDLINE_GUTTER,
            to: VIEW_H - MIDLINE_LABEL_BOTTOM,
          },
          {
            id: "lower-tip",
            from: VIEW_H - MIDLINE_LABEL_TOP,
            to: VIEW_H - MIDLINE_TIP,
          },
        ] as const
      ).map((seg) => (
        <line
          key={seg.id}
          x1={CX}
          y1={seg.from}
          x2={CX}
          y2={seg.to}
          className={palette.midline}
          strokeWidth="1.5"
          strokeDasharray="5 7"
          pointerEvents="none"
        />
      ))}

      {/* PATIENT'S RIGHT and LEFT, in the gap where the two arches stop short
          of meeting. R goes on the VIEWER'S LEFT: a dental chart is drawn as if
          facing the patient, so their right is our left — and that is already
          how this chart is numbered, with the upper-right quadrant (1-8) and
          the lower-right (25-32) both drawn on the left. The markers are a
          reading aid, not content: the per-tooth aria-labels already carry the
          number, so a screen reader announcing a bare "R L" would only add
          noise. Hence aria-hidden. */}
      {(
        [
          { side: "R", x: CX - ARCH_HALF_W },
          { side: "L", x: CX + ARCH_HALF_W },
        ] as const
      ).map((m) => (
        <text
          key={m.side}
          x={m.x}
          y={MID_Y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="13"
          fontWeight="700"
          letterSpacing="0.5"
          pointerEvents="none"
          aria-hidden="true"
          className={palette.range}
        >
          {m.side}
        </text>
      ))}

      {/* Jaw labels, inside the ring. The middle of the oval is dead space,
          and filling it costs no height — a band above and below the chart
          would have added ~76px, which is the difference between fitting the
          dialog and scrolling it. It is also where a printed chart puts them.
          Still inside the SVG, so a label can never drift away from the
          geometry it names. */}
      {(
        [
          { text: upperLabel, range: "1-16", y: 66 },
          { text: lowerLabel, range: "17-32", y: VIEW_H - 79 },
        ] as const
      ).map((band) => (
        <g key={band.range} pointerEvents="none">
          <text
            x={VIEW_W / 2}
            y={band.y}
            textAnchor="middle"
            fontSize="12.5"
            fontWeight="700"
            letterSpacing="1.1"
            className={palette.label}
          >
            {band.text.toUpperCase()}
          </text>
          {/* Number range as a quiet second line — the legend, without a
              separate legend block to clutter the panel. */}
          <text
            x={VIEW_W / 2}
            y={band.y + 13}
            textAnchor="middle"
            fontSize="10.5"
            fontWeight="600"
            // direction, not dir: SVG <text> has no dir attribute in React's
            // types. Without it "1-16" bidi-reorders to "16-1" in Arabic.
            style={{ direction: "ltr" }}
            className={palette.range}
          >
            {band.range}
          </text>
        </g>
      ))}

      {placed.map((p) => {
        const isSelected = selectedSet.has(p.tooth);
        // Inert when the whole chart is disabled, or — on the public tracker —
        // when this tooth carries no treatment to show.
        const inert = disabled || (!idleInteractive && !isSelected);
        // The shared crown path is drawn with its biting edge at +y (down).
        // Radiating outward from ONE centre means the UPPER jaw's crowns point
        // up, so the upper arch is now the flipped one — the reverse of the
        // two-horseshoe layout this replaced.
        const flip = p.upper ? " scale(1,-1)" : "";
        return (
          <g
            key={p.tooth}
            role="button"
            aria-pressed={isSelected}
            aria-label={toothLabel(p.tooth)}
            aria-disabled={inert || undefined}
            tabIndex={inert ? -1 : 0}
            className={cn(
              "group outline-none",
              inert
                ? disabled
                  ? "cursor-not-allowed opacity-60"
                  : "cursor-default"
                : "cursor-pointer",
            )}
            onClick={() => !inert && onToggle(p.tooth)}
            onKeyDown={(e) => {
              if (inert) return;
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
                x={-p.hitW / 2}
                y={-p.hitH / 2}
                width={p.hitW}
                height={p.hitH}
                fill="transparent"
              />
              <path
                d={p.d}
                filter="url(#tooth-shadow)"
                strokeWidth="1"
                className={cn(
                  "transition-[fill,stroke] duration-150",
                  isSelected ? palette.selected : palette.idle,
                  // Hover feedback only where a click does something.
                  !inert && !isSelected && "group-hover:brightness-110",
                )}
              />
              <path d={p.d} fill="url(#tooth-shine)" pointerEvents="none" />
              {/* Focus ring. Drawn as geometry rather than a CSS outline, which
                  Safari refuses to render on SVG children. */}
              <path
                d={p.d}
                fill="none"
                strokeWidth="2"
                pointerEvents="none"
                className="stroke-transparent group-focus-visible:stroke-brand-400"
              />
            </g>
            {/* Number stays upright and unrotated — a tilted molar's label is
                still read horizontally. */}
            <text
              x={p.x}
              // Nudged toward the crown's bulk, which sits on the root side —
              // and the root side swapped when the flip did.
              y={p.y + (p.upper ? 1 : -1)}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="9.5"
              fontWeight="700"
              pointerEvents="none"
              className={cn(
                "transition-colors",
                isSelected ? palette.selectedText : palette.idleText,
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
