"use client";

import Link from "next/link";
import { Phone, MapPin, Instagram, Search, ArrowRight } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { TextReveal } from "@/components/motion/text-reveal";
import { Magnetic } from "@/components/motion/magnetic";
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
    <section id="contact" className="relative py-24 md:py-36">
      <div className="container-tight">
        <Reveal>
          <div className="relative overflow-hidden rounded-[1.75rem] border border-brand-400/25 bg-brand-950 px-5 py-12 text-center shadow-glow sm:px-8 md:px-16 md:py-20">
            <div className="pointer-events-none absolute inset-0 bg-grid-brand [background-size:28px_28px] opacity-[0.14]" />
            <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_50%_0%,rgba(123,183,157,0.24),transparent_60%)]" />

            <div className="relative">
              <span className="section-eyebrow border-gold-300/30 bg-white/10 text-gold-200">
                Get In Touch
              </span>
              <h2 className="mt-5 font-display text-4xl font-bold tracking-tight text-white md:text-5xl">
                <TextReveal text="Let's craft perfect smiles together" />
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/[0.68]">
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
                      className="group rounded-[1.15rem] border border-white/10 bg-white/[0.06] p-5 text-left shadow-inner-glow backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-brand-300/40 hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow">
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-brand-300">
                        {c.label}
                      </p>
                      <p className="mt-1 break-words font-medium text-white">{c.value}</p>
                    </a>
                  );
                })}
              </div>

              <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
                <Magnetic strength={0.35}>
                  <Button asChild size="lg" variant="gradient">
                    <Link href="/track">
                      <Search className="h-5 w-5" /> Track Your Case
                    </Link>
                  </Button>
                </Magnetic>
                <Magnetic strength={0.35}>
                  <Button asChild size="lg" variant="outline" className="border-white/20 bg-white/10 text-white hover:bg-white/[0.16]">
                    <a href={SITE.phoneHref}>
                      Call the Lab <ArrowRight className="h-5 w-5" />
                    </a>
                  </Button>
                </Magnetic>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
