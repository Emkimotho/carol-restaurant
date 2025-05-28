/* ------------------------------------------------------------------ */
/*  File: components/MenuItem/MenuItem.tsx                            */
/* ------------------------------------------------------------------ */
/*  • Red ⛳︎ badge for Golf‑menu cards (prop‑driven)                  */
/*  • “Sold out” ribbon when stock === 0                              */
/*  • 🌶️ icon when hasSpiceLevel === true                            */
/*  • Closed‑store schedule flow, alt text, price formatting          */
/* ------------------------------------------------------------------ */

"use client";

import React      from "react";
import Image      from "next/image";
import { useRouter } from "next/navigation";
import styles     from "./MenuItem.module.css";

import type { MenuItem as MenuItemType } from "@/utils/types";

interface MenuItemProps {
  item: MenuItemType;
  allowAddToCart: boolean;
  restaurantOpen: boolean;
  onStartOrder?: (itemId: string) => void;
  /** true → show red golf flag */
  showGolfFlag?: boolean;
}

export default function MenuItem({
  item,
  allowAddToCart,
  restaurantOpen,
  onStartOrder,
  showGolfFlag = false,
}: MenuItemProps) {
  const router = useRouter();

  /* ----------------------- click handler -------------------------- */
  function handleAddClick() {
    if (!allowAddToCart) return;

    if (onStartOrder) {
      onStartOrder(item.id);
    } else {
      const url = restaurantOpen
        ? `/menuitem/${item.id}`
        : `/menuitem/${item.id}?schedule=closed`;
      router.push(url);
    }
  }

  const isSoldOut = item.stock === 0;

  return (
    <div className={styles.container}>
      {/* Golf‑flag badge (red) */}
      {showGolfFlag && (
        <div className={`${styles.golfBadge} ${styles.golfBadgeRed}`}>⛳︎</div>
      )}

      {/* Sold‑out ribbon */}
      {isSoldOut && <div className={styles.soldOut}>Sold&nbsp;out</div>}

      {/* Product photo */}
      <div className={styles.photo}>
        {item.image && (
          <Image
            src={item.image}
            alt={item.title}
            width={300}
            height={300}
            className={styles.itemImage}
            placeholder="empty"      /* change to 'blur' if you add a blurDataURL */
            unoptimized              /* keeping the original behaviour */
          />
        )}
      </div>

      {/* Details */}
      <div className={styles.details}>
        <h4 className={styles.title}>
          {item.title}{" "}
          {/* 🌶️ indicator */}
          {item.hasSpiceLevel && <span className={styles.spicy}>🌶️</span>}
        </h4>

        {item.description && (
          <p className={styles.description}>{item.description}</p>
        )}

        <h5 className={styles.price}>
          ${parseFloat(String(item.price)).toFixed(2)}
        </h5>

        {/* CTA or disabled text */}
        {allowAddToCart ? (
          <button
            className={styles.btnAddToCart}
            onClick={handleAddClick}
            disabled={isSoldOut}
          >
            {isSoldOut ? "Unavailable" : "Start Order"}
          </button>
        ) : (
          <p className={styles.textMuted}>In‑restaurant purchase only</p>
        )}
      </div>
    </div>
  );
}
