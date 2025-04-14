// File: components/ConditionalLayoutWrapper.tsx
"use client";

import React from "react";
import { usePathname } from "next/navigation";
import ConditionalClientLayout from "@/components/ConditionalClientLayout";
// Removed Footer import to avoid double footer rendering
// import Footer from "@/components/Footer/Footer";

export default function ConditionalLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Define routes that should NOT show header and footer.
  const isNoHeaderFooter =
    pathname.startsWith("/dashboard/admin-dashboard") ||
    pathname.startsWith("/dashboard/driver-dashboard") ||
    pathname.startsWith("/dashboard/staff-dashboard");

  if (isNoHeaderFooter) {
    return <>{children}</>;
  }

  return (
    <>
      <ConditionalClientLayout>{children}</ConditionalClientLayout>
      {/* Footer removed from here to prevent double rendering.
          Ensure your layout or a specific page renders Footer once. */}
    </>
  );
}
