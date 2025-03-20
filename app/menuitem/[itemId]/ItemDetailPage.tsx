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

interface ItemDetailPageProps {
  /**
   * The main menu item to display and potentially add to cart.
   */
  item: MenuItem;

  /**
   * Optional array of recommended drinks to display alongside the item.
   */
  recommendedDrinks?: Drink[];
}

/**
 * Creates a deep copy of the given accompaniments object so that modifying
 * it does not affect the original data by reference.
 */
function deepCloneSelections(
  selections: { [groupId: string]: Accompaniment[] }
): { [groupId: string]: Accompaniment[] } {
  return JSON.parse(JSON.stringify(selections));
}

export default function ItemDetailPage({
  item,
  recommendedDrinks = [],
}: ItemDetailPageProps) {
  // Access cart context for adding items & controlling sidebar cart.
  const { addToCart, isSidebarCartOpen, openSidebarCart } = useContext(CartContext)!;

  // Quantity of the item being ordered.
  const [quantity, setQuantity] = useState<number>(1);
  // Selected spice level, if the item supports spice.
  const [spiceLevel, setSpiceLevel] = useState<string>("");
  // Any special instructions the user provides.
  const [specialInstructions, setSpecialInstructions] = useState<string>("");

  // A simple toast message for desktop confirmations.
  const [showToast, setShowToast] = useState<boolean>(false);

  // Initialize or re-initialize the selected accompaniments for this item.
  const initialSelections: { [groupId: string]: Accompaniment[] } =
    item.selectedAccompaniments
      ? deepCloneSelections(item.selectedAccompaniments)
      : {};

  // State that tracks user-chosen accompaniments grouped by groupId.
  const [selectedAccompaniments, setSelectedAccompaniments] = useState<{
    [groupId: string]: Accompaniment[];
  }>(initialSelections);

  /**
   * If the parent `item` object changes for any reason, re-init all the local states.
   */
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

  /**
   * Handles checkbox changes for accompaniments.
   * Ensures we don't exceed the group's max selections.
   */
  function handleAccompanimentChange(
    groupId: string,
    option: Accompaniment,
    isChecked: boolean,
    maxSelections: number
  ) {
    setSelectedAccompaniments((prev) => {
      const currentSelections = prev[groupId] || [];
      if (isChecked) {
        // If only 1 selection is allowed, overwrite.
        if (maxSelections === 1) {
          return { ...prev, [groupId]: [option] };
        } else {
          // If multiple allowed, ensure we don't exceed the max.
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
        // If user unchecks an option, remove it from the array.
        return {
          ...prev,
          [groupId]: currentSelections.filter((a) => a.id !== option.id),
        };
      }
    });
  }

  /**
   * Increase the item quantity by 1.
   */
  function handleQuantityIncrease() {
    setQuantity((prev) => prev + 1);
  }

  /**
   * Decrease the item quantity by 1, but never below 1.
   */
  function handleQuantityDecrease() {
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1));
  }

  /**
   * Calculates the total price, including the base item price
   * plus any accompaniments multiplied by the quantity.
   */
  function calculateTotalPrice() {
    let total = item.price;

    Object.values(selectedAccompaniments).forEach((group) => {
      group.forEach((acc) => {
        total += acc.price;
      });
    });

    return (total * quantity).toFixed(2);
  }

  /**
   * Main function to add the item (with user selections) to the cart.
   * Provides different feedback on mobile vs. desktop.
   */
  function handleAddToCart() {
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

    // Add the item to cart with all selected options.
    addToCart(
      baseItem,
      quantity,
      specialInstructions,
      item.hasSpiceLevel ? (spiceLevel || null) : null,
      selectedAccompaniments,
      item.accompanimentGroups || []
    );

    // If mobile, open the sidebar cart (if not already).
    // If desktop, show a brief toast message.
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      if (!isSidebarCartOpen) {
        openSidebarCart?.();
      }
    } else {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
  }

  return (
    <div className={styles.detailPageContainer}>
      {/* Title & description */}
      <div className={styles.headerSection}>
        <h1>{item.title}</h1>
        <p>{item.description}</p>
      </div>

      {/* Main image */}
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
                    <div
                      key={option.id}
                      className={styles.accompanimentOption}
                    >
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

      {/* Spice level selection (if the item supports spice) */}
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
                  spiceLevel === level ? styles.btnSelected : styles.btnOutline
                }
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quantity */}
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
          placeholder="Extra sauce, no onions, gluten-free, etc."
        />
      </div>

      {/* Recommended drinks (optional) */}
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

      {/* Bottom area with total price and add-to-cart button */}
      <div className={styles.bottomBar}>
        <h4>Total Price: ${calculateTotalPrice()}</h4>
        <button className={styles.btnAddToCart} onClick={handleAddToCart}>
          Add to Cart
        </button>
      </div>

      {/* Toast notification (desktop) */}
      {showToast && (
        <div className={styles.toastNotification}>Item added to cart!</div>
      )}
    </div>
  );
}
