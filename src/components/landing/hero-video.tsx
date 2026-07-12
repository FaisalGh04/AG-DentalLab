"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Volume2, VolumeX, Maximize2 } from "lucide-react";
import { useI18n } from "@/components/i18n/language-provider";

// Code-split the expanded lightbox (Radix Dialog) out of the initial landing
// bundle — it's only needed once a visitor taps "expand".
const HeroVideoLightbox = dynamic(
  () =>
    import("@/components/landing/hero-video-lightbox").then(
      (m) => m.HeroVideoLightbox,
    ),
  { ssr: false },
);

// Original web-optimized portrait clip (H.264 + AAC, 9:16, ~8 MB). ASCII
// filename so Vercel's Linux build serves it without URL-encoding surprises.
// Poster is a first-frame JPG for instant paint. The portrait (9:16) frame is
// filled with object-cover + a top-biased object-position (keeps the face in
// view) below.
const VIDEO_SRC = "/videos/main-video.mp4";
const POSTER_SRC = "/videos/hero-poster.jpg";

const CONTROL_CLASS =
  "inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-ink/45 text-white/90 backdrop-blur transition hover:bg-ink/65 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";

/**
 * Background intro video for the hero panel: muted autoplay loop (iOS-safe via
 * playsInline), a dark gradient overlay so foreground text keeps strong
 * contrast, plus two controls — mute/unmute the live audio, and expand into an
 * unmuted lightbox. Sits behind the hero content (its layer is pointer-safe;
 * only the controls are interactive).
 */
export function HeroVideo() {
  const { t } = useI18n();
  const bgRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const toggleMute = () => {
    const v = bgRef.current;
    if (!v) return;
    const next = !muted;
    v.muted = next;
    setMuted(next);
    // Unmuting after a muted autoplay may need an explicit play() to satisfy
    // the browser's gesture requirement for audible playback.
    if (!next) void v.play().catch(() => {});
  };

  return (
    <>
      {/* Video + contrast overlay (decorative, non-interactive). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        {/* Fills the whole panel (no narrow letterboxed strip). The portrait
            (9:16) clip is cropped L/R by object-cover, but object-position pulls
            the crop toward the top of the frame so the subject's face stays in
            view rather than centering on the torso/hands. */}
        <video
          ref={bgRef}
          className="absolute inset-0 h-full w-full object-cover object-[center_35%]"
          src={VIDEO_SRC}
          poster={POSTER_SRC}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
        {/* Darken toward top/bottom for legible text over any frame. */}
        <div className="absolute inset-0 bg-gradient-to-b from-brand-950/85 via-brand-950/55 to-brand-950/90" />
        <div className="absolute inset-0 bg-ink/25" />
      </div>

      {/* Controls — bottom end corner (mirrors L/R via the dir attribute). */}
      <div className="absolute bottom-4 end-4 z-20 flex gap-2">
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? t("hero.unmuteAudio") : t("hero.muteAudio")}
          aria-pressed={!muted}
          className={CONTROL_CLASS}
        >
          {muted ? (
            <VolumeX className="h-5 w-5" />
          ) : (
            <Volume2 className="h-5 w-5" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-label={t("hero.expandVideo")}
          className={CONTROL_CLASS}
        >
          <Maximize2 className="h-5 w-5" />
        </button>
      </div>

      {/* Expanded lightbox — full controls, audio on by default. Dynamically
          imported, so it (and Radix Dialog) only loads when actually opened. */}
      {expanded && (
        <HeroVideoLightbox
          src={VIDEO_SRC}
          poster={POSTER_SRC}
          title={t("hero.videoTitle")}
          onClose={() => setExpanded(false)}
        />
      )}
    </>
  );
}
