// File: app/layout.tsx

import "./globals.css";
import { Inter } from "next/font/google";
import Providers from "@/app/Providers";
import ConditionalLayoutWrapper from "@/components/ConditionalLayoutWrapper";
import SessionWrapper from "@/app/SessionWrapper";
import CookieBanner from "@/components/CookieBanner";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "19th Hole Restaurant and Bar",
  description: "19th Hole Restaurant and Bar at the Black Rock",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* 1) Cookie consent banner at the top level */}
        <CookieBanner />
        {/* 2) NextAuth session context must wrap everything */}
        <SessionWrapper>
          {/* 3) All your other providers (React‑Query, AuthContext, etc.) */}
          <Providers>
            {/* 4) Conditionally wrap pages with different layouts */}
            <ConditionalLayoutWrapper>
              {children}
            </ConditionalLayoutWrapper>
          </Providers>
        </SessionWrapper>
      </body>
    </html>
  );
}
