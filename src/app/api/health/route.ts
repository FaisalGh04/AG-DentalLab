import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Health check for load balancers / uptime monitors / Docker HEALTHCHECK. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, db: "up", ts: Date.now() });
  } catch {
    return NextResponse.json(
      { ok: false, db: "down", ts: Date.now() },
      { status: 503 },
    );
  }
}
