"use client";

import React, { useState, useEffect, useContext } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import styles from "./ItemDetailPage.module.css";

import { CartContext } from "@/contexts/CartContext";

// Data types from your menuData
export interface Accompaniment {
  id: number;
  name: string;
  price: number;
}

export interface AccompanimentGroup {
  id: string;
  label: string;
  maxSelections: number;
  type: "primaryChoice" | "freeAddOns";
  options: Accompaniment[];
}

export interface MenuItem {
  id: number;
  title: string;
  description: string;
  price: number;
  image: string;
  sections: string[];
  category?: string;
  hasSpiceLevel: boolean;
  accompanimentGroups?: AccompanimentGroup[];
}

interface Drink {
  id: number;
  title: string;
  image: string;
  price: number;
}

interface ItemDetailPageProps {
  item: MenuItem;
  recommendedDrinks?: Drink[];
  // Additional items passed as full MenuItem objects.
  desserts?: MenuItem[];
  snacks?: MenuItem[];
  softDrinks?: MenuItem[];
}

export default function ItemDetailPage({
  item,
  recommendedDrinks = [],
  desserts = [],
  snacks = [],
  softDrinks = [],
}: ItemDetailPageProps) {
  const router = useRouter();
  const { addToCart, isSidebarCartOpen, openSidebarCart } =
    useContext(CartContext)!;

  // Local states
  const [quantity, setQuantity] = useState<number>(1);
  // Default spice level to "No Spice"
  const [spiceLevel, setSpiceLevel] = useState<string>("No Spice");
  const [specialInstructions, setSpecialInstructions] = useState<string>("");

  // Manage selections for accompaniment groups
  const [selectedAccompaniments, setSelectedAccompaniments] = useState<{
    [groupId: string]: Accompaniment[];
  }>(() => {
    if (item.accompanimentGroups) {
      const init: { [key: string]: Accompaniment[] } = {};
      item.accompanimentGroups.forEach((group) => {
        init[group.id] = [];
      });
      return init;
    }
    return {};
  });

  // Toast state for desktop feedback
  const [showToast, setShowToast] = useState(false);

  // For additional items, store the selected item ID (number) or null.
  const [selectedDessertId, setSelectedDessertId] = useState<number | null>(null);
  const [selectedSnackId, setSelectedSnackId] = useState<number | null>(null);
  const [selectedSoftDrinkId, setSelectedSoftDrinkId] = useState<number | null>(null);

  useEffect(() => {
    // Reset all selections when the item changes.
    setQuantity(1);
    setSpiceLevel("No Spice");
    setSpecialInstructions("");
    setSelectedDessertId(null);
    setSelectedSnackId(null);
    setSelectedSoftDrinkId(null);
    if (item.accompanimentGroups) {
      const fresh: { [key: string]: Accompaniment[] } = {};
      item.accompanimentGroups.forEach((group) => {
        fresh[group.id] = [];
      });
      setSelectedAccompaniments(fresh);
    } else {
      setSelectedAccompaniments({});
    }
  }, [item]);

  function handleAccompanimentChange(
    groupId: string,
    option: Accompaniment,
    checked: boolean,
    maxSelections: number
  ) {
    setSelectedAccompaniments((prev) => {
      const current = prev[groupId] || [];
      if (checked) {
        if (maxSelections === 1) {
          return { ...prev, [groupId]: [option] };
        } else {
          if (current.length < maxSelections) {
            return { ...prev, [groupId]: [...current, option] };
          } else {
            alert(`You can select up to ${maxSelections} item(s).`);
            return prev;
          }
        }
      } else {
        return { ...prev, [groupId]: current.filter((a) => a.id !== option.id) };
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
    // Build the base item for the cart.
    const baseItem = {
      id: item.id,
      title: item.title,
      description: item.description,
      price: item.price,
      image: item.image,
      hasSpiceLevel: item.hasSpiceLevel,
      specialInstructions: "",
      spiceLevel: item.hasSpiceLevel ? spiceLevel : undefined,
    };

    addToCart(
      baseItem,
      quantity,
      specialInstructions,
      baseItem.spiceLevel,
      selectedAccompaniments,
      item.accompanimentGroups || []
    );

    // For additional items, look them up from the passed arrays and add to cart.
    if (selectedDessertId !== null) {
      const dessertItem = desserts.find((d) => d.id === selectedDessertId);
      if (dessertItem) {
        // Transform dessertItem into a proper cart item.
        const cartDessert = {
          id: dessertItem.id,
          title: dessertItem.title,
          description: dessertItem.description,
          price: dessertItem.price,
          image: dessertItem.image,
          hasSpiceLevel: dessertItem.hasSpiceLevel,
          specialInstructions: "",
          spiceLevel: undefined,
        };
        addToCart(cartDessert, 1, "", null, {}, []);
      }
    }
    if (selectedSnackId !== null) {
      const snackItem = snacks.find((s) => s.id === selectedSnackId);
      if (snackItem) {
        const cartSnack = {
          id: snackItem.id,
          title: snackItem.title,
          description: snackItem.description,
          price: snackItem.price,
          image: snackItem.image,
          hasSpiceLevel: snackItem.hasSpiceLevel,
          specialInstructions: "",
          spiceLevel: undefined,
        };
        addToCart(cartSnack, 1, "", null, {}, []);
      }
    }
    if (selectedSoftDrinkId !== null) {
      const softDrinkItem = softDrinks.find((d) => d.id === selectedSoftDrinkId);
      if (softDrinkItem) {
        const cartSoftDrink = {
          id: softDrinkItem.id,
          title: softDrinkItem.title,
          description: softDrinkItem.description,
          price: softDrinkItem.price,
          image: softDrinkItem.image,
          hasSpiceLevel: softDrinkItem.hasSpiceLevel,
          specialInstructions: "",
          spiceLevel: undefined,
        };
        addToCart(cartSoftDrink, 1, "", null, {}, []);
      }
    }

    // Provide feedback: on mobile open sidebar; on desktop show a toast.
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      if (!isSidebarCartOpen) {
        openSidebarCart?.();
      }
    } else {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  }

  function handleBackToMenu() {
    router.push("/menu");
  }

  return (
    <div className={styles.detailPageContainer}>
      <div className={styles.mainContent}>
        {/* Left Column: Item Image */}
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
        {/* Right Column: Details */}
        <div className={styles.infoContainer}>
          <h1 className={styles.itemTitle}>{item.title}</h1>
          <p className={styles.itemDescription}>{item.description}</p>

          {/* Accompaniment Groups */}
          {item.accompanimentGroups &&
            item.accompanimentGroups.map((group) => {
              const currentSelection = selectedAccompaniments[group.id] || [];
              return (
                <div key={group.id} className={styles.accompanimentGroup}>
                  <h4 className={styles.groupTitle}>
                    {group.label} (Max {group.maxSelections})
                  </h4>
                  <div className={styles.options}>
                    {group.options.map((option) => {
                      const isSelected = currentSelection.some(
                        (a) => a.id === option.id
                      );
                      const disableCheckbox =
                        !isSelected &&
                        currentSelection.length >= group.maxSelections;
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
              );
            })}

          {/* Spice Level */}
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

          {/* Quantity */}
          <div className={styles.quantityContainer}>
            <label className={styles.quantityLabel}>Quantity:</label>
            <div className={styles.quantityControls}>
              <button onClick={handleQuantityDecrease} className={styles.btnCircle}>
                -
              </button>
              <span className={styles.quantityDisplay}>{quantity}</span>
              <button onClick={handleQuantityIncrease} className={styles.btnCircle}>
                +
              </button>
            </div>
          </div>

          {/* Special Instructions */}
          <div className={styles.specialInstructionsContainer}>
            <label htmlFor="specialInstructions" className={styles.instructionsLabel}>
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

          {/* Additional Items Section */}
          <div className={styles.additionalItemsSection}>
            <h3 className={styles.additionalItemsHeading}>Additional Items</h3>
            {/* Desserts Dropdown */}
            <div className={styles.additionalCategory}>
              <p className={styles.categoryTitle}>Desserts</p>
              <div className={styles.selectWrapper}>
                <select
                  value={selectedDessertId ?? ""}
                  onChange={(e) =>
                    setSelectedDessertId(e.target.value ? parseInt(e.target.value, 10) : null)
                  }
                  className={styles.categorySelect}
                >
                  <option value="">Select a Dessert...</option>
                  {desserts.map((dessert) => (
                    <option key={dessert.id} value={dessert.id}>
                      {dessert.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Snacks Dropdown */}
            <div className={styles.additionalCategory}>
              <p className={styles.categoryTitle}>Snacks</p>
              <div className={styles.selectWrapper}>
                <select
                  value={selectedSnackId ?? ""}
                  onChange={(e) =>
                    setSelectedSnackId(e.target.value ? parseInt(e.target.value, 10) : null)
                  }
                  className={styles.categorySelect}
                >
                  <option value="">Select a Snack...</option>
                  {snacks.map((snack) => (
                    <option key={snack.id} value={snack.id}>
                      {snack.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Soft Drinks Dropdown */}
            <div className={styles.additionalCategory}>
              <p className={styles.categoryTitle}>Soft Drinks</p>
              <div className={styles.selectWrapper}>
                <select
                  value={selectedSoftDrinkId ?? ""}
                  onChange={(e) =>
                    setSelectedSoftDrinkId(e.target.value ? parseInt(e.target.value, 10) : null)
                  }
                  className={styles.categorySelect}
                >
                  <option value="">Select a Soft Drink...</option>
                  {softDrinks.map((drink) => (
                    <option key={drink.id} value={drink.id}>
                      {drink.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Buttons Row */}
          <div className={styles.buttonsRow}>
            <button type="button" className={styles.btnBackToMenu} onClick={handleBackToMenu}>
              Back to Menu
            </button>
            <div className={styles.cartActions}>
              <div className={styles.totalPrice}>Total Price: ${calculateTotalPrice()}</div>
              <button className={styles.btnAddToCart} onClick={handleAddToCart}>
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recommended Drinks Section */}
      {recommendedDrinks.length > 0 && (
        <div className={styles.recommendations}>
          <h3 className={styles.recommendationsTitle}>You might also like...</h3>
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

      {/* Desktop Toast Notification */}
      {showToast && (
        <div className={styles.toastNotification}>
          <div className={styles.toastContent}>Item added to cart!</div>
        </div>
      )}
    </div>
  );
}
