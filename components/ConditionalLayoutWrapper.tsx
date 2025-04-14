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

  // For any dashboard route, bypass the global header/footer layout.
  if (pathname && pathname.startsWith("/dashboard")) {
    return <>{children}</>;
  }

  return <ConditionalClientLayout>{children}</ConditionalClientLayout>;
}
