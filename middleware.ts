// File: middleware.ts
// Description: Protects and authorizes access to /dashboard routes based on NextAuth roles.

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Map each first-level dashboard segment to allowed roles (all lowercase)
const dashboardRoleMap: Record<string, string[]> = {
  // Existing dashboard areas
  "admin-dashboard":   ["superadmin", "admin"],
  "staff-dashboard":   ["staff"],

  // New “staff” segment for pages under /dashboard/staff/*
  "staff":            ["superadmin", "admin", "staff", "cashier"],

  "server-dashboard":  ["server"],
  "cashier-dashboard": ["cashier"],
  "driver-dashboard":  ["driver"],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1) Only protect routes under /dashboard
  if (!pathname.startsWith("/dashboard")) {
    return NextResponse.next();
  }

  // 2) Validate NextAuth JWT
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET!,
  });
  if (!token) {
    // Not logged in → redirect to login
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 3) Determine which dashboard segment is being requested
  //    e.g. /dashboard/staff/verify-ticket → ["", "dashboard", "staff", ...]
  const segments = pathname.split("/");
  const areaKey = segments[2]; // first-level segment after "/dashboard"

  // 4) If we have a mapping for this segment, enforce role checks
  const allowedRoles = dashboardRoleMap[areaKey];
  if (allowedRoles) {
    const userRoles = (token.roles as string[]).map((r) => r.toLowerCase());
    const hasAccess = userRoles.some((r) => allowedRoles.includes(r));
    if (!hasAccess) {
      // Logged in but not permitted → redirect back to main dashboard
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  // 5) All checks pass → continue to the requested page
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
