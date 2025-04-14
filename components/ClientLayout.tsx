// File: components/ClientLayout.tsx

"use client";

import React, { useContext } from "react";
import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";
// Removed SidebarCart import since we no longer use a sidebar cart
// import SidebarCart from "@/components/SidebarCart/SidebarCart";
import { CartContext } from "@/contexts/CartContext";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { isSidebarCartOpen, closeSidebarCart } = useContext(CartContext)!;

  return (
    <>
      <Header />
      <main style={{ marginTop: "70px" }}>{children}</main>
      <Footer />
      {/* Since we are now using a full-page cart, the SidebarCart is no longer rendered.
          If needed, you can remove the open/close logic later from CartContext as well. */}
      {/* <SidebarCart isOpen={isSidebarCartOpen} onClose={closeSidebarCart} /> */}
    </>
  );
}
