import "bootstrap/dist/css/bootstrap.min.css"; // Import Bootstrap CSS
import "./globals.css"; // Import global custom styles

import Providers from "@/components/Providers";
import ClientLayout from "@/components/ClientLayout";
import Preloader from "@/components/Preloader/Preloader";

export const metadata = {
  title: "The 19th Hole | Home",
  description: "Experience the finest dining and entertainment at The 19th Hole.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {/* The enhanced preloader is rendered globally and will show during page load */}
          <Preloader />
          <ClientLayout>{children}</ClientLayout>
        </Providers>
      </body>
    </html>
  );
}
