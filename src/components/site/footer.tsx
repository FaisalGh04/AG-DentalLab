"use client";

import Link from "next/link";
import { Phone, MapPin, Instagram } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { useI18n } from "@/components/i18n/language-provider";
import { SITE } from "@/lib/constants";

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="relative isolate px-5 pb-8 pt-6 sm:px-6 lg:px-8">
      {/* Vivid brand light painted directly BEHIND the glass panel so its
          backdrop-filter blur has bright, varied color to visibly soften —
          this is what makes it read as real glass (same trick as the login
          card's orbs), regardless of what page renders the footer. */}
      <div className="pointer-events-none absolute inset-0 -z-10 mx-auto max-w-7xl overflow-hidden rounded-[1.75rem]">
        <div className="absolute left-[10%] top-1/2 h-[240px] w-[420px] -translate-y-1/2 rounded-full bg-brand-500/35 blur-[90px]" />
        <div className="absolute left-1/2 top-[26%] h-[210px] w-[340px] -translate-x-1/2 rounded-full bg-brand-300/25 blur-[80px]" />
        <div className="absolute right-[8%] top-[64%] h-[240px] w-[380px] rounded-full bg-brand-700/38 blur-[100px]" />
      </div>

      <div className="footer-glass mx-auto w-full max-w-7xl px-6 py-14 sm:px-10 lg:px-12">
        {/* z-[3] keeps content above the ::before border and ::after highlight. */}
        <div className="relative z-[3]">
          <div className="grid gap-10 md:grid-cols-4">
            <div className="md:col-span-2">
              <Logo
                className="h-14 w-52 dark:brightness-0 dark:invert dark:drop-shadow-[0_0_14px_rgba(123,183,157,0.22)]"
                withWordmark
              />
              <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
                {t("footer.tagline")}
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-foreground">
                {t("footer.explore")}
              </h4>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/#about" className="transition-colors hover:text-brand-700 dark:hover:text-brand-300">
                    {t("nav.about")}
                  </Link>
                </li>
                <li>
                  <Link href="/#services" className="transition-colors hover:text-brand-700 dark:hover:text-brand-300">
                    {t("nav.services")}
                  </Link>
                </li>
                <li>
                  <Link href="/#work" className="transition-colors hover:text-brand-700 dark:hover:text-brand-300">
                    {t("nav.work")}
                  </Link>
                </li>
                <li>
                  <Link href="/track" className="transition-colors hover:text-brand-700 dark:hover:text-brand-300">
                    {t("footer.trackACase")}
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-foreground">
                {t("footer.contact")}
              </h4>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li>
                  <a
                    href={SITE.phoneHref}
                    className="flex items-center gap-2 transition-colors hover:text-brand-700 dark:hover:text-brand-300"
                  >
                    <Phone className="h-4 w-4" /> {SITE.phone}
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> {t("contact.address")}
                </li>
                <li>
                  <a
                    href={SITE.instagramHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 transition-colors hover:text-brand-700 dark:hover:text-brand-300"
                  >
                    <Instagram className="h-4 w-4" /> @{SITE.instagram}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border/70 pt-6 text-xs text-muted-foreground md:flex-row">
            <p>{t("footer.rights", { year: new Date().getFullYear() })}</p>
            <p>{t("footer.founded", { founder: t("footer.founderName") })}</p>
          </div>

          {/* Required CC-BY legal attribution — kept fully visible/readable, only de-emphasized as discreet fine print (smaller + more muted). Do not remove. */}
          <p className="mt-5 text-center text-[0.58rem] leading-4 text-muted-foreground/45">
            &ldquo;Molar Tooth&rdquo; by Vikrama Raghuraman, licensed under{" "}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 transition-colors hover:text-brand-700 hover:underline dark:hover:text-brand-300"
            >
              CC Attribution
            </a>{" "}
            (Sketchfab).
          </p>
        </div>
      </div>
    </footer>
  );
}
