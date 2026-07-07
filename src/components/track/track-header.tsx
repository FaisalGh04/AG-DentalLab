"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/components/i18n/language-provider";

/** Translated header for the /track page (back link + title + intro). Client
 *  component so it can read the active locale via useI18n. */
export function TrackHeader() {
  const { t } = useI18n();

  return (
    <>
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-brand-100/70 transition-colors hover:text-cream"
      >
        <ArrowLeft className="h-4 w-4" /> {t("track.backHome")}
      </Link>

      <div className="mx-auto mt-8 max-w-2xl text-center">
        <span className="section-eyebrow">{t("track.eyebrow")}</span>
        <h1 className="mt-5 font-display text-4xl font-bold tracking-tight text-cream md:text-5xl">
          {t("track.title")}
        </h1>
        <p className="mt-4 text-brand-50/70">{t("track.subtitle")}</p>
      </div>
    </>
  );
}
