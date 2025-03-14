"use client";

import React, { useState, useContext } from "react";
import dynamic from "next/dynamic";
import styles from "./MenuItem.module.css";

// Contexts
import { CartContext } from "@/contexts/CartContext";
import { OrderContext } from "@/contexts/OrderContext";

// Types
import { MenuItem as MenuItemType } from "@/utils/types";

const DynamicDetailedView = dynamic(
  () => import("@/components/DetailedItemView/DetailedItemView"),
  { ssr: false }
);

interface MenuItemProps {
  item: MenuItemType;
  user: any;
  openSidebarCart: () => void;
  allowAddToCart: boolean;
  restaurantOpen: boolean; // provided from parent: true if open, false if closed
}

export default function MenuItem({
  item,
  user,
  openSidebarCart,
  allowAddToCart,
  restaurantOpen,
}: MenuItemProps) {
  const { addToCart } = useContext(CartContext)!;
  const { order } = useContext(OrderContext)!;

  // Local states
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [showChoicePopup, setShowChoicePopup] = useState(false);

  /**
   * handleAddClick
   * - If an order is already scheduled OR the restaurant is open, show the detailed view.
   * - Otherwise (restaurant closed & no schedule), show the timing popup.
   */
  const handleAddClick = () => {
    console.log("[MenuItem] Add to Cart clicked for item:", item.title);

    if (!allowAddToCart) {
      console.log("[MenuItem] Adding to cart not allowed for this item.");
      return;
    }

    if (order.schedule || restaurantOpen) {
      console.log("[MenuItem] Either already scheduled or restaurant is open. Showing item detail.");
      setShowDetailedView(true);
    } else {
      console.log("[MenuItem] Restaurant closed and no schedule set. Showing timing popup.");
      setShowChoicePopup(true);
    }
  };

  /**
   * proceedASAP
   * - If the restaurant is closed, force scheduling.
   * - Otherwise, show the detailed view.
   */
  const proceedASAP = () => {
    console.log("[MenuItem] User chose ASAP ordering");
    setShowChoicePopup(false);

    if (!restaurantOpen) {
      console.log("[MenuItem] Restaurant is closed -> redirecting to schedule order.");
      window.location.href = "/schedule-order";
      return;
    }
    setShowDetailedView(true);
  };

  /**
   * proceedSchedule
   * Redirect the user to the schedule order page.
   */
  const proceedSchedule = () => {
    console.log("[MenuItem] User chose schedule ordering");
    setShowChoicePopup(false);
    window.location.href = "/schedule-order";
  };

  return (
    <div className={styles.container}>
      <div className={styles.photo}>
        {item.image && <img src={item.image} alt={item.title} />}
      </div>

      <div className={styles.details}>
        <h4 className={styles.title}>{item.title}</h4>
        <p className={styles.description}>{item.description}</p>
        <h5 className={styles.price}>${parseFloat(String(item.price)).toFixed(2)}</h5>

        {allowAddToCart ? (
          <button className={styles.btnAddToCart} onClick={handleAddClick}>
            Add to Cart
          </button>
        ) : (
          <p className={styles.textMuted}>In-restaurant purchase only</p>
        )}
      </div>

      {/* Detailed View */}
      {showDetailedView && (
        <DynamicDetailedView
          item={item}
          onClose={() => setShowDetailedView(false)}
          addToCart={addToCart}
          openSidebarCart={openSidebarCart}
        />
      )}

      {/* Order Timing Popup */}
      {showChoicePopup && (
        <div className={styles.orderChoiceOverlay}>
          <div className={styles.orderChoiceModal}>
            {restaurantOpen ? (
              <>
                <h3>Choose Your Order Timing</h3>
                <p>
                  Order instantly (ASAP) or schedule for later—with delivery or pickup options available at checkout.
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
                <h3>We're Closed</h3>
                <p>
                  You can schedule your order for later or come back during our operating hours.
                </p>
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
