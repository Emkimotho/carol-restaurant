// File: components/ConditionalClientLayout.tsx
// Description: Wraps routes in the public ClientLayout except for any of the dashboard routes
"use client";

import React from "react";
import { usePathname } from "next/navigation";
import ClientLayout from "@/components/ClientLayout";

interface ConditionalClientLayoutProps {
  children: React.ReactNode;
}

const ConditionalClientLayout = ({ children }: ConditionalClientLayoutProps) => {
  const pathname = usePathname();

  // Bypass the public ClientLayout on ALL dashboard routes
  if (
    pathname?.startsWith("/dashboard/admin-dashboard") ||
    pathname?.startsWith("/dashboard/driver-dashboard") ||
    pathname?.startsWith("/dashboard/staff-dashboard") ||
    pathname?.startsWith("/dashboard/server-dashboard") ||    // ← added
    pathname?.startsWith("/dashboard/cashier-dashboard")      // ← added
  ) {
    return <>{children}</>;
  }

  // All other routes use the public ClientLayout
  return <ClientLayout>{children}</ClientLayout>;
};

export default ConditionalClientLayout;
