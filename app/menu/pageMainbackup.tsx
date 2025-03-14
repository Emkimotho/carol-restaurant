
"use client";


import dynamic from "next/dynamic";
import MenuComponent from "@/components/Menu/Menu";


interface MenuPageProps {
  params: {
    slug?: string[];
  };
}


// Dynamically import components that should only render on the client side.
const SidebarCart = dynamic(() => import("@/components/SidebarCart/SidebarCart"), {
  ssr: false,
});
const FloatingCartBar = dynamic(() => import("@/components/FloatingCartBar/FloatingCartBar"), {
  ssr: false,
});


export default function MenuPage({ params }: MenuPageProps) {
  const slug = params.slug ?? [];


  return (
    <>
      <MenuComponent slug={slug} />
      
      <FloatingCartBar />
    </>
  );
}



