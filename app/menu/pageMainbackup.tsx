"use client";

import dynamic from "next/dynamic";
import MenuComponent from "@/components/Menu/Menu";

interface MenuPageProps {
  params: {
    slug?: string[];
  };
}

// Dynamically import SidebarCart for client-side rendering.
const SidebarCart = dynamic(
  () => import("@/components/SidebarCart/SidebarCart"),
  { ssr: false }
);

export default function MenuPage({ params }: MenuPageProps) {
  const slug = params.slug ?? [];

  return (
    <>
      <MenuComponent slug={slug} />
      {/* FloatingCartBar removed */}
    </>
  );
}
