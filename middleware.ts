// File: middleware.ts
// Description: Protects and authorizes access to /dashboard routes based on NextAuth roles.

import { NextRequest, NextResponse } from "next/server";
import { getToken }                 from "next-auth/jwt";

// Map each sub-dashboard path to the roles allowed to access it
const dashboardRoleMap: Record<string, string[]> = {
  "admin-dashboard":   ["admin", "superadmin"],
  "staff-dashboard":   ["staff"],
  "server-dashboard":  ["server"],
  "cashier-dashboard": ["cashier"],
  "driver-dashboard":  ["driver"],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1) Skip everything except /dashboard
  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  // 2) Validate NextAuth JWT
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET!,
  });
  if (!token) {
    // Not logged in → send to login
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 3) Determine which sub-dashboard is being requested
  const segments = pathname.split("/"); // ["", "dashboard", "staff-dashboard", ...]
  const key = segments[2];               // e.g. "staff-dashboard"

  // 4) If it matches one of our dashboards, enforce role
  const allowedRoles = dashboardRoleMap[key];
  if (allowedRoles) {
    const userRoles = (token.roles as string[]).map((r) => r.toLowerCase());
    const hasAccess = userRoles.some((r) => allowedRoles.includes(r));
    if (!hasAccess) {
      // Logged in but not permitted → send back to index router
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  // 5) All checks pass → continue
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
