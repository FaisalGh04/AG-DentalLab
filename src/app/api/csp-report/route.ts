import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getClientIp, limit, searchRatelimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A CSP violation report is tiny; cap the payload to blunt log-spam abuse.
const MAX_BODY_BYTES = 64 * 1024;

type NormalizedReport = {
  effectiveDirective?: string;
  blockedUri?: string;
  documentUri?: string;
  disposition?: string;
};

const asString = (v: unknown): string | undefined =>
  typeof v === "string" ? v : undefined;

/**
 * Normalize both wire formats into a flat list:
 *  - legacy `application/csp-report`:  { "csp-report": { "blocked-uri", ... } }
 *  - Reporting API `application/reports+json`:
 *      [ { type: "csp-violation", body: { blockedURL, effectiveDirective, ... } } ]
 */
function normalizeReports(payload: unknown): NormalizedReport[] {
  const out: NormalizedReport[] = [];

  if (Array.isArray(payload)) {
    for (const item of payload) {
      if (!item || typeof item !== "object") continue;
      const entry = item as Record<string, unknown>;
      if (entry.type !== "csp-violation") continue;
      const body = (entry.body ?? {}) as Record<string, unknown>;
      out.push({
        effectiveDirective:
          asString(body.effectiveDirective) ?? asString(body.violatedDirective),
        blockedUri: asString(body.blockedURL),
        documentUri: asString(body.documentURL),
        disposition: asString(body.disposition),
      });
    }
    return out;
  }

  if (payload && typeof payload === "object") {
    const legacy = (payload as Record<string, unknown>)["csp-report"];
    if (legacy && typeof legacy === "object") {
      const r = legacy as Record<string, unknown>;
      out.push({
        effectiveDirective:
          asString(r["effective-directive"]) ?? asString(r["violated-directive"]),
        blockedUri: asString(r["blocked-uri"]),
        documentUri: asString(r["document-uri"]),
        disposition: asString(r["disposition"]),
      });
    }
  }

  return out;
}

/**
 * POST /api/csp-report — collection endpoint for CSP violation reports (S-M4).
 * Best-effort: it NEVER errors the browser (always 204). Logs to Sentry when
 * configured, otherwise console.error so violations still land in Vercel logs.
 */
export async function POST(req: NextRequest) {
  const noContent = () => new NextResponse(null, { status: 204 });
  try {
    // Light per-IP throttle so a flood can't spam logs; drop silently if hit.
    const ip = getClientIp(req.headers);
    const { success } = await limit(searchRatelimit, `csp:${ip}`);
    if (!success) return noContent();

    const raw = await req.text();
    if (!raw || raw.length > MAX_BODY_BYTES) return noContent();

    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      return noContent();
    }

    const reports = normalizeReports(payload);
    const sentryOn = !!process.env.NEXT_PUBLIC_SENTRY_DSN;

    for (const r of reports) {
      const msg = `[csp] ${r.disposition ?? "report"}: ${
        r.effectiveDirective ?? "?"
      } blocked ${r.blockedUri ?? "?"} on ${r.documentUri ?? "?"}`;
      if (sentryOn) {
        Sentry.captureMessage(msg, { level: "warning", extra: { report: r } });
      } else {
        console.error(msg, r);
      }
    }

    return noContent();
  } catch (err) {
    console.error("[csp] failed to handle report:", err);
    return noContent();
  }
}
