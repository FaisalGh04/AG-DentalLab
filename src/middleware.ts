import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

// Edge-safe middleware: uses the Prisma-free base config so it never bundles
// the database client into the Edge runtime.
const { auth } = NextAuth(authConfig);

/** Per-request base64 nonce (Edge Web Crypto). */
function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/**
 * Content-Security-Policy (S-M4). Nonce-based so Next's inline hydration
 * scripts + our two inline scripts are trusted without 'unsafe-inline'.
 * See the S-M4 proposal for the per-directive rationale.
 */
function buildCsp(nonce: string, origin: string, isDev: boolean): string {
  const reportUrl = `${origin}/api/csp-report`;
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${
      isDev ? " 'unsafe-eval'" : ""
    }`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https://*.supabase.co https://*.storage.supabase.co`,
    `font-src 'self'`,
    `connect-src 'self' https://*.sentry.io https://*.storage.supabase.co${
      isDev ? " ws:" : ""
    }`,
    `frame-src 'none'`,
    `frame-ancestors 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `worker-src 'self' blob:`,
    `report-uri ${reportUrl}`,
    `report-to csp-endpoint`,
    `upgrade-insecure-requests`,
  ].join("; ");
}

/**
 * Protects the /admin area (redirects) AND attaches a nonce-based CSP.
 *
 * Phase 1 (S-M4): the policy ships as Content-Security-Policy-REPORT-ONLY, so
 * browsers report violations to /api/csp-report but block nothing — safe to
 * observe on live traffic. Flip the header name to enforce once reports are
 * clean.
 */
export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const isAdminArea = nextUrl.pathname.startsWith("/admin");
  const isLoginPage = nextUrl.pathname === "/login";

  if (isAdminArea && !isLoggedIn) {
    const url = new URL("/login", nextUrl.origin);
    url.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (isLoginPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/admin", nextUrl.origin));
  }

  const nonce = generateNonce();
  const isDev = process.env.NODE_ENV !== "production";
  const csp = buildCsp(nonce, nextUrl.origin, isDev);

  // Expose the nonce to Server Components (layout/page read it via headers()).
  // Next also reads the CSP header's nonce to stamp its own inline scripts.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy-Report-Only", csp);
  // Reporting API (modern) + legacy Report-To for the report-to directive.
  const reportUrl = `${nextUrl.origin}/api/csp-report`;
  res.headers.set("Reporting-Endpoints", `csp-endpoint="${reportUrl}"`);
  res.headers.set(
    "Report-To",
    JSON.stringify({
      group: "csp-endpoint",
      max_age: 10886400,
      endpoints: [{ url: reportUrl }],
    }),
  );
  return res;
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)",
  ],
};
