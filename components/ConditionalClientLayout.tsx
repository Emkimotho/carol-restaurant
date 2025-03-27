"use client";

import React from "react";
import { usePathname } from "next/navigation";
import ClientLayout from "@/components/ClientLayout";

interface ConditionalClientLayoutProps {
  children: React.ReactNode;
}

const ConditionalClientLayout = ({ children }: ConditionalClientLayoutProps) => {
  const pathname = usePathname();
  const isDashboardRoute =
    pathname?.startsWith("/admin-dashboard") ||
    pathname?.startsWith("/superadmin-dashboard") ||
    pathname?.startsWith("/staff-dashboard") ||
    pathname?.startsWith("/driver-dashboard");

  // If the current route is a dashboard route, do not wrap with ClientLayout (header/footer)
  if (isDashboardRoute) {
    return <>{children}</>;
  }

  // Otherwise, wrap with the public ClientLayout
  return <ClientLayout>{children}</ClientLayout>;
};

export default ConditionalClientLayout;
