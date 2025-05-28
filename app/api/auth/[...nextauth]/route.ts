// File: app/api/auth/[...nextauth]/route.ts
// ──────────────────────────────────────────────────────────────
//  NextAuth entry (App Router) — exports GET & POST handlers
// ──────────────────────────────────────────────────────────────

import NextAuth         from "next-auth/next";
import { authOptions }  from "@/lib/auth";

// Create the handlers
const handler = NextAuth(authOptions);

// App Router expects named exports for each HTTP method
export { handler as GET, handler as POST };
