// File: app/SessionWrapper.tsx
"use client";

import { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";

/** Provides next‑auth session context to all client components */
export default function SessionWrapper({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
