// File: lib/auth.ts
import NextAuth, { NextAuthOptions }  from "next-auth";
import CredentialsProvider            from "next-auth/providers/credentials";
import { PrismaClient }               from "@prisma/client";
import bcrypt                         from "bcrypt";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: {
            id:         true,
            email:      true,
            password:   true,
            isVerified: true,
            roles:      { select: { role: { select: { name: true } } } },
          },
        });
        if (!user || !user.isVerified) return null;
        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;

        return {
          id:         user.id.toString(),
          email:      user.email,
          roles:      user.roles.map(r => r.role.name),
          isVerified: user.isVerified,
        } as any;
      },
    }),
  ],

  callbacks: {
    // ← keep signIn if you like, but it only gates login, doesn't control final URL:
    async signIn({ user }) {
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id         = (user as any).id;
        token.roles      = (user as any).roles;
        token.isVerified = (user as any).isVerified;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id         = token.id as string;
        session.user.roles      = token.roles as string[];
        session.user.isVerified = token.isVerified as boolean;
      }
      return session;
    },

    /** ← NEW: control where to send the browser after login */
    async redirect({ url, baseUrl, user }) {
      // on initial sign‐in, `user` is populated
      const roles = (user as any)?.roles as string[] | undefined;

      // if we have roles, send to the appropriate dashboard
      if (roles?.includes("SUPERADMIN") || roles?.includes("ADMIN")) {
        return `${baseUrl}/dashboard/admin-dashboard`;
      }
      if (roles?.includes("STAFF")) {
        return `${baseUrl}/dashboard/staff-dashboard`;
      }
      if (roles?.includes("DRIVER")) {
        return `${baseUrl}/dashboard/driver-dashboard`;
      }
      if (roles?.includes("CUSTOMER")) {
        return `${baseUrl}/dashboard/customer-dashboard`;
      }

      // fallback: if NextAuth was asked to redirect somewhere else
      if (url.startsWith(baseUrl)) return url;
      if (url.startsWith("/"))       return baseUrl + url;
      return baseUrl;
    },
  },

  pages: {
    signIn: "/login",
    error:  "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
