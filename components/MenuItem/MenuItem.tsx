"use client";

import React, { useContext } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import styles from "./MenuItem.module.css";

// Contexts
import { CartContext } from "@/contexts/CartContext";
import { OrderContext } from "@/contexts/OrderContext";

// Types
import type { MenuItem } from "@/utils/types";

interface MenuItemProps {
  item: MenuItem;
  user: any;
  openSidebarCart: () => void;
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
  const { order } = useContext(OrderContext)!;

  // For the "restaurant closed" scheduling popup.
  const [showChoicePopup, setShowChoicePopup] = React.useState(false);

  function handleAddClick() {
    if (!allowAddToCart) {
      console.warn("[MenuItem] This item cannot be added to cart.");
      return;
    }
    // Navigate to the detail page.
    router.push(`/menuitem/${item.id}`);
  }

  function proceedASAP() {
    setShowChoicePopup(false);
    if (!restaurantOpen) {
      window.location.href = "/schedule-order";
      return;
    }
    router.push(`/menuitem/${item.id}`);
  }

  function proceedSchedule() {
    setShowChoicePopup(false);
    window.location.href = "/schedule-order";
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
      {showChoicePopup && (
        <div className={styles.orderChoiceOverlay}>
          <div className={styles.orderChoiceModal}>
            {restaurantOpen ? (
              <>
                <h3>Choose Your Order Timing</h3>
                <p>
                  Order instantly (ASAP) or schedule for later—pickup/delivery is set at checkout.
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
                <p>Schedule for later or come back during operating hours.</p>
                <div className={styles.orderChoiceButtons}>
                  <button className={styles.btnChoice} onClick={proceedSchedule}>
                    Schedule for Later
                  </button>
                </div>
              </>
            )}
            <button className={styles.btnCloseChoice} onClick={() => setShowChoicePopup(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
