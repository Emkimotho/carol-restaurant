// File: lib/auth.ts
// Description: NextAuth configuration (credentials + JWT) — always redirects to /dashboard after sign-in

import NextAuth, {
  NextAuthOptions,
  Account,
  Profile,
  User as NextUser,
} from "next-auth";
import type { AdapterUser } from "next-auth/adapters";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();
const isProd = process.env.NODE_ENV === "production";

/* ------------------------------------------------------------------
   Helper: unpack user → { id, name, roles, isVerified }
-------------------------------------------------------------------*/
function unpack(
  user: NextUser | AdapterUser | undefined | null
) {
  const u = user as
    | (NextUser & { name?: string; roles?: string[]; isVerified?: boolean })
    | (AdapterUser & { name?: string; roles?: string[]; isVerified?: boolean })
    | null
    | undefined;

  const rawId = u?.id;
  const idNum =
    typeof rawId === "string"
      ? parseInt(rawId, 10)
      : typeof rawId === "number"
      ? rawId
      : 0;

  return {
    id:         idNum,
    name:       u?.name ?? "",
    roles:      u?.roles ?? [],
    isVerified: u?.isVerified ?? false,
  };
}

/* ------------------------------------------------------------------
   Main NextAuth options
-------------------------------------------------------------------*/
export const authOptions: NextAuthOptions = {
  // 1) Use JWT for session
  session: { strategy: "jwt" },

  // 2) Credentials provider
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        if (!creds?.email || !creds.password) return null;

        // Fetch user with roles and verification flag
        const user = await prisma.user.findUnique({
          where: { email: creds.email },
          select: {
            id:         true,
            email:      true,
            password:   true,
            isVerified: true,
            firstName:  true,
            lastName:   true,
            roles:      { select: { role: { select: { name: true } } } },
          },
        });
        if (!user || !user.isVerified) return null;

        // Verify password
        const ok = await bcrypt.compare(creds.password, user.password);
        if (!ok) return null;

        // Return a user object with lowercase roles
        return {
          id:         user.id,
          email:      user.email,
          name:       `${user.firstName} ${user.lastName}`.trim(),
          roles:      user.roles.map(({ role }) => role.name.toLowerCase()),
          isVerified: user.isVerified,
        } as any;
      },
    }),
  ],

  // 3) Callbacks to flow data through JWT → session
  callbacks: {
    async signIn({ user }) {
      const { roles } = unpack(user);
      // allow login for any valid role
      return roles.some(r =>
        ["superadmin","admin","staff","driver","customer","server","cashier"].includes(r)
      );
    },
    async jwt({ token, user }) {
      if (user) {
        const { id, name, roles, isVerified } = unpack(user);
        token.id         = id;
        token.name       = name;
        token.roles      = roles;
        token.isVerified = isVerified;
      }
      return token;
    },
    async session({ session, token }) {
      (session.user as any).id         = token.id;
      (session.user as any).name       = token.name;
      (session.user as any).roles      = token.roles;
      (session.user as any).isVerified = token.isVerified;
      return session;
    },
    /** Always send everyone to /dashboard after sign-in */
    async redirect({ url, baseUrl }) {
      return `${baseUrl}/dashboard`;
    },
  },

  // 4) Custom pages
  pages: {
    signIn: "/login",
    error:  "/login",
  },

  // 5) Cookie settings to allow fetch() on PATCH/DELETE
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: isProd ? "none" : "lax",
        secure:   isProd,
        path:     "/",
      },
    },
    csrfToken: {
      name: "next-auth.csrf-token",
      options: {
        httpOnly: false,
        sameSite: isProd ? "none" : "lax",
        secure:   isProd,
        path:     "/",
      },
    },
  },

  // 6) Secret for signing tokens
  secret: process.env.NEXTAUTH_SECRET,
};

/* ------------------------------------------------------------------
   Default export for /api/auth/[...nextauth]
-------------------------------------------------------------------*/
export default NextAuth(authOptions);
