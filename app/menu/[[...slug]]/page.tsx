// File: app/menu/[[...slug]]/page.tsx
"use client";

import React from "react";
import MenuComponent from "@/components/Menu/Menu";

interface MenuPageProps {
  params: {
    slug?: string[] | Promise<string[]>;
  };
}

export default async function MenuPage({ params }: MenuPageProps) {
  // Await the slug in case it's a Promise.
  const resolvedSlug = await params.slug;
  let slug = resolvedSlug ?? [];
  
  // If the slug contains separate segments for "lunch" and "dinner", merge them.
  // For example, if slug is ["MainMenu", "lunch", "dinner"] (case-insensitive),
  // then set it to ["MainMenu", "Lunch/Dinner"].
  if (slug.length >= 3 && 
      slug[1].toLowerCase() === "lunch" && 
      slug[2].toLowerCase() === "dinner") {
    slug = [slug[0], "Lunch/Dinner"];
  }
  
  // Pass the modified slug to MenuComponent.
  return <MenuComponent slug={slug} />;
}
