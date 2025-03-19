"use client";

import React, { useState, useContext } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import styles from "./MenuItem.module.css";

// Contexts
import { CartContext } from "@/contexts/CartContext";
import { OrderContext } from "@/contexts/OrderContext";

// Types
import { MenuItem as MenuItemType } from "@/utils/types";

interface MenuItemProps {
  item: MenuItemType;
  user: any;
  openSidebarCart: () => void;      // If you still need it
  allowAddToCart: boolean;
  restaurantOpen: boolean;
}

export default function MenuItem({
  item,
  user,
  openSidebarCart,
  allowAddToCart,
  restaurantOpen,
}: MenuItemProps) {
  const router = useRouter();
  const { addToCart } = useContext(CartContext)!;
  const { order } = useContext(OrderContext)!;

  // Local states to control the timing popup.
  const [showChoicePopup, setShowChoicePopup] = useState(false);

  // Handle the Add-to-Cart click event.
  const handleAddClick = () => {
    console.log("[MenuItem] Add to Cart clicked for:", item.title);

    if (!allowAddToCart) {
      console.warn("[MenuItem] Adding to cart not allowed for this item.");
      return;
    }

    // If user already scheduled an order or the restaurant is open,
    // go straight to the item detail page so they can customize & add to cart.
    if (order.schedule || restaurantOpen) {
      console.log("[MenuItem] Going to detail page for item:", item.id);
      router.push(`/menu/${item.id}`);
    } else {
      // Otherwise, the restaurant is closed & no schedule is set:
      // Show a popup letting user pick ASAP or Schedule
      console.log("[MenuItem] Restaurant closed, showing timing popup.");
      setShowChoicePopup(true);
    }
  };

  // Proceed with ASAP order.
  const proceedASAP = () => {
    console.log("[MenuItem] User chose ASAP ordering");
    setShowChoicePopup(false);

    // If the restaurant truly isn’t open, direct to scheduling page.
    if (!restaurantOpen) {
      console.log("[MenuItem] Restaurant is closed -> schedule order page.");
      window.location.href = "/schedule-order";
      return;
    }
    // Otherwise navigate to item detail
    router.push(`/menu/${item.id}`);
  };

  // Proceed with scheduling order.
  const proceedSchedule = () => {
    console.log("[MenuItem] User chose schedule ordering");
    setShowChoicePopup(false);
    window.location.href = "/schedule-order";
  };

  return (
    <div className={styles.container}>
      {/* Item Image */}
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

      {/* Basic Details */}
      <div className={styles.details}>
        <h4 className={styles.title}>{item.title}</h4>
        <p className={styles.description}>{item.description}</p>
        <h5 className={styles.price}>
          ${parseFloat(String(item.price)).toFixed(2)}
        </h5>

        {/* Button or "In-restaurant only" */}
        {allowAddToCart ? (
          <button className={styles.btnAddToCart} onClick={handleAddClick}>
            Add to Cart
          </button>
        ) : (
          <p className={styles.textMuted}>In-restaurant purchase only</p>
        )}
      </div>

      {/* Popup for choosing schedule vs. ASAP when closed */}
      {showChoicePopup && (
        <div className={styles.orderChoiceOverlay}>
          <div className={styles.orderChoiceModal}>
            {restaurantOpen ? (
              <>
                <h3>Choose Your Order Timing</h3>
                <p>
                  Order instantly (ASAP) or schedule for later—delivery or pickup options are set at checkout.
                </p>
                <div className={styles.orderChoiceButtons}>
                  <button className={styles.btnChoice} onClick={proceedASAP}>
                    ASAP Order
                  </button>
                  <button className={styles.btnChoice} onClick={proceedSchedule}>
                    Schedule for Later
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3>We&apos;re Closed</h3>
                <p>You can schedule your order for later or come back when we’re open.</p>
                <div className={styles.orderChoiceButtons}>
                  <button className={styles.btnChoice} onClick={proceedSchedule}>
                    Schedule for Later
                  </button>
                </div>
              </>
            )}
            <button
              className={styles.btnCloseChoice}
              onClick={() => setShowChoicePopup(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
