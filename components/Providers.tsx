"use client";

import React from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { OrderProvider } from "@/contexts/OrderContext";
import { OpeningHoursProvider } from "@/contexts/OpeningHoursContext";
import { ThemeProvider } from "next-themes"; // If you're using theming

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * Providers component wraps the entire app with all context providers.
 * No popup is rendered here, as we've removed references to the previous Popup logic.
 */
const Providers: React.FC<ProvidersProps> = ({ children }) => {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <AuthProvider>
        <CartProvider>
          <OrderProvider>
            <OpeningHoursProvider>
              {children}
            </OpeningHoursProvider>
          </OrderProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default Providers;
