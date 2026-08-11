import { createHash, randomBytes } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { apiError } from "@/lib/api";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/prisma";

export const STAFF_MANAGEMENT_TTL_MS = 10 * 60 * 1000;

const COOKIE_NAME =
  process.env.NODE_ENV === "production"
    ? "__Host-ag-staff-management"
    : "ag-staff-management";

export function generateStaffManagementToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashStaffManagementToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function staffManagementExpiry(): Date {
  return new Date(Date.now() + STAFF_MANAGEMENT_TTL_MS);
}

export function setStaffManagementCookie(
  response: NextResponse,
  token: string,
  expiresAt: Date,
) {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: expiresAt,
  });
}

export function clearStaffManagementCookie(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: new Date(0),
  });
}

export async function getStaffManagementSession(
  req: NextRequest,
  adminId: string,
) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;

  const tokenHash = hashStaffManagementToken(token);
  const session = await prisma.staffManagementSession.findUnique({
    where: { tokenHash },
  });
  if (!session || session.adminId !== adminId) return null;

  if (session.expiresAt <= new Date()) {
    await prisma.staffManagementSession.deleteMany({ where: { id: session.id } });
    return null;
  }
  return session;
}

export type StaffManagementAccess =
  | { ok: true; adminId: string; adminEmail: string | null; expiresAt: Date }
  | { ok: false; response: NextResponse };

/** Require both the normal admin session and the short-lived manager unlock. */
export async function requireStaffManagementAccess(
  req: NextRequest,
): Promise<StaffManagementAccess> {
  const denied = await requireAdmin(req.headers);
  if (denied) return { ok: false, response: denied };

  const admin = await auth();
  const adminId = admin?.user?.id;
  if (!adminId) return { ok: false, response: apiError("Unauthorized", 401) };

  const session = await getStaffManagementSession(req, adminId);
  if (!session) {
    return {
      ok: false,
      response: apiError("Manager access is required or has expired.", 403),
    };
  }

  return {
    ok: true,
    adminId,
    adminEmail: admin.user.email ?? null,
    expiresAt: session.expiresAt,
  };
}
