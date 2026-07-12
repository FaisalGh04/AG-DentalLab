import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/components/i18n/language-provider";
import { SITE } from "@/lib/constants";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Display face for headings — geometric, modern-luxury (Linear/Vercel register).
const sora = Sora({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s • ${SITE.name}`,
  },
  description: SITE.description,
  keywords: [
    "dental lab",
    "zirconia",
    "CAD/CAM",
    "digital dentistry",
    "dental restorations",
    "Amman",
    "Jordan",
    "AG Dental Lab",
  ],
  authors: [{ name: SITE.name }],
  openGraph: {
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    url: siteUrl,
    siteName: SITE.name,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: `${SITE.name} logo`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    images: ["/og-image.png"],
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [
      { url: "/ag-dental-lab-icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#275F4D",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      dir="ltr"
      className={`${inter.variable} ${sora.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Apply the saved language direction before first paint to avoid an
            LTR→RTL flash for returning Arabic visitors. Scoped to public routes
            only — admin/login stay English + LTR (kept in sync with
            isLocalizedPath in lib/i18n/config).

            No nonce: the layout is shared by the statically-generated public
            routes, so it can't read a per-request value. On public routes the
            CSP allows it via 'unsafe-inline'; on the nonce-based admin CSP it's
            allowed by hash (see LANG_SCRIPT_HASH in middleware.ts). If you edit
            this script, recompute that hash. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var l=localStorage.getItem('ag-lang');var p=location.pathname;var pub=(p==='/'||p==='/track'||p.indexOf('/track/')===0);if(l==='ar'&&pub){document.documentElement.lang='ar';document.documentElement.dir='rtl';}}catch(e){}})();",
          }}
        />
      </head>
      <body className="min-h-dvh antialiased">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
