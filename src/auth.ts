import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations";
import { authConfig } from "@/auth.config";
import {
  checkAuthRateLimit,
  clearAuthRateLimit,
  getClientIp,
} from "@/lib/ratelimit";
import { getLoginDeviceId } from "@/lib/login-device";

/**
 * Thrown when the login rate limit is exceeded. Deliberately generic — it never
 * reveals whether the email/account exists, only that too many attempts were made.
 */
class RateLimitedSignin extends CredentialsSignin {
  code = "rate_limited";
}
/** Thrown when the rate limiter can't be verified (fail-closed). */
class AuthUnavailableSignin extends CredentialsSignin {
  code = "auth_unavailable";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw, request) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const emailKey = email.toLowerCase();

        // Brute-force gate BEFORE any bcrypt/DB work, so throttled attempts cost
        // nothing. The device key isolates browsers behind one IP; the broader
        // source key prevents cookie clearing from creating unlimited buckets.
        const headers = request?.headers ?? new Headers();
        const ip = getClientIp(headers);
        const deviceId = getLoginDeviceId(headers) ?? "no-device-cookie";
        const rateLimitKeys = {
          device: `login:device:${deviceId}:ip:${ip}:email:${emailKey}`,
          source: `login:source:ip:${ip}:email:${emailKey}`,
        };
        const gate = await checkAuthRateLimit(rateLimitKeys);
        if (!gate.allowed) {
          throw gate.reason === "unavailable"
            ? new AuthUnavailableSignin()
            : new RateLimitedSignin();
        }

        const admin = await prisma.admin.findUnique({
          where: { email: emailKey },
        });
        if (!admin) {
          // Run a dummy compare to blunt user-enumeration timing attacks.
          await bcrypt.compare(
            password,
            "$2a$12$invalidinvalidinvalidinvalidinv",
          );
          return null;
        }

        const ok = await bcrypt.compare(password, admin.passwordHash);
        if (!ok) return null;

        // A verified password rehabilitates this legitimate source immediately.
        await clearAuthRateLimit(rateLimitKeys);

        return {
          id: admin.id,
          email: admin.email,
          // Passed through as-is (may be null). It used to fall back to the
          // literal "Admin", which made a name-less account indistinguishable
          // from one actually called "Admin" and defeated every downstream
          // `name ?? email` fallback — including the Received By attribution in
          // /api/admin/cases. Both consumers (src/app/admin/layout.tsx and the
          // case form) already handle null.
          name: admin.name,
          role: "admin" as const,
        };
      },
    }),
  ],
});
