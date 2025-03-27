/**
 * Developed by Kimtech Solutions
 */

import "bootstrap/dist/css/bootstrap.min.css"; // Import Bootstrap CSS
import "./globals.css"; // Import global custom styles

import Providers from "@/components/Providers";
import ConditionalClientLayout from "@/components/ConditionalClientLayout";
import Preloader from "@/components/Preloader/Preloader";

export const metadata = {
  title: "The 19th Hole | Home",
  description: "Experience the finest dining and entertainment at The 19th Hole.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="light" style={{ colorScheme: "light" }}>
      <head>
        <meta name="description" content={metadata.description} />
        <title>{metadata.title}</title>
      </head>
      <body>
        <Providers>
          {/* Global preloader during page load */}
          <Preloader />
          {/* Conditionally wrap children with ClientLayout for public routes only */}
          <ConditionalClientLayout>{children}</ConditionalClientLayout>
        </Providers>
      </body>
    </html>
  );
}
