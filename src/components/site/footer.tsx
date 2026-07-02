import Link from "next/link";
import { Phone, MapPin, Instagram } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { SITE } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container-tight py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo className="h-10" withWordmark />
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              {SITE.tagline}. A digital dental laboratory delivering precise,
              reliable, and innovative solutions since 1994.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground">Explore</h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li><Link href="/#about" className="hover:text-brand-700">About</Link></li>
              <li><Link href="/#services" className="hover:text-brand-700">Services</Link></li>
              <li><Link href="/#work" className="hover:text-brand-700">Our Work</Link></li>
              <li><Link href="/track" className="hover:text-brand-700">Track a Case</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground">Contact</h4>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>
                <a href={SITE.phoneHref} className="flex items-center gap-2 hover:text-brand-700">
                  <Phone className="h-4 w-4" /> {SITE.phone}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4" /> {SITE.location}
              </li>
              <li>
                <a href={SITE.instagramHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-brand-700">
                  <Instagram className="h-4 w-4" /> @{SITE.instagram}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} {SITE.name}. All rights reserved.</p>
          <p>Founded by {SITE.founder} • Established 1994</p>
        </div>
      </div>
    </footer>
  );
}
