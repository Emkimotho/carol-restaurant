"use client";

import React from "react";
import { usePathname } from "next/navigation";
import ClientLayout from "@/components/ClientLayout";

interface ConditionalClientLayoutProps {
  children: React.ReactNode;
}

const ConditionalClientLayout = ({ children }: ConditionalClientLayoutProps) => {
  const pathname = usePathname();

  // If the current route is under /dashboard, do not wrap with the public layout.
  if (pathname && pathname.startsWith("/dashboard")) {
    return <>{children}</>;
  }

  return <ClientLayout>{children}</ClientLayout>;
};

export default ConditionalClientLayout;
