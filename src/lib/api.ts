import { NextResponse } from "next/server";
import { ZodError } from "zod";

/** Standard JSON error response. */
export function apiError(message: string, status = 400, extra?: unknown) {
  return NextResponse.json(
    { ok: false, error: message, ...(extra ? { details: extra } : {}) },
    { status },
  );
}

/** Standard JSON success response. */
export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

/** Turn a thrown error into a safe API response (no internals leaked). */
export function handleApiError(err: unknown) {
  if (err instanceof ZodError) {
    return apiError("Validation failed", 422, err.flatten().fieldErrors);
  }
  // Log the real error server-side (Sentry captures via instrumentation).
  console.error("[api] unhandled error:", err);
  return apiError("Something went wrong. Please try again.", 500);
}

export function rateLimited(reset: number) {
  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return NextResponse.json(
    { ok: false, error: "Too many requests. Please slow down." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}
