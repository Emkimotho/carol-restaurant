// components/CartDisplay.tsx
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const SidebarCart = dynamic(() => import("@/components/SidebarCart/SidebarCart"), {
  ssr: false,
});
const FloatingCartBar = dynamic(() => import("@/components/FloatingCartBar/FloatingCartBar"), {
  ssr: false,
});

interface CartDisplayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDisplay({ isOpen, onClose }: CartDisplayProps) {
  const [isLargeScreen, setIsLargeScreen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsLargeScreen(window.innerWidth >= 992);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isLargeScreen ? (
    <SidebarCart isOpen={isOpen} onClose={onClose} />
  ) : (
    <FloatingCartBar />
  );
}
