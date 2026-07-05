"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Search } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Magnetic } from "@/components/motion/magnetic";
import { ScrollProgress } from "@/components/motion/scroll-progress";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/#about", id: "about", label: "About" },
  { href: "/#services", id: "services", label: "Services" },
  { href: "/#work", id: "work", label: "Our Work" },
  { href: "/#why", id: "why", label: "Why Us" },
  { href: "/#contact", id: "contact", label: "Contact" },
];

/** Tracks which landing section is currently in view for the active indicator. */
function useActiveSection(enabled: boolean) {
  const [active, setActive] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!enabled) return;
    const sections = NAV_LINKS.map((l) => document.getElementById(l.id)).filter(
      (el): el is HTMLElement => Boolean(el),
    );
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [enabled]);

  return active;
}

export function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const active = useActiveSection(isHome);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <ScrollProgress />
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-all duration-300",
          scrolled ? "py-2" : "py-4",
        )}
      >
        <div className="container-tight">
          <nav
            className={cn(
              "flex items-center justify-between rounded-2xl px-4 py-2.5 transition-all duration-300",
              scrolled
                ? "glass shadow-card"
                : "border border-white/[0.06] bg-[hsl(158_30%_9%/0.35)] backdrop-blur-md",
            )}
          >
            <Link href="/" className="flex items-center gap-2" aria-label="Home">
              <Logo
                className="h-11 w-40 brightness-0 invert drop-shadow-[0_0_14px_rgba(123,183,157,0.25)]"
                withWordmark
              />
            </Link>

            <div className="hidden items-center gap-1 md:flex">
              {NAV_LINKS.map((l) => {
                const isActive = isHome && active === l.id;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={cn(
                      "relative rounded-xl px-3.5 py-2 text-sm font-medium transition-colors duration-200",
                      isActive
                        ? "text-foreground"
                        : "text-foreground/60 hover:text-foreground",
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="nav-active-pill"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        className="absolute inset-0 -z-10 rounded-xl border border-brand-400/20 bg-brand-500/15"
                      />
                    )}
                    {l.label}
                  </Link>
                );
              })}
            </div>

            <div className="hidden items-center gap-2 md:flex">
              <Button asChild variant="ghost" size="sm">
                <Link href="/track">
                  <Search className="h-4 w-4" /> Track Case
                </Link>
              </Button>
              <Magnetic strength={0.3}>
                <Button asChild variant="gradient" size="sm">
                  <Link href="/#contact">Contact Us</Link>
                </Button>
              </Magnetic>
            </div>

            <button
              className="rounded-xl p-2 text-foreground transition-colors hover:bg-white/10 md:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </nav>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="glass mt-2 flex flex-col gap-1 rounded-2xl p-3 md:hidden"
              >
                {NAV_LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-muted"
                  >
                    {l.label}
                  </Link>
                ))}
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href="/track" onClick={() => setOpen(false)}>
                      Track Case
                    </Link>
                  </Button>
                  <Button asChild variant="gradient" size="sm">
                    <Link href="/#contact" onClick={() => setOpen(false)}>
                      Contact
                    </Link>
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>
    </>
  );
}
