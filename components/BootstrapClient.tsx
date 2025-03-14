// File: components/BootstrapClient.tsx
// This is a Client Component solely responsible for loading Bootstrap JS at runtime.

"use client";

import { useEffect } from "react";

export default function BootstrapClient() {
  useEffect(() => {
    // Dynamically import the Bootstrap JS bundle for modals, dropdowns, etc.
    import("bootstrap/dist/js/bootstrap.bundle.min.js");
  }, []);

  // This component doesn't render anything; it just triggers the import in the browser.
  return null;
}
