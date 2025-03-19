"use client";

import dynamic from "next/dynamic";

const SidebarCart = dynamic(
  () => import("@/components/SidebarCart/SidebarCart"),
  { ssr: false }
);

interface CartDisplayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDisplay({ isOpen, onClose }: CartDisplayProps) {
  // With FloatingCartBar removed, we always render the SidebarCart.
  return <SidebarCart isOpen={isOpen} onClose={onClose} />;
}
