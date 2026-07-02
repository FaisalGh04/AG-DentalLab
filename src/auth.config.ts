import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe base config (no Prisma, no bcrypt). Used by middleware for
 * route protection. The full config in `auth.ts` extends this and adds the
 * Credentials provider whose `authorize` runs only in the Node.js runtime.
 */
export const authConfig = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  trustHost: true,
  pages: { signIn: "/login" },
  providers: [], // real provider added in auth.ts (Node runtime)
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = "admin";
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = "admin";
      }
      return session;
    },
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
} satisfies NextAuthConfig;
