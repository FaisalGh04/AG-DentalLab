import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations";
import { authConfig } from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const admin = await prisma.admin.findUnique({
          where: { email: email.toLowerCase() },
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
