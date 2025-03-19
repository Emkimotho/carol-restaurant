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

function deepCloneSelections(
  selections: { [groupId: string]: Accompaniment[] }
): { [groupId: string]: Accompaniment[] } {
  return JSON.parse(JSON.stringify(selections));
}

interface ItemDetailPageProps {
  item: MenuItem;              // From your menuData or server fetch
  recommendedDrinks?: Drink[]; // Optional
}

export default function ItemDetailPage({
  item,
  recommendedDrinks = [],
}: ItemDetailPageProps) {
  // Basic states
  const [quantity, setQuantity] = useState<number>(1);
  const [specialInstructions, setSpecialInstructions] = useState<string>("");
  const [spiceLevel, setSpiceLevel] = useState<string>("");

  // Toast notification state (shown on desktop after Add to Cart)
  const [showToast, setShowToast] = useState<boolean>(false);

  // Initialize accompaniments
  const initialSelections: { [groupId: string]: Accompaniment[] } =
    item.selectedAccompaniments
      ? deepCloneSelections(item.selectedAccompaniments)
      : {};
  const [selectedAccompaniments, setSelectedAccompaniments] = useState<{
    [groupId: string]: Accompaniment[];
  }>(initialSelections);

  // Access cart context
  const {
    addToCart,
    isSidebarCartOpen,
    openSidebarCart,
  } = useContext(CartContext)!;

  // (Re)initialize these states if the passed "item" changes
  useEffect(() => {
    if (item.selectedAccompaniments) {
      setSelectedAccompaniments(deepCloneSelections(item.selectedAccompaniments));
    } else {
      setSelectedAccompaniments({});
    }
    setQuantity(1);
    setSpiceLevel("");
    setSpecialInstructions("");
  }, [item]);

  // Helper to handle checking/unchecking of accompaniment groups
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
          return { ...prev, [groupId]: [option] };
        } else {
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
        return {
          ...prev,
          [groupId]: currentSelections.filter((a) => a.id !== option.id),
        };
      }
    });
  }

  // Helpers for quantity
  function handleQuantityIncrease() {
    setQuantity((prev) => prev + 1);
  }
  function handleQuantityDecrease() {
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1));
  }

  // Calculate total
  function calculateTotalPrice() {
    let total = item.price;
    Object.values(selectedAccompaniments).forEach((group) => {
      group.forEach((acc) => {
        total += acc.price;
      });
    });
    return (total * quantity).toFixed(2);
  }

  // Add to Cart
  function handleAddToCart() {
    // Build the minimal item object
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

    addToCart(
      baseItem,
      quantity,
      specialInstructions,
      item.hasSpiceLevel ? spiceLevel || null : null,
      selectedAccompaniments,
      item.accompanimentGroups || []
    );

    // On mobile (<768px): open the cart
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      if (!isSidebarCartOpen) {
        openSidebarCart?.();
      }
      // We can remain on the page or show a small message
      // For a full page approach, maybe just do nothing
    } else {
      // On desktop: show a toast message for a couple seconds
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
      }, 2000);
    }
  }

  return (
    <div className={styles.detailPageContainer}>
      {/* Item Title and Description */}
      <div className={styles.headerSection}>
        <h1>{item.title}</h1>
        <p>{item.description}</p>
      </div>

      {/* Item Image */}
      {item.image && (
        <div className={styles.imageSection}>
          <Image
            src={item.image}
            alt={item.title}
            width={300}
            height={200}
            unoptimized
          />
        </div>
      )}

      {/* Accompaniment Groups */}
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
                  const isSelected = groupSelections.some(
                    (a) => a.id === option.id
                  );
                  const disableCheckbox =
                    !isSelected && groupSelections.length >= group.maxSelections;

                  return (
                    <div key={option.id} className={styles.accompanimentOption}>
                      <label>
                        <input
                          type="checkbox"
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

      {/* Spice Level (if applicable) */}
      {item.hasSpiceLevel && (
        <div className={styles.spiceLevelSelector}>
          <label>Choose Spice Level:</label>
          <div className={styles.spiceOptions}>
            {["No Spice", "Mild", "Medium", "Hot"].map((level) => (
              <button
                key={level}
                onClick={() => setSpiceLevel(level)}
                aria-pressed={spiceLevel === level}
                className={
                  spiceLevel === level
                    ? styles.btnSelected
                    : styles.btnOutline
                }
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
          <button onClick={handleQuantityDecrease}>-</button>
          <span>{quantity}</span>
          <button onClick={handleQuantityIncrease}>+</button>
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
          placeholder="Add dietary restrictions, no onions, extra sauce, etc."
        />
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

      {/* Toast Notification (desktop) */}
      {showToast && (
        <div className={styles.toastNotification}>
          Item added to cart!
        </div>
      )}
    </div>
  );
}
