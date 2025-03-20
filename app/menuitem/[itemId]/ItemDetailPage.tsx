"use client";

import React, { useState, useEffect, useContext } from "react";
import Image from "next/image";
import styles from "./ItemDetailPage.module.css";

import { CartContext } from "@/contexts/CartContext";
import { MenuItem, Accompaniment } from "@/utils/types";

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
 * Deep clone a selections object.
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
  const { addToCart, isSidebarCartOpen, openSidebarCart } =
    useContext(CartContext)!;

  // Local states
  const [quantity, setQuantity] = useState<number>(1);
  const [spiceLevel, setSpiceLevel] = useState<string>("");
  const [specialInstructions, setSpecialInstructions] = useState<string>("");
  const [selectedAccompaniments, setSelectedAccompaniments] = useState<{
    [groupId: string]: Accompaniment[];
  }>(
    item.selectedAccompaniments
      ? deepCloneSelections(item.selectedAccompaniments)
      : {}
  );
  const [showToast, setShowToast] = useState<boolean>(false);

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

  function handleQuantityIncrease() {
    setQuantity((prev) => prev + 1);
  }

  function handleQuantityDecrease() {
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1));
  }

  function calculateTotalPrice() {
    let total = item.price;
    Object.values(selectedAccompaniments).forEach((group) => {
      group.forEach((acc) => {
        total += acc.price;
      });
    });
    return (total * quantity).toFixed(2);
  }

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

    // Add the item to cart along with user selections.
    addToCart(
      baseItem,
      quantity,
      specialInstructions,
      item.hasSpiceLevel ? (spiceLevel || null) : null,
      selectedAccompaniments,
      item.accompanimentGroups || []
    );

    // On mobile, open sidebar cart; on desktop, show a toast (with a cool animation)
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      if (!isSidebarCartOpen) {
        openSidebarCart?.();
      }
    } else {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  }

  return (
    <div className={styles.detailPageContainer}>
      <div className={styles.mainContent}>
        {/* Left column – Item image */}
        <div className={styles.imageContainer}>
          {item.image && (
            <Image
              src={item.image}
              alt={item.title}
              width={500}
              height={400}
              unoptimized
              className={styles.itemImage}
            />
          )}
        </div>

        {/* Right column – Details */}
        <div className={styles.infoContainer}>
          <h1 className={styles.itemTitle}>{item.title}</h1>
          <p className={styles.itemDescription}>{item.description}</p>

          {/* Accompaniment Group (Side Options) */}
          {item.accompanimentGroups &&
            item.accompanimentGroups.map((group) => (
              <div key={group.id} className={styles.accompanimentGroup}>
                <h4 className={styles.groupTitle}>
                  {group.label} (Max {group.maxSelections})
                </h4>
                <div className={styles.options}>
                  {group.options.map((option) => {
                    const groupSelections =
                      selectedAccompaniments[group.id] || [];
                    const isSelected = groupSelections.some(
                      (a) => a.id === option.id
                    );
                    const disableCheckbox =
                      !isSelected &&
                      groupSelections.length >= group.maxSelections;
                    return (
                      <div key={option.id} className={styles.optionItem}>
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
              </div>
            ))}

          {/* Spice Level Selection */}
          {item.hasSpiceLevel && (
            <div className={styles.spiceLevelContainer}>
              <label className={styles.spiceLabel}>Choose Spice Level:</label>
              <div className={styles.spiceOptions}>
                {["No Spice", "Mild", "Medium", "Hot"].map((level) => (
                  <button
                    key={level}
                    onClick={() => setSpiceLevel(level)}
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
          <div className={styles.quantityContainer}>
            <label className={styles.quantityLabel}>Quantity:</label>
            <div className={styles.quantityControls}>
              <button
                onClick={handleQuantityDecrease}
                className={styles.btnQuantity}
              >
                -
              </button>
              <span className={styles.quantityDisplay}>{quantity}</span>
              <button
                onClick={handleQuantityIncrease}
                className={styles.btnQuantity}
              >
                +
              </button>
            </div>
          </div>

          {/* Special Instructions */}
          <div className={styles.specialInstructionsContainer}>
            <label
              htmlFor="specialInstructions"
              className={styles.instructionsLabel}
            >
              Special Instructions:
            </label>
            <textarea
              id="specialInstructions"
              maxLength={500}
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Extra sauce, no onions, gluten-free, etc."
              className={styles.instructionsInput}
            />
          </div>

          {/* Bottom row – Total Price & Add-to-Cart */}
          <div className={styles.addToCartContainer}>
            <div className={styles.totalPrice}>
              Total Price: ${calculateTotalPrice()}
            </div>
            <button className={styles.btnAddToCart} onClick={handleAddToCart}>
              Add to Cart
            </button>
          </div>
        </div>
      </div>

      {/* Recommended Drinks Section */}
      {recommendedDrinks.length > 0 && (
        <div className={styles.recommendations}>
          <h3 className={styles.recommendationsTitle}>
            You might also like...
          </h3>
          <div className={styles.drinkList}>
            {recommendedDrinks.map((drink) => (
              <div key={drink.id} className={styles.drinkItem}>
                <Image
                  src={drink.image}
                  alt={drink.title}
                  width={100}
                  height={100}
                  unoptimized
                  className={styles.drinkImage}
                />
                <p className={styles.drinkTitle}>{drink.title}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toast Animation for Desktop */}
      {showToast && (
        <div className={styles.toastNotification}>
          <div className={styles.toastContent}>Item added to cart!</div>
        </div>
      )}
    </div>
  );
}
