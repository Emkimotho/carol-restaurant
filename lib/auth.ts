// File: lib/auth.ts
// ──────────────────────────────────────────────────────────────────────
// Consolidated NextAuth configuration — single source of truth.
//
// Note: We return `id` as a number (to match our extended User type) and
// add the second `req` parameter to `authorize` so the signature matches.
//
// Your app/api/auth/[...nextauth]/route.ts imports `authOptions` from here.
// ──────────────────────────────────────────────────────────────────────

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import { compare } from "bcrypt";

const prisma = new PrismaClient();
const isProd = process.env.NODE_ENV === "production";

export const authOptions: NextAuthOptions = {
  // 1) Use JWT sessions
  session: { strategy: "jwt" },

  // 2) Credentials provider
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      // Note the two parameters here: credentials + req
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        // Fetch user and roles
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { roles: { include: { role: true } } },
        });
        if (!user || !user.isVerified) {
          return null;
        }

        // Verify password
        const valid = await compare(credentials.password, user.password);
        if (!valid) {
          return null;
        }

        // Return a minimal user object with `id` as number
        return {
          id:            user.id,
          name:          `${user.firstName} ${user.lastName}`.trim(),
          email:         user.email,
          phone:         user.phone ?? "",
          roles:         user.roles.map((ur) => ur.role.name.toLowerCase()),
          isVerified:    user.isVerified,
          streetAddress: user.streetAddress,
          aptSuite:      user.aptSuite,
          city:          user.city,
          state:         user.state,
          zip:           user.zip,
          country:       user.country,
        } as any;  // cast to satisfy NextAuth's User type requirements
      },
    }),
  ],

  // 3) Callbacks
  callbacks: {
    async signIn({ user }: any) {
      const roles: string[] = (user.roles as string[]) || [];
      return roles.some((r) =>
        ["superadmin","admin","staff","driver","customer","server","cashier"].includes(r)
      );
    },

    async jwt({ token, user }: any) {
      if (user) {
        token.id            = user.id;
        token.name          = user.name;
        token.email         = user.email;
        token.roles         = user.roles;
        token.isVerified    = user.isVerified;
        token.phone         = user.phone;
        token.streetAddress = user.streetAddress;
        token.aptSuite      = user.aptSuite;
        token.city          = user.city;
        token.state         = user.state;
        token.zip           = user.zip;
        token.country       = user.country;
      }
      return token;
    },

    async session({ session, token }: any) {
      (session.user as any).id            = token.id;
      (session.user as any).name          = token.name;
      (session.user as any).email         = token.email;
      (session.user as any).roles         = token.roles;
      (session.user as any).isVerified    = token.isVerified;
      (session.user as any).phone         = token.phone;
      (session.user as any).streetAddress = token.streetAddress;
      (session.user as any).aptSuite      = token.aptSuite;
      (session.user as any).city          = token.city;
      (session.user as any).state         = token.state;
      (session.user as any).zip           = token.zip;
      (session.user as any).country       = token.country;
      return session;
    },

    // Redirect everyone to /dashboard after sign-in
    async redirect({ baseUrl }: any) {
      return `${baseUrl}/dashboard`;
    },
  },

  // 4) Custom pages
  pages: {
    signIn: "/login",
    error:  "/login",
  },

  // 5) Secret for signing and encrypting JWTs
  secret: process.env.NEXTAUTH_SECRET,
};
