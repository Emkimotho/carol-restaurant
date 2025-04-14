// File: components/MenuItem/MenuItem.tsx
"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import styles from "./MenuItem.module.css";

// Types
import type { MenuItem as MenuItemType } from "@/utils/types";

interface MenuItemProps {
  item: MenuItemType;
  user: any;
  allowAddToCart: boolean;
  restaurantOpen: boolean;
  onStartOrder?: (itemId: string) => void;
}

export default function MenuItem({
  item,
  user,
  allowAddToCart,
  restaurantOpen,
  onStartOrder,
}: MenuItemProps) {
  const router = useRouter();

  // When "Start Order" is clicked
  function handleAddClick() {
    if (!allowAddToCart) {
      console.warn("[MenuItem] This item cannot be added to cart.");
      return;
    }
    if (onStartOrder) {
      // If an external handler is provided, call it with the item ID
      onStartOrder(item.id);
    } else {
      // Fallback: if no external handler, do local logic
      if (!restaurantOpen) {
        // Potentially show a local scheduling popup, but since
        // we rely on the parent's schedule modal, let's just do:
        router.push(`/menuitem/${item.id}?schedule=closed`);
      } else {
        // If open, go to detail page
        router.push(`/menuitem/${item.id}`);
      }
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.photo}>
        {item.image && (
          <Image
            src={item.image}
            alt={item.title}
            width={300}
            height={200}
            className={styles.itemImage}
            unoptimized
          />
        )}
      </div>
      <div className={styles.details}>
        <h4 className={styles.title}>{item.title}</h4>
        <p className={styles.description}>{item.description}</p>
        <h5 className={styles.price}>${parseFloat(String(item.price)).toFixed(2)}</h5>

        {allowAddToCart ? (
          <button className={styles.btnAddToCart} onClick={handleAddClick}>
            Start Order
          </button>
        ) : (
          <p className={styles.textMuted}>In-restaurant purchase only</p>
        )}
      </div>
    </div>
  );
}
