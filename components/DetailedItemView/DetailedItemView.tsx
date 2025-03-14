"use client";

import React, { useState, useEffect, useContext } from "react";
import styles from "./DetailedItemView.module.css";
import { MenuItem, Accompaniment, AccompanimentGroup } from "../../utils/types";
import { CartContext } from "@/contexts/CartContext";

interface Drink {
  id: number | string;
  title: string;
  image: string;
  price: number;
}

interface DetailedItemViewProps {
  item: MenuItem;
  onClose: () => void;
  addToCart: (
    item: Omit<
      import("../../utils/types").CartItem,
      "cartItemId" | "quantity" | "selectedAccompaniments" | "availableAccompanimentGroups"
    >,
    quantity: number,
    specialInstructions: string,
    spiceLevel: string | null,
    selectedAccompaniments: { [groupId: string]: Accompaniment[] },
    availableAccompanimentGroups: AccompanimentGroup[]
  ) => void;
  openSidebarCart: () => void;
  recommendedDrinks?: Drink[];
}

function deepCloneSelections(
  selections: { [groupId: string]: Accompaniment[] }
): { [groupId: string]: Accompaniment[] } {
  return JSON.parse(JSON.stringify(selections));
}

const DetailedItemView: React.FC<DetailedItemViewProps> = ({
  item,
  onClose,
  addToCart,
  openSidebarCart,
  recommendedDrinks = []
}) => {
  // Default quantity is 1 and no spice level selected
  const [quantity, setQuantity] = useState<number>(1);
  const [specialInstructions, setSpecialInstructions] = useState<string>("");
  const [spiceLevel, setSpiceLevel] = useState<string>(""); // no default selection
  const [selectedAccompaniments, setSelectedAccompaniments] = useState<{ [groupId: string]: Accompaniment[] }>(
    item.selectedAccompaniments ? deepCloneSelections(item.selectedAccompaniments) : {}
  );

  const { isSidebarCartOpen } = useContext(CartContext)!;

  // Lock body scrolling when the modal is open.
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  // Reinitialize accompaniments when the item prop changes.
  useEffect(() => {
    setSelectedAccompaniments(
      item.selectedAccompaniments ? deepCloneSelections(item.selectedAccompaniments) : {}
    );
  }, [item]);

  // Inline style for the overlay.
  const overlayStyle: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0,0,0,0.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1100,
  };

  // Base item object for addToCart.
  const baseItem = {
    id: item.id,
    title: item.title,
    description: item.description,
    price: item.price,
    image: item.image,
    hasSpiceLevel: item.hasSpiceLevel,
  };

  const handleAddToCart = () => {
    addToCart(
      baseItem,
      quantity,
      specialInstructions,
      item.hasSpiceLevel ? (spiceLevel || null) : null,
      selectedAccompaniments,
      item.accompanimentGroups || []
    );
    onClose();
    if (!isSidebarCartOpen) {
      openSidebarCart();
    }
  };

  const handleQuantityIncrease = () => setQuantity(prev => prev + 1);
  const handleQuantityDecrease = () => setQuantity(prev => (prev > 1 ? prev - 1 : 1));

  // Update selections and enforce maximum rules.
  const handleAccompanimentChange = (
    groupId: string,
    option: Accompaniment,
    isChecked: boolean,
    maxSelections: number
  ) => {
    setSelectedAccompaniments(prev => {
      const currentSelections = prev[groupId] || [];
      if (isChecked) {
        if (maxSelections === 1) {
          return { ...prev, [groupId]: [option] };
        } else {
          if (currentSelections.length < maxSelections) {
            return { ...prev, [groupId]: [...currentSelections, option] };
          } else {
            alert(`You can only select up to ${maxSelections} option${maxSelections > 1 ? "s" : ""} in this category.`);
            return prev;
          }
        }
      } else {
        return { ...prev, [groupId]: currentSelections.filter(a => a.id !== option.id) };
      }
    });
  };

  const calculateTotalPrice = () => {
    let total = item.price;
    Object.values(selectedAccompaniments).forEach(groupSelections => {
      if (Array.isArray(groupSelections)) {
        groupSelections.forEach(acc => {
          total += acc.price;
        });
      }
    });
    return (total * quantity).toFixed(2);
  };

  return (
    <div style={overlayStyle} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.detailedItemView} onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className={styles.closeButton} onClick={onClose} aria-label="Close Modal">
          &times;
        </button>

        {/* Header with Item Details and Icon */}
        <div className={styles.header}>
          <div className={styles.itemDetailsHeader}>
            <h2>{item.title}</h2>
            <p>{item.description}</p>
          </div>
          <div className={styles.itemIcon}>
            <img src={item.image} alt={item.title} />
          </div>
        </div>

        {/* Scrollable Content */}
        <div className={styles.content}>
          {/* Accompaniment Groups */}
          {item.accompanimentGroups && item.accompanimentGroups.length > 0 && (
            <div className={styles.accompanimentGroups}>
              {item.accompanimentGroups.map(group => {
                const groupSelections = selectedAccompaniments[group.id] || [];
                return (
                  <div key={group.id} className={styles.accompanimentGroup}>
                    <h4>{group.label} (Max {group.maxSelections})</h4>
                    {group.options.map(option => {
                      const isSelected = groupSelections.some(a => a.id === option.id);
                      const disableCheckbox = !isSelected && groupSelections.length >= group.maxSelections;
                      return (
                        <div key={option.id} className={styles.accompanimentOption}>
                          <label>
                            <input
                              type="checkbox"
                              value={option.id}
                              checked={isSelected}
                              disabled={disableCheckbox}
                              onChange={(e) =>
                                handleAccompanimentChange(group.id, option, e.target.checked, group.maxSelections)
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

          {/* Spice Level Selector */}
          {item.hasSpiceLevel && (
            <div className={styles.spiceLevelSelector}>
              <label>Choose Spice Level:</label>
              <div className={styles.spiceOptions}>
                {["No Spice", "Mild", "Medium", "Hot"].map(level => (
                  <button
                    key={level}
                    className={`${styles.btn} ${spiceLevel === level ? styles.btnSelected : styles.btnOutline}`}
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
              <button
                onClick={handleQuantityDecrease}
                className={`${styles.btn} ${styles.btnDecrease}`}
                aria-label="Decrease Quantity"
              >
                –
              </button>
              <span className={styles.quantityDisplay}>{quantity}</span>
              <button
                onClick={handleQuantityIncrease}
                className={`${styles.btn} ${styles.btnIncrease}`}
                aria-label="Increase Quantity"
              >
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

          {/* Suggested Drinks Section */}
          {recommendedDrinks && recommendedDrinks.length > 0 && (
            <div className={styles.recommendations}>
              <h3>Suggested Drinks</h3>
              <div className={styles.drinkList}>
                {recommendedDrinks.map(drink => (
                  <div key={drink.id} className={styles.drinkItem}>
                    <img src={drink.image} alt={drink.title} />
                    <p>{drink.title}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Bar */}
        <div className={styles.bottomBar}>
          <h4>Total Price: ${calculateTotalPrice()}</h4>
          <button className={styles.btnAddToCart} onClick={handleAddToCart}>
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};

export default DetailedItemView;
