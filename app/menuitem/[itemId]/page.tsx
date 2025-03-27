"use client";

import React from "react";
import { useParams } from "next/navigation";
import menuData from "@/data/menuData";
import ItemDetailPage from "@/components/MenuItem/ItemDetailPage";
import type { MenuItem } from "@/utils/types";

export default function Page() {
  const params = useParams() as { itemId: string };
  const { itemId } = params;

  // Lookup by string ID.
  const foundItem = menuData.find((m) => m.id === itemId);

  if (!foundItem) {
    return <div style={{ padding: "2rem" }}>Item not found!</div>;
  }

  // Filter recommended items by category name.
  const recommendedDrinks: MenuItem[] = menuData.filter(
    (m) => m.category && m.category.name === "Soft Drinks"
  );
  const desserts: MenuItem[] = menuData.filter(
    (m) => m.category && m.category.name === "Desserts"
  );
  const snacks: MenuItem[] = menuData.filter(
    (m) => m.category && m.category.name === "Snacks"
  );
  const softDrinks: MenuItem[] = menuData.filter(
    (m) => m.category && m.category.name === "Soft Drinks"
  );

  return (
    <ItemDetailPage
      item={foundItem}
      recommendedDrinks={recommendedDrinks}
      desserts={desserts}
      snacks={snacks}
      softDrinks={softDrinks}
    />
  );
}
