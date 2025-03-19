"use client";

import React, { useState, useEffect, useContext } from "react";
import Image from "next/image";
import styles from "./ItemDetailPage.module.css";

import { CartContext } from "@/contexts/CartContext";
import { MenuItem, Accompaniment, AccompanimentGroup } from "@/utils/types";

interface Drink {
  id: number | string;
  title: string;
  image: string;
  price: number;
}

// Helper to deep-clone accompaniments, same as before
function deepCloneSelections(
  selections: { [groupId: string]: Accompaniment[] }
): { [groupId: string]: Accompaniment[] } {
  return JSON.parse(JSON.stringify(selections));
}

interface ItemDetailPageProps {
  item: MenuItem;             // The menu item data
  recommendedDrinks?: Drink[]; // Optional recommended drinks
}

export default function ItemDetailPage({
  item,
  recommendedDrinks = [],
}: ItemDetailPageProps) {
  const [quantity, setQuantity] = useState<number>(1);
  const [specialInstructions, setSpecialInstructions] = useState<string>("");
  const [spiceLevel, setSpiceLevel] = useState<string>("");

  // Keep the same "toast" logic you had in the modal
  const [showToast, setShowToast] = useState<boolean>(false);

  // Initialize selectedAccompaniments
  const initialSelections: { [groupId: string]: Accompaniment[] } =
    item.selectedAccompaniments
      ? deepCloneSelections(item.selectedAccompaniments)
      : {};

  const [selectedAccompaniments, setSelectedAccompaniments] = useState<{
    [groupId: string]: Accompaniment[];
  }>(initialSelections);

  // Access your CartContext
  const { addToCart, isSidebarCartOpen, openSidebarCart } = useContext(CartContext)!;

  // Optional: If your old modal had "onClose" or body scroll locking, remove it here.
  // This is a full page now, so no "body.style.overflow" or "overlay" needed.

  // If your item prop changes, re-init the accompaniments (rare but included here):
  useEffect(() => {
    if (item?.selectedAccompaniments) {
      setSelectedAccompaniments(deepCloneSelections(item.selectedAccompaniments));
    } else {
      setSelectedAccompaniments({});
    }
    setQuantity(1);
    setSpecialInstructions("");
    setSpiceLevel("");
  }, [item]);

  // Build the base item object (similar to your old "baseItem" approach)
  const baseItem = {
    id: item.id,
    title: item.title,
    description: item.description,
    price: item.price,
    image: item.image,
    hasSpiceLevel: item.hasSpiceLevel,
    specialInstructions: "",
    spiceLevel: item.hasSpiceLevel ? null : undefined,
  };

  function handleQuantityIncrease() {
    setQuantity((prev) => prev + 1);
  }

  function handleQuantityDecrease() {
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1));
  }

  function handleAccompanimentChange(
    groupId: string,
    option: Accompaniment,
    isChecked: boolean,
    maxSelections: number
  ) {
    setSelectedAccompaniments((prev) => {
      const currentSelections = prev[groupId] || [];
      if (isChecked) {
        if (maxSelections === 1) {
          // Only one allowed -> overwrite selection
          return { ...prev, [groupId]: [option] };
        } else {
          // If multiple allowed, just push if we haven't hit the limit
          if (currentSelections.length < maxSelections) {
            return { ...prev, [groupId]: [...currentSelections, option] };
          } else {
            alert(
              `You can only select up to ${maxSelections} option${
                maxSelections > 1 ? "s" : ""
              } in this category.`
            );
            return prev;
          }
        }
      } else {
        // Unchecked -> remove from selected
        return {
          ...prev,
          [groupId]: currentSelections.filter((a) => a.id !== option.id),
        };
      }
    });
  }

  function calculateTotalPrice() {
    let total = item.price;
    Object.values(selectedAccompaniments).forEach((groupSelections) => {
      groupSelections.forEach((acc) => {
        total += acc.price;
      });
    });
    return (total * quantity).toFixed(2);
  }

  function handleAddToCart() {
    addToCart(
      baseItem,
      quantity,
      specialInstructions,
      item.hasSpiceLevel ? spiceLevel || null : null,
      selectedAccompaniments,
      item.accompanimentGroups || []
    );

    // Same mobile vs. desktop logic from your old DetailedItemView:
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      // On mobile: open the cart immediately
      if (!isSidebarCartOpen) {
        openSidebarCart?.();
      }
      // Optionally navigate away or keep them on the same page.
      // For a full page, often you keep them here or show a message.
    } else {
      // On desktop: show a toast for 2 seconds
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 2000);
    }
  }

  return (
    <div className={styles.itemDetailPage}>
      {/* Title, Description */}
      <div className={styles.headerSection}>
        <h1>{item.title}</h1>
        <p>{item.description}</p>
      </div>

      {/* Item Image */}
      <div className={styles.imageSection}>
        {item.image && (
          <Image
            src={item.image}
            alt={item.title}
            width={300}
            height={300}
            unoptimized
          />
        )}
      </div>

      {/* Accompaniment Groups, if any */}
      {item.accompanimentGroups && item.accompanimentGroups.length > 0 && (
        <div className={styles.accompanimentGroups}>
          {item.accompanimentGroups.map((group) => {
            const groupSelections = selectedAccompaniments[group.id] || [];
            return (
              <div key={group.id} className={styles.accompanimentGroup}>
                <h4>
                  {group.label} (Max {group.maxSelections})
                </h4>
                {group.options.map((option) => {
                  const isSelected = groupSelections.some((a) => a.id === option.id);
                  const disableCheckbox =
                    !isSelected && groupSelections.length >= group.maxSelections;

                  return (
                    <div key={option.id} className={styles.accompanimentOption}>
                      <label>
                        <input
                          type="checkbox"
                          value={option.id}
                          checked={isSelected}
                          disabled={disableCheckbox}
                          onChange={(e) =>
                            handleAccompanimentChange(
                              group.id,
                              option,
                              e.target.checked,
                              group.maxSelections
                            )
                          }
                        />
                        {option.name} (+${option.price.toFixed(2)})
                      </label>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Spice Level (if item.hasSpiceLevel) */}
      {item.hasSpiceLevel && (
        <div className={styles.spiceLevelSelector}>
          <label>Choose Spice Level:</label>
          <div className={styles.spiceOptions}>
            {["No Spice", "Mild", "Medium", "Hot"].map((level) => (
              <button
                key={level}
                className={
                  spiceLevel === level
                    ? styles.btnSelected
                    : styles.btnOutline
                }
                onClick={() => setSpiceLevel(level)}
                aria-pressed={spiceLevel === level}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quantity Selector */}
      <div className={styles.quantitySelector}>
        <label>Quantity:</label>
        <div className={styles.quantityControls}>
          <button onClick={handleQuantityDecrease} aria-label="Decrease Quantity">
            –
          </button>
          <span className={styles.quantityDisplay}>{quantity}</span>
          <button onClick={handleQuantityIncrease} aria-label="Increase Quantity">
            +
          </button>
        </div>
      </div>

      {/* Special Instructions */}
      <div className={styles.specialInstructions}>
        <label htmlFor="specialInstructions">Special Instructions:</label>
        <textarea
          id="specialInstructions"
          maxLength={500}
          value={specialInstructions}
          onChange={(e) => setSpecialInstructions(e.target.value)}
          placeholder="Add any special requests or dietary restrictions here."
        ></textarea>
      </div>

      {/* Recommended Drinks (optional) */}
      {recommendedDrinks.length > 0 && (
        <div className={styles.recommendations}>
          <h3>Suggested Drinks</h3>
          <div className={styles.drinkList}>
            {recommendedDrinks.map((drink) => (
              <div key={drink.id} className={styles.drinkItem}>
                <Image
                  src={drink.image}
                  alt={drink.title}
                  width={80}
                  height={80}
                  unoptimized
                />
                <p>{drink.title}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Bar */}
      <div className={styles.bottomBar}>
        <h4>Total Price: ${calculateTotalPrice()}</h4>
        <button className={styles.btnAddToCart} onClick={handleAddToCart}>
          Add to Cart
        </button>
      </div>

      {/* Toast Notification (Desktop) */}
      {showToast && (
        <div className={styles.toastNotification}>
          Item added to cart!
        </div>
      )}
    </div>
  );
}
