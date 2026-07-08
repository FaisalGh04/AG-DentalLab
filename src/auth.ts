import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations";
import { authConfig } from "@/auth.config";
import { checkAuthRateLimit, getClientIp } from "@/lib/ratelimit";

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
        // nothing. Keyed on IP + email so one IP can't spray many accounts and
        // one account can't be hammered across IPs.
        const ip = getClientIp(request?.headers ?? new Headers());
        const gate = await checkAuthRateLimit([
          `login:ip:${ip}`,
          `login:email:${emailKey}`,
        ]);
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
          await bcrypt.compare(password, "$2a$12$invalidinvalidinvalidinvalidinv");
          return null;
        }

        const ok = await bcrypt.compare(password, admin.passwordHash);
        if (!ok) return null;

        return {
          id: admin.id,
          email: admin.email,
          name: admin.name ?? "Admin",
          role: "admin" as const,
        };
      },
    }),
  ],
});
