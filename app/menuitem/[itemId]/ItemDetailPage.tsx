"use client";

import React, { useState, useEffect, useContext } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import styles from "./ItemDetailPage.module.css";

import { CartContext } from "@/contexts/CartContext";

// Data types from menuData
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

// Drink interface for recommended items
interface Drink {
  id: number;
  title: string;
  image: string;
  price: number;
}

// Props for ItemDetailPage
interface ItemDetailPageProps {
  item: MenuItem;
  recommendedDrinks?: Drink[];
  // Additional items as full MenuItem objects
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

  // Main item states
  const [quantity, setQuantity] = useState<number>(1);
  const [spiceLevel, setSpiceLevel] = useState<string>("No Spice");
  const [specialInstructions, setSpecialInstructions] = useState<string>("");

  // Selected accompaniments for the main item
  const [selectedAccompaniments, setSelectedAccompaniments] = useState<{
    [groupId: string]: Accompaniment[];
  }>(() => {
    if (item.accompanimentGroups) {
      const initGroups: { [key: string]: Accompaniment[] } = {};
      item.accompanimentGroups.forEach((g) => {
        initGroups[g.id] = [];
      });
      return initGroups;
    }
    return {};
  });

  // Toast for desktop feedback
  const [showToast, setShowToast] = useState(false);

  // Additional items (dessert, snack, soft drink) selected from dropdowns
  const [selectedDessertId, setSelectedDessertId] = useState<string>("");
  const [selectedSnackId, setSelectedSnackId] = useState<string>("");
  const [selectedSoftDrinkId, setSelectedSoftDrinkId] = useState<string>("");

  useEffect(() => {
    // Reset all states when the main item changes
    setQuantity(1);
    setSpiceLevel("No Spice");
    setSpecialInstructions("");
    setSelectedDessertId("");
    setSelectedSnackId("");
    setSelectedSoftDrinkId("");

    if (item.accompanimentGroups) {
      const fresh: { [key: string]: Accompaniment[] } = {};
      item.accompanimentGroups.forEach((g) => {
        fresh[g.id] = [];
      });
      setSelectedAccompaniments(fresh);
    } else {
      setSelectedAccompaniments({});
    }
  }, [item]);

  /** Handle checkbox changes for sides / extras. */
  function handleAccompanimentChange(
    groupId: string,
    option: Accompaniment,
    checked: boolean,
    maxSelections: number
  ) {
    setSelectedAccompaniments((prev) => {
      const current = prev[groupId] || [];
      if (checked) {
        // If only 1 selection is allowed, overwrite
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
        // Uncheck => remove from array
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

  /** Calculate total cost of main item + accompaniments, multiplied by quantity */
  function calculateTotalPrice() {
    let total = item.price;
    Object.values(selectedAccompaniments).forEach((group) =>
      group.forEach((acc) => (total += acc.price))
    );
    return (total * quantity).toFixed(2);
  }

  /** Add items to cart, then handle feedback (toast + redirect on desktop). */
  function handleAddToCart() {
    // 1) Build a main cart item object
    const mainCartItem = {
      id: item.id,                 // numeric
      title: item.title,
      description: item.description,
      price: item.price,
      image: item.image,
      hasSpiceLevel: item.hasSpiceLevel,
      specialInstructions: "",
      spiceLevel: item.hasSpiceLevel ? spiceLevel : undefined,
    };

    // 2) Add the main item to the cart
    addToCart(
      mainCartItem,
      quantity,
      specialInstructions,
      mainCartItem.spiceLevel,
      selectedAccompaniments,
      item.accompanimentGroups || []
    );

    // 3) If user selected a dessert, create a cart item object & add
    if (selectedDessertId) {
      const dessertIdNum = parseInt(selectedDessertId, 10);
      const dessertItem = desserts.find((d) => d.id === dessertIdNum);
      if (dessertItem) {
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

    // 4) If user selected a snack
    if (selectedSnackId) {
      const snackIdNum = parseInt(selectedSnackId, 10);
      const snackItem = snacks.find((s) => s.id === snackIdNum);
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

    // 5) If user selected a soft drink
    if (selectedSoftDrinkId) {
      const softDrinkIdNum = parseInt(selectedSoftDrinkId, 10);
      const softDrinkItem = softDrinks.find((d) => d.id === softDrinkIdNum);
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

    // 6) Provide feedback: On mobile, open sidebar; on desktop, show toast & redirect
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      // On mobile: open the sidebar cart (if not already)
      if (!isSidebarCartOpen) {
        openSidebarCart?.();
      }
    } else {
      // On desktop: show toast, then after 3s, hide toast & redirect
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        router.push("/menu");
      }, 3000);
    }
  }

  /** Handle "Back to Menu" button */
  function handleBackToMenu() {
    router.push("/menu");
  }

  return (
    <div className={styles.detailPageContainer}>
      <div className={styles.mainContent}>
        {/* Left side: Item image */}
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

        {/* Right side: Details */}
        <div className={styles.infoContainer}>
          <h1 className={styles.itemTitle}>{item.title}</h1>
          <p className={styles.itemDescription}>{item.description}</p>

          {/* Accompaniment Groups */}
          {item.accompanimentGroups &&
            item.accompanimentGroups.map((group) => {
              const groupSelection = selectedAccompaniments[group.id] || [];
              return (
                <div key={group.id} className={styles.accompanimentGroup}>
                  <h4 className={styles.groupTitle}>
                    {group.label} (Max {group.maxSelections})
                  </h4>
                  <div className={styles.options}>
                    {group.options.map((option) => {
                      const isSelected = groupSelection.some(
                        (a) => a.id === option.id
                      );
                      const disableCheckbox =
                        !isSelected && groupSelection.length >= group.maxSelections;
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

          {/* Spice Level (Only if item.hasSpiceLevel is true) */}
          {item.hasSpiceLevel && (
            <div className={styles.spiceLevelContainer}>
              <label className={styles.spiceLabel}>Choose Spice Level:</label>
              <div className={styles.spiceOptions}>
                {["No Spice", "Mild", "Medium", "Hot"].map((level) => (
                  <button
                    key={level}
                    onClick={() => setSpiceLevel(level)}
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

          {/* Additional Items */}
          <div className={styles.additionalItemsSection}>
            <h3 className={styles.additionalItemsHeading}>Additional Items</h3>

            {/* Desserts */}
            <div className={styles.additionalCategory}>
              <p className={styles.categoryTitle}>Desserts</p>
              <div className={styles.selectWrapper}>
                <select
                  value={selectedDessertId}
                  onChange={(e) => setSelectedDessertId(e.target.value)}
                  className={styles.categorySelect}
                >
                  <option value="">-No Thanks-</option>
                  {desserts.map((dessert) => (
                    <option key={dessert.id} value={dessert.id.toString()}>
                      {dessert.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Snacks */}
            <div className={styles.additionalCategory}>
              <p className={styles.categoryTitle}>Snacks</p>
              <div className={styles.selectWrapper}>
                <select
                  value={selectedSnackId}
                  onChange={(e) => setSelectedSnackId(e.target.value)}
                  className={styles.categorySelect}
                >
                  <option value="">-No Thanks-</option>
                  {snacks.map((snack) => (
                    <option key={snack.id} value={snack.id.toString()}>
                      {snack.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Soft Drinks */}
            <div className={styles.additionalCategory}>
              <p className={styles.categoryTitle}>Soft Drinks</p>
              <div className={styles.selectWrapper}>
                <select
                  value={selectedSoftDrinkId}
                  onChange={(e) => setSelectedSoftDrinkId(e.target.value)}
                  className={styles.categorySelect}
                >
                  <option value="">-No Thanks-</option>
                  {softDrinks.map((drink) => (
                    <option key={drink.id} value={drink.id.toString()}>
                      {drink.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Buttons Row */}
          <div className={styles.buttonsRow}>
            <div className={styles.cartActions}>
              <div className={styles.totalPrice}>
                Total Price: ${calculateTotalPrice()}
              </div>
              <button className={styles.btnAddToCart} onClick={handleAddToCart}>
                Add to Cart
              </button>
            </div>
            <button
              type="button"
              className={styles.btnBackToMenu}
              onClick={handleBackToMenu}
            >
              Back to Menu
            </button>
          </div>
        </div>
      </div>

      {/* Recommended Drinks */}
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

      {/* Desktop Toast */}
      {showToast && (
        <div className={styles.toastNotification}>
          <div className={styles.toastContent}>Item added to cart!</div>
        </div>
      )}
    </div>
  );
}
