import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest, NextFetchEvent } from "next/server";
import { authConfig } from "@/auth.config";

// Edge-safe: the Prisma-free base config so the DB client never enters the Edge
// runtime. Only instantiated to get the session-aware `auth` wrapper.
const { auth } = NextAuth(authConfig);

// SHA-256 of the pre-paint language script rendered by the root layout
// (src/app/layout.tsx). That script carries no nonce — the layout is shared by
// the statically-generated public routes, so it can't read a per-request value.
// The nonce-based admin CSP therefore allows it by hash, keeping the Report-Only
// stream clean. Recompute (sha256, base64) if that inline script ever changes.
const LANG_SCRIPT_HASH = "'sha256-rjqu5NZLMMsp5iLiH1ErIVTD1X5WzdrYLOBHXhR3FWc='";

const isDev = process.env.NODE_ENV !== "production";

/** Per-request base64 nonce (Edge Web Crypto). */
function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/** Directives shared by the public + admin policies (everything but script-src). */
function commonDirectives(origin: string): string[] {
  return [
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
    `report-uri ${origin}/api/csp-report`,
    `report-to csp-endpoint`,
    `upgrade-insecure-requests`,
  ];
}

/**
 * Public routes (landing, /track, public APIs) are statically generated, so
 * their CSP is a single constant string with no per-request nonce. Inline
 * scripts — Next's hydration payload, our JSON-LD, and the pre-paint lang
 * script — are permitted via 'unsafe-inline'. Deliberately NO 'strict-dynamic':
 * its presence would make the browser ignore 'unsafe-inline'.
 */
function buildPublicCsp(origin: string): string {
  return [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    ...commonDirectives(origin),
  ].join("; ");
}

/**
 * Admin + login render dynamically, so they keep the strong nonce policy (S-M4).
 * Next stamps the nonce onto its own inline scripts (it reads it from the
 * request's Content-Security-Policy header, set below); the un-nonced lang
 * script is trusted by hash. 'strict-dynamic' means host-allowlists and
 * 'unsafe-inline' are ignored — only nonce/hash-trusted scripts execute.
 */
function buildAdminCsp(nonce: string, origin: string): string {
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' ${LANG_SCRIPT_HASH} 'strict-dynamic'${
      isDev ? " 'unsafe-eval'" : ""
    }`,
    ...commonDirectives(origin),
  ].join("; ");
}

/** Attach the Reporting-API endpoints so CSP violation reports keep flowing. */
function withReporting(res: NextResponse, origin: string): NextResponse {
  const reportUrl = `${origin}/api/csp-report`;
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
}

/**
 * Session-gated branch. Only reached for /admin and /login, so the JWT decode
 * that `auth()` performs never runs on public traffic (#8).
 *
 * The nonce-based policy (S-M4) is applied ONLY to the dynamically-rendered
 * /admin area, where Next can actually stamp the per-request nonce onto its
 * inline scripts. /login is statically generated (it just needs the session to
 * decide the already-signed-in redirect), so it gets the same static public CSP
 * as the rest of the site — a per-request nonce on a static page would only
 * produce Report-Only noise.
 *
 * Phase 1: the policy ships as Content-Security-Policy-REPORT-ONLY, so browsers
 * report violations but block nothing. Flip the header name to enforce once the
 * reports are clean.
 */
const authGated = auth((req) => {
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

  if (isAdminArea) {
    const nonce = generateNonce();
    const csp = buildAdminCsp(nonce, nextUrl.origin);

    // Expose the nonce'd policy on the *request* so Next stamps its own inline
    // scripts with this nonce. The browser only ever receives the Report-Only
    // header below (so nothing is enforced yet).
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("Content-Security-Policy", csp);

    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.headers.set("Content-Security-Policy-Report-Only", csp);
    return withReporting(res, nextUrl.origin);
  }

  // /login (static): same public policy as the rest of the site.
  const loginRes = NextResponse.next();
  loginRes.headers.set(
    "Content-Security-Policy-Report-Only",
    buildPublicCsp(nextUrl.origin),
  );
  return withReporting(loginRes, nextUrl.origin);
}) as unknown as (
  // NextAuth types the 2nd arg as a route-handler context, but in middleware
  // Next passes a NextFetchEvent (used only for waitUntil). Cast to the
  // middleware signature so we can delegate to it conditionally.
  req: NextRequest,
  event: NextFetchEvent,
) => NextResponse | Promise<NextResponse>;

/**
 * Entry point. Public routes get the static CSP with no session decode (#8);
 * only /admin + /login delegate to the auth-aware handler above.
 */
export default function middleware(req: NextRequest, event: NextFetchEvent) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin") || pathname === "/login") {
    return authGated(req, event);
  }

  const res = NextResponse.next();
  res.headers.set(
    "Content-Security-Policy-Report-Only",
    buildPublicCsp(req.nextUrl.origin),
  );
  return withReporting(res, req.nextUrl.origin);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)",
  ],
};
