// File: app/api/auth/[...nextauth]/route.ts
// ----------------------------------------------------------------------
//  NextAuth App-Router configuration (fully valid TypeScript).
//  • Adds `phone` to the session payload so it flows into AuthContext.
//  • Uses your existing custom login screen at `/login`.
//  • All earlier business logic—role propagation, address fields, etc.—
//    is preserved line-for-line.
// ----------------------------------------------------------------------

import NextAuth from "next-auth/next";           // App-Router entry point
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider       from "next-auth/providers/credentials";
import { prisma }                from "@/lib/prisma";
import { compare }               from "bcrypt";

export const authOptions: NextAuthOptions = {
  /* ------------------------------------------------------------------ */
  /*  1. Providers                                                      */
  /* ------------------------------------------------------------------ */
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email:    { label: "Email",    type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials: any): Promise<any> {
        if (!credentials?.email || !credentials.password) return null;

        /* a) Look up the user */
        const user = await prisma.user.findUnique({
          where:   { email: credentials.email },
          include: { roles: { include: { role: true } } },
        });
        if (!user) return null;

        /* b) Verify password */
        const valid = await compare(credentials.password, user.password);
        if (!valid) return null;

        /* c) Return the public session-user object */
        return {
          id:            user.id.toString(),
          name:          `${user.firstName} ${user.lastName}`.trim(),
          email:         user.email,
          phone:         user.phone ?? "",                // ← NEW
          roles:         user.roles.map((ur) => ur.role.name),
          isVerified:    user.isVerified,
          streetAddress: user.streetAddress,
          aptSuite:      user.aptSuite,
          city:          user.city,
          state:         user.state,
          zip:           user.zip,
          country:       user.country,
        };
      },
    }),
  ],

  /* ------------------------------------------------------------------ */
  /*  2. Callbacks – enrich JWT & session                               */
  /* ------------------------------------------------------------------ */
  callbacks: {
    /* ----- runs whenever a JWT is issued or updated ----- */
    async jwt({ token, user }: any): Promise<any> {
      if (user) {
        token.id             = user.id;
        token.roles          = user.roles;
        token.isVerified     = user.isVerified;
        token.phone          = user.phone;              // ← NEW
        token.streetAddress  = user.streetAddress;
        token.aptSuite       = user.aptSuite;
        token.city           = user.city;
        token.state          = user.state;
        token.zip            = user.zip;
        token.country        = user.country;
      }
      return token;
    },

    /* ----- makes those fields available via useSession() ----- */
    async session({ session, token }: any): Promise<any> {
      session.user.id             = token.id;
      session.user.roles          = token.roles;
      session.user.isVerified     = token.isVerified;
      session.user.phone          = token.phone;        // ← NEW
      session.user.streetAddress  = token.streetAddress;
      session.user.aptSuite       = token.aptSuite;
      session.user.city           = token.city;
      session.user.state          = token.state;
      session.user.zip            = token.zip;
      session.user.country        = token.country;
      return session;
    },
  },

  /* ------------------------------------------------------------------ */
  /*  3. Misc                                                            */
  /* ------------------------------------------------------------------ */
  session: { strategy: "jwt" },

  /* Use the existing /login page instead of the default NextAuth UI */
  pages: { signIn: "/login" },
};

/* ------------------------------------------------------------------ */
/*  Route handler export (App-Router)                                 */
/* ------------------------------------------------------------------ */
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
