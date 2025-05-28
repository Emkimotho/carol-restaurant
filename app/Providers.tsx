// File: app/Providers.tsx
"use client";

import React, { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import DeliveryChargesProvider from "@/contexts/DeliveryChargesContext";
import { OpeningHoursProvider } from "@/contexts/OpeningHoursContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { OrderProvider } from "@/contexts/OrderContext";
import { CartProvider } from "@/contexts/CartContext";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const queryClient = new QueryClient();

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <DeliveryChargesProvider>
        <OpeningHoursProvider>
          <AuthProvider>
            <OrderProvider>
              <CartProvider>
                {children}
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
