"use client";

import React from "react";
import { useParams } from "next/navigation";
import menuData, { MenuItem } from "@/data/menuData";
import ItemDetailPage from "./ItemDetailPage";

export default function Page() {
  const params = useParams() as { itemId: string };
  const { itemId } = params;
  const numericId = parseInt(itemId, 10);

  // Find the main item by numeric id.
  const foundItem = menuData.find((m) => m.id === numericId);

  if (!foundItem) {
    return <div style={{ padding: "2rem" }}>Item not found!</div>;
  }

  // Recommended drinks: filter items from the "Soft Drinks" category.
  const recommendedDrinks = menuData
    .filter((m) => m.category === "Soft Drinks")
    .map((m) => ({
      id: m.id,
      title: m.title,
      image: m.image,
      price: m.price,
    }));

  // Additional items are passed as full MenuItem objects.
  const desserts: MenuItem[] = menuData.filter((m) => m.category === "Desserts");
  const snacks: MenuItem[] = menuData.filter((m) => m.category === "Snacks");
  const softDrinks: MenuItem[] = menuData.filter((m) => m.category === "Soft Drinks");

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
