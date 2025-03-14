"use client";

import React, { useContext } from "react";
import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";
import SidebarCart from "@/components/SidebarCart/SidebarCart";
import { CartContext } from "@/contexts/CartContext";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { isSidebarCartOpen, closeSidebarCart } = useContext(CartContext)!;

  return (
    <>
      <Header />
      <main style={{ marginTop: "70px" }}>{children}</main>
      <Footer />
      <SidebarCart isOpen={isSidebarCartOpen} onClose={closeSidebarCart} />
    </>
  );
}
