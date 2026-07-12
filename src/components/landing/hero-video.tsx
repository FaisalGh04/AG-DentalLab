"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Volume2, VolumeX, Maximize2, Play } from "lucide-react";
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

// Desktop source: original web-optimized portrait clip (H.264 + AAC, 9:16,
// ~8 MB). Mobile source: a 480x854 / ~1.5 MB variant used on phones and
// constrained connections so cellular visitors never auto-download 8 MB.
// ASCII filenames so a Linux build serves them without URL-encoding surprises.
// Poster is a first-frame JPG for instant paint; the portrait (9:16) frame is
// filled with object-cover + a top-biased object-position (keeps the face in
// view) below.
const DESKTOP_SRC = "/videos/main-video.mp4";
const MOBILE_SRC = "/videos/main-video-mobile.mp4";
const POSTER_SRC = "/videos/hero-poster.jpg";

const CONTROL_CLASS =
  "inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-ink/45 text-white/90 backdrop-blur transition hover:bg-ink/65 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";

type Decision = "pending" | "auto" | "manual";

/**
 * Decide, on the client, whether to autoplay and which source file to use.
 *
 * - Autoplay fires for both desktop and mobile — only two things suppress it:
 *   `prefers-reduced-motion` (an accessibility preference) and a genuinely
 *   constrained connection (`saveData`, or effectiveType 2g/slow-2g, where
 *   auto-downloading video would burn a metered data plan). Both fall back to
 *   poster + explicit tap-to-play. 3g/4g/wifi autoplay normally.
 * - File choice is about weight, not autoplay: the light 1.5 MB mobile clip is
 *   used on small screens and on any sub-4g / data-saver connection; the 8 MB
 *   desktop clip only on a wide screen with a good link.
 */
function decidePlayback(): { autoplay: boolean; src: string } {
  if (typeof window === "undefined") return { autoplay: false, src: MOBILE_SRC };
  const wide = window.matchMedia("(min-width: 768px)").matches;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const conn = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  const saveData = !!conn?.saveData;
  const et = conn?.effectiveType;
  const veryConstrained = saveData || et === "2g" || et === "slow-2g";

  return {
    autoplay: !reduced && !veryConstrained,
    src: !wide || veryConstrained || et === "3g" ? MOBILE_SRC : DESKTOP_SRC,
  };
}

/**
 * Background intro video for the hero panel. It autoplays muted and looping
 * (iOS-safe via playsInline) on both desktop and mobile — desktop pulls the
 * full 8 MB clip, phones and sub-4g/data-saver connections pull the compressed
 * 1.5 MB variant instead, so cellular visitors get motion without an 8 MB
 * download. Autoplay is suppressed only under prefers-reduced-motion or a
 * genuinely constrained link (saveData / 2g / slow-2g), which fall back to the
 * poster + a tap-to-play control. A dark gradient overlay keeps foreground text
 * legible; mute/unmute + expand-to-lightbox controls appear once playing.
 */
export function HeroVideo() {
  const { t } = useI18n();
  const bgRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [expanded, setExpanded] = useState(false);
  // Resolved on the client after mount so SSR/first render stay deterministic
  // (and the page stays statically generatable).
  const [decision, setDecision] = useState<Decision>("pending");
  const [started, setStarted] = useState(false);
  const [playbackSrc, setPlaybackSrc] = useState(DESKTOP_SRC);

  useEffect(() => {
    const { autoplay, src } = decidePlayback();
    setPlaybackSrc(src);
    const v = bgRef.current;
    if (autoplay && v) {
      setDecision("auto");
      v.src = src;
      void v
        .play()
        .then(() => setStarted(true))
        // Eligible but blocked (e.g. battery saver) → offer tap-to-play.
        .catch(() => setDecision("manual"));
    } else {
      setDecision("manual");
    }
  }, []);

  const startManual = () => {
    const v = bgRef.current;
    if (!v) return;
    v.src = playbackSrc;
    v.muted = true;
    setMuted(true);
    void v
      .play()
      .then(() => setStarted(true))
      .catch(() => {});
  };

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
            view rather than centering on the torso/hands. The src is set from an
            effect (device-dependent); preload="none" so nothing downloads until
            we decide to play. */}
        <video
          ref={bgRef}
          className="absolute inset-0 h-full w-full object-cover object-[center_35%]"
          poster={POSTER_SRC}
          muted
          loop
          playsInline
          preload="none"
        />
        {/* Darken toward top/bottom for legible text over any frame. */}
        <div className="absolute inset-0 bg-gradient-to-b from-brand-950/85 via-brand-950/55 to-brand-950/90" />
        <div className="absolute inset-0 bg-ink/25" />
      </div>

      {/* Controls — bottom end corner (mirrors L/R via the dir attribute).
          Before playback starts on a gated device, a single play control is
          shown; once playing, the mute + expand controls take over. */}
      <div className="absolute bottom-4 end-4 z-20 flex gap-2">
        {decision === "manual" && !started && (
          <button
            type="button"
            onClick={startManual}
            aria-label={t("hero.playVideo")}
            className={CONTROL_CLASS}
          >
            <Play className="h-5 w-5" />
          </button>
        )}

        {started && (
          <>
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
          </>
        )}
      </div>

      {/* Expanded lightbox — full controls, audio on by default. Dynamically
          imported, so it (and Radix Dialog) only loads when actually opened.
          Uses whichever source the device is already playing. */}
      {expanded && (
        <HeroVideoLightbox
          src={playbackSrc}
          poster={POSTER_SRC}
          title={t("hero.videoTitle")}
          onClose={() => setExpanded(false)}
        />
      )}
    </>
  );
}
