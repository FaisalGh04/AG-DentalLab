"use client";

import Link from "next/link";
import { Phone, MapPin, Instagram, Search } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/constants";

const CARDS = [
  {
    icon: Phone,
    label: "Phone",
    value: SITE.phone,
    href: SITE.phoneHref,
  },
  {
    icon: MapPin,
    label: "Location",
    value: SITE.location,
    href: "https://maps.google.com/?q=Al-Rabiah,Amman,Jordan",
  },
  {
    icon: Instagram,
    label: "Instagram",
    value: `@${SITE.instagram}`,
    href: SITE.instagramHref,
  },
];

export function Contact() {
  return (
    <section id="contact" className="relative py-24 md:py-32">
      <div className="container-tight">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-ink px-8 py-16 text-center shadow-glow md:px-16">
            <div className="pointer-events-none absolute inset-0 bg-grid-brand [background-size:28px_28px] opacity-20" />
            <div className="absolute -left-16 top-0 h-64 w-64 rounded-full bg-brand-500/30 blur-3xl" />
            <div className="absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-secondary/20 blur-3xl" />

            <div className="relative">
              <span className="section-eyebrow border-white/20 bg-white/10 text-brand-200">
                Get In Touch
              </span>
              <h2 className="mt-5 font-display text-4xl font-bold tracking-tight text-white md:text-5xl">
                Let&apos;s craft perfect smiles together
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-white/60">
                Partner with a lab that treats your cases like its own. Reach out
                or track an existing case in seconds.
              </p>

              <div className="mt-12 grid gap-4 md:grid-cols-3">
                {CARDS.map((c) => {
                  const Icon = c.icon;
                  return (
                    <a
                      key={c.label}
                      href={c.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group rounded-2xl border border-white/10 bg-white/5 p-6 text-left backdrop-blur transition-colors hover:bg-white/10"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow">
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-brand-300">
                        {c.label}
                      </p>
                      <p className="mt-1 font-medium text-white">{c.value}</p>
                    </a>
                  );
                })}
              </div>

              <div className="mt-10">
                <Button asChild size="lg" variant="gradient">
                  <Link href="/track">
                    <Search className="h-5 w-5" /> Track Your Case
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
