// File: components/ClientLayout.tsx

"use client";

import React from "react";
import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main style={{ marginTop: "70px" }}>
        {children}
      </main>
      <Footer />
    </>
  );
}
