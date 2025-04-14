// File: app/layout.tsx

import "./globals.css"; // Global CSS file
import { Inter } from "next/font/google";

// Import your existing Header and Footer components
import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";

// Import the Providers client component (which includes React Query and other contexts)
import Providers from "@/app/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Your App Title",
  description: "Your App Description",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* Providers is a Client Component wrapping QueryClientProvider and all your context providers */}
        <Providers>
          <Header />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
