// File: components/ConditionalLayoutWrapper.tsx
// Description: Wraps pages in the full dashboard shell for any dashboard route;
// otherwise delegates to the public ClientLayout via ConditionalClientLayout.

"use client";

import React from "react";
import { usePathname } from "next/navigation";
import ConditionalClientLayout from "@/components/ConditionalClientLayout";

export default function ConditionalLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Bypass the global header/footer for all dashboard routes:
  if (
    pathname?.startsWith("/dashboard/admin-dashboard") ||
    pathname?.startsWith("/dashboard/driver-dashboard") ||
    pathname?.startsWith("/dashboard/staff-dashboard") ||
    pathname?.startsWith("/dashboard/server-dashboard") ||    // ← added
    pathname?.startsWith("/dashboard/cashier-dashboard")      // ← added
  ) {
    return <>{children}</>;
  }

  // Everything else gets the public ClientLayout
  return <ConditionalClientLayout>{children}</ConditionalClientLayout>;
}
