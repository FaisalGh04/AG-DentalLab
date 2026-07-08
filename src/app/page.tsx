import type { Metadata } from "next";
import { headers } from "next/headers";
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

export default async function HomePage() {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <div className="dark landing-dark-shell text-foreground">
      <script
        type="application/ld+json"
        nonce={nonce}
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
