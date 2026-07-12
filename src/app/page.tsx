import type { Metadata } from "next";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { Hero } from "@/components/landing/hero";
import { About } from "@/components/landing/about";
import { Services } from "@/components/landing/services";
import { MissionVision } from "@/components/landing/mission-vision";
import { WorkGallery } from "@/components/landing/work-gallery";
import { WhyUs } from "@/components/landing/why-us";
import { Contact } from "@/components/landing/contact";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Dentist",
  name: SITE.name,
  description: SITE.description,
  foundingDate: "1994",
  founder: { "@type": "Person", name: SITE.founder },
  telephone: SITE.phone,
  address: {
    "@type": "PostalAddress",
    addressLocality: "Amman",
    addressRegion: "Al-Rabiah",
    addressCountry: "JO",
  },
  sameAs: [SITE.instagramHref],
};

export default function HomePage() {
  return (
    <div className="dark landing-dark-shell text-foreground">
      {/* JSON-LD is a static, non-executable data block; no nonce needed. The
          landing page is statically generated, so it can't read a per-request
          nonce anyway — the public CSP allows this via 'unsafe-inline'. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />
      <main>
        <Hero />
        <About />
        <Services />
        <MissionVision />
        <WorkGallery />
        <WhyUs />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
