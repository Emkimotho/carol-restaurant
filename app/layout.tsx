import "./globals.css"; // Global CSS file
import { Inter } from "next/font/google";
import Providers from "@/app/Providers";
import ConditionalLayoutWrapper from "@/components/ConditionalLayoutWrapper";

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
        <Providers>
          <ConditionalLayoutWrapper>
            {children}
          </ConditionalLayoutWrapper>
        </Providers>
      </body>
    </html>
  );
}
