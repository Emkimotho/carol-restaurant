// File: app/Providers.tsx
"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Import your context providers (adjust paths as needed)
import DeliveryChargesProvider from "@/contexts/DeliveryChargesContext";
import { OpeningHoursProvider } from "@/contexts/OpeningHoursContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { OrderProvider } from "@/contexts/OrderContext";
import { CartProvider } from "@/contexts/CartContext";

// Import ToastContainer and its styles from React Toastify
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Create a single QueryClient instance. Because it's a class instance, it must be created inside a client component.
const queryClient = new QueryClient();

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <DeliveryChargesProvider>
        <OpeningHoursProvider>
          <AuthProvider>
            <OrderProvider>
              <CartProvider>
                {children}
                {/* Global ToastContainer so toast messages are displayed */}
                <ToastContainer 
                  position="top-center" 
                  autoClose={3000} 
                  hideProgressBar={false} 
                  newestOnTop={false} 
                  closeOnClick 
                  rtl={false} 
                  pauseOnFocusLoss 
                  draggable 
                  pauseOnHover 
                />
              </CartProvider>
            </OrderProvider>
          </AuthProvider>
        </OpeningHoursProvider>
      </DeliveryChargesProvider>
    </QueryClientProvider>
  );
}
