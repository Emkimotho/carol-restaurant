// File: app/layout.tsx

import "./globals.css";
import { Inter } from "next/font/google";
import Providers from "@/app/Providers";
import ConditionalLayoutWrapper from "@/components/ConditionalLayoutWrapper";
import SessionWrapper from "@/app/SessionWrapper";
import CookieBanner from "@/components/CookieBanner";
import AddToCartEffect from "@/components/AddToCartEffect/AddToCartEffect";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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
        {/* ─── 1) Golf‐ball animation listener across the whole app ─── */}
        <AddToCartEffect />

        {/* ─── 2) Toast container for react‐toastify to show toasts ─── */}
        <ToastContainer
          position="top-center"
          autoClose={1500}
          hideProgressBar
        />

        {/* ─── 3) Cookie consent banner at the top level ─── */}
        <CookieBanner />

        {/* ─── 4) NextAuth session context must wrap everything ─── */}
        <SessionWrapper>
          {/* ─── 5) All your other providers (React-Query, AuthContext, etc.) ─── */}
          <Providers>
            {/* ─── 6) Conditionally wrap pages with different layouts ─── */}
            <ConditionalLayoutWrapper>
              {children}
            </ConditionalLayoutWrapper>
          </Providers>
        </SessionWrapper>
      </body>
    </html>
  );
}
