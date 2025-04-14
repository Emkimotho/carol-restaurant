"use client";

import React, { useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "react-toastify";
import { CartContext } from "@/contexts/CartContext";
import type {
  CartItem,
  MenuItemOptionGroup,
  MenuOptionChoice,
} from "@/utils/types";
import styles from "./CartPage.module.css";

/** Constants **/
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes

export default function CartPage() {
  const {
    cartItems,
    savedItems,
    removeFromCart,
    updateCartItem,
    clearCart,
    getTotalPrice,
    moveToSaved,
    moveBackToCart,
    removeFromSaved,
  } = useContext(CartContext)!;

  const router = useRouter();

  // State
  const [cartClearedDueToInactivity, setCartClearedDueToInactivity] = useState(false);
  const [recommendedItems, setRecommendedItems] = useState<CartItem[]>([]);

  // Refs
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate total price
  const totalPrice = parseFloat(getTotalPrice().toFixed(2));

  // ---------------------- RECOMMENDATIONS ----------------------
  useEffect(() => {
    async function fetchRecommendations() {
      try {
        let url = "/api/recommendations";
        // If there's a categoryId on the first cart item, pass it
        if (cartItems.length > 0 && (cartItems[0] as any).categoryId) {
          const categoryId = (cartItems[0] as any).categoryId;
          url += `?category=${encodeURIComponent(categoryId)}`;
        }
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch recommendations");

        const data: CartItem[] = await res.json();
        // Filter out items already in the cart
        const filtered = data.filter(
          (rec) => !cartItems.some((ci) => ci.id === rec.id)
        );
        setRecommendedItems(filtered);
      } catch (error) {
        console.error("Error fetching recommendations:", error);
      }
    }
    fetchRecommendations();
  }, [cartItems]);

  // Only take 3 recommended items, then duplicate for a continuous marquee
  const displayedRecs = recommendedItems.slice(0, 3);
  const marqueeRecs = [...displayedRecs, ...displayedRecs];

  // ---------------------- INACTIVITY TIMER ----------------------
  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => {
      clearCart();
      setCartClearedDueToInactivity(true);
      toast.info("Your cart has been cleared due to inactivity.");
    }, INACTIVITY_TIMEOUT);
  };

  useEffect(() => {
    resetInactivityTimer();
    const events = ["click", "keydown", "mousemove", "touchstart"];
    events.forEach((eventName) =>
      window.addEventListener(eventName, resetInactivityTimer)
    );
    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      events.forEach((eventName) =>
        window.removeEventListener(eventName, resetInactivityTimer)
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------- CART OPERATIONS ----------------------
  const handleCheckout = () => {
    router.push("/checkout");
  };

  const handleGoToMenu = () => {
    router.push("/menu");
  };

  // Helper for quantity changes
  const handleQuantityChange = (item: CartItem, newQty: number) => {
    if (newQty < 1) return;
    updateCartItem({ ...item, quantity: newQty });
  };

  // Special instructions/spice changes
  const handleInstructionsChange = (item: CartItem, instructions: string) => {
    updateCartItem({ ...item, specialInstructions: instructions });
  };

  const handleSpiceChange = (item: CartItem, spice: string) => {
    updateCartItem({ ...item, spiceLevel: spice });
  };

  // Handle option changes for item (4 arguments: cartItem, group, choice, checked)
  function handleOptionChange(
    cartItem: CartItem,
    group: MenuItemOptionGroup,
    choice: MenuOptionChoice,
    checked: boolean
  ) {
    const prevSelection = cartItem.selectedOptions?.[group.id] || {
      selectedChoiceIds: [],
      nestedSelections: {},
    };
    let newSelected = [...prevSelection.selectedChoiceIds];

    if (group.optionType === "single-select" || group.optionType === "dropdown") {
      newSelected = checked ? [choice.id] : [];
    } else {
      // multi-select
      if (checked) {
        if (newSelected.length < (group.maxAllowed || Infinity)) {
          newSelected.push(choice.id);
        } else {
          toast.error(`You can select up to ${group.maxAllowed} item(s).`);
        }
      } else {
        newSelected = newSelected.filter((id) => id !== choice.id);
      }
    }

    updateCartItem({
      ...cartItem,
      selectedOptions: {
        ...cartItem.selectedOptions,
        [group.id]: {
          ...prevSelection,
          selectedChoiceIds: newSelected,
        },
      },
    });
  }

  // Handle nested option changes
  function handleNestedOptionChange(
    cartItem: CartItem,
    group: MenuItemOptionGroup,
    parentChoiceId: string,
    nestedChoiceId: string,
    checked: boolean,
    nestedMaxAllowed?: number
  ) {
    const prevSelection = cartItem.selectedOptions?.[group.id] || {
      selectedChoiceIds: [],
      nestedSelections: {},
    };
    const currentNested = prevSelection.nestedSelections[parentChoiceId] || [];
    let newNested = [...currentNested];

    if (checked) {
      if (newNested.length < (nestedMaxAllowed || Infinity)) {
        newNested.push(nestedChoiceId);
      } else {
        toast.error(`You can select up to ${nestedMaxAllowed} nested options.`);
      }
    } else {
      newNested = newNested.filter((id) => id !== nestedChoiceId);
    }

    updateCartItem({
      ...cartItem,
      selectedOptions: {
        ...cartItem.selectedOptions,
        [group.id]: {
          ...prevSelection,
          nestedSelections: {
            ...prevSelection.nestedSelections,
            [parentChoiceId]: newNested,
          },
        },
      },
    });
  }

  // Calculate price for a single cart item, accounting for selected options
  function calculateItemPrice(item: CartItem): number {
    let total = item.price;
    if (item.optionGroups && item.selectedOptions) {
      for (const group of item.optionGroups) {
        const groupState = item.selectedOptions[group.id];
        if (groupState) {
          for (const choice of group.choices) {
            if (groupState.selectedChoiceIds.includes(choice.id)) {
              if (choice.nestedOptionGroup) {
                const nestedSelected = groupState.nestedSelections?.[choice.id] || [];
                for (const nested of choice.nestedOptionGroup.choices) {
                  if (
                    nestedSelected.includes(nested.id) &&
                    nested.priceAdjustment
                  ) {
                    total += nested.priceAdjustment;
                  }
                }
              } else {
                if (choice.priceAdjustment) {
                  total += choice.priceAdjustment;
                }
              }
            }
          }
        }
      }
    }
    return total * (item.quantity || 1);
  }

  // ---------------------- RENDER ----------------------
  // If cart is empty
  if (cartItems.length === 0 && savedItems.length === 0) {
    return (
      <div className={styles.cartContainer}>
        {cartClearedDueToInactivity && (
          <p className={styles.inactiveWarning}>
            Your cart has been cleared due to 15 minutes of inactivity.
          </p>
        )}
        <div className={styles.emptyCart}>
          {/* Icon uses a masked SVG or an emoji, whichever you prefer */}
          <span className={styles.emptyIcon} aria-label="Empty Cart Icon" />
          <h2 className={styles.emptyTitle}>Your cart is empty</h2>
          <p className={styles.emptySubtitle}>
            Looks like you haven&apos;t added anything yet.
          </p>
          <button className={styles.menuBtn} onClick={handleGoToMenu}>
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.cartContainer}>
      {/* ---------------------- Cart Header ---------------------- */}
      <div className={styles.cartHeader}>
        <span className={styles.cartHeaderIcon} aria-label="Cart Icon" />
        <h1 className={styles.pageTitle}>Your Cart</h1>
        <p className={styles.cartSubtitle}>
          Review your selections below, then proceed to checkout.
        </p>
      </div>

      {/* ---------------------- Cart Items ---------------------- */}
      {cartItems.length > 0 && (
        <div className={styles.cartItemsContainer}>
          {cartItems.map((item, index) => (
            <div
              key={`${item.cartItemId}-${index}`}
              className={`${styles.cartItem} fade-in`}
            >
              {/* Item Header */}
              <div className={styles.itemHeader}>
                <div className={styles.itemNumber}>{index + 1}.</div>
                {item.image && (
                  <div className={styles.thumbnail}>
                    <Image
                      src={item.image}
                      alt={item.title}
                      width={150}
                      height={150}
                      unoptimized
                      className={styles.itemThumbnail}
                    />
                  </div>
                )}
                <div className={styles.itemInfo}>
                  <h3 className={styles.itemTitle}>{item.title}</h3>
                  {item.description && (
                    <p className={styles.itemDesc}>{item.description}</p>
                  )}
                </div>
                <div className={styles.actionButtons}>
                  <button
                    className={styles.removeBtn}
                    onClick={() => removeFromCart(item.cartItemId)}
                  >
                    Remove
                  </button>
                  <button
                    className={styles.saveLaterBtn}
                    onClick={() => moveToSaved(item.cartItemId)}
                  >
                    Save for Later
                  </button>
                </div>
              </div>

              {/* Quantity Row */}
              <div className={styles.quantityRow}>
                <label>Quantity:</label>
                <button
                  className={styles.stepBtn}
                  onClick={() => handleQuantityChange(item, item.quantity - 1)}
                >
                  -
                </button>
                <span className={styles.quantityValue}>{item.quantity}</span>
                <button
                  className={styles.stepBtn}
                  onClick={() => handleQuantityChange(item, item.quantity + 1)}
                >
                  +
                </button>
              </div>

              {/* Spice Level Row */}
              {item.hasSpiceLevel && (
                <div className={styles.spiceLevelRow}>
                  <label>Spice Level:</label>
                  <div className={styles.spiceButtons}>
                    {["No Spice", "Mild", "Medium", "Hot"].map((level) => (
                      <button
                        key={level}
                        onClick={() => handleSpiceChange(item, level)}
                        className={
                          item.spiceLevel === level
                            ? `${styles.spiceBtn} ${styles.activeSpiceBtn}`
                            : styles.spiceBtn
                        }
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Option Groups & Nested */}
              {item.optionGroups && item.optionGroups.length > 0 && (
                <div className={styles.optionGroupsContainer}>
                  {item.optionGroups.map((group) => {
                    const gState =
                      item.selectedOptions?.[group.id] || {
                        selectedChoiceIds: [],
                        nestedSelections: {},
                      };
                    return (
                      <div key={group.id} className={styles.optionGroup}>
                        <h4 className={styles.optionGroupTitle}>
                          {group.title} (Select {group.minRequired}
                          {group.maxAllowed ? ` - ${group.maxAllowed}` : ""})
                        </h4>

                        {group.optionType === "dropdown" ? (
                          <select
                            className={styles.dropdownSelect}
                            value={gState.selectedChoiceIds[0] || ""}
                            onChange={(e) => {
                              const choiceId = e.target.value;
                              const choice = group.choices.find(
                                (c) => c.id === choiceId
                              );
                              if (choice) {
                                handleOptionChange(item, group, choice, true);
                              }
                            }}
                          >
                            <option value="">-- Select --</option>
                            {group.choices.map((choice) => (
                              <option key={choice.id} value={choice.id}>
                                {choice.label}
                                {choice.nestedOptionGroup
                                  ? ""
                                  : choice.priceAdjustment
                                  ? ` (+$${choice.priceAdjustment.toFixed(2)})`
                                  : ""}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className={styles.optionList}>
                            {group.choices.map((choice) => {
                              const isSelected = gState.selectedChoiceIds.includes(
                                choice.id
                              );
                              return (
                                <div key={choice.id} className={styles.choiceRow}>
                                  <label>
                                    <input
                                      type={
                                        group.optionType === "single-select"
                                          ? "radio"
                                          : "checkbox"
                                      }
                                      name={`group-${group.id}`}
                                      checked={isSelected}
                                      onChange={(e) =>
                                        handleOptionChange(
                                          item,
                                          group,
                                          choice,
                                          e.target.checked
                                        )
                                      }
                                    />
                                    {choice.label}
                                    {choice.nestedOptionGroup
                                      ? ""
                                      : choice.priceAdjustment
                                      ? ` (+$${choice.priceAdjustment.toFixed(2)})`
                                      : ""}
                                  </label>

                                  {/* Nested Options */}
                                  {choice.nestedOptionGroup && isSelected && (
                                    <div className={styles.nestedOptions}>
                                      <h5 className={styles.nestedGroupTitle}>
                                        {choice.nestedOptionGroup.title} (Select{" "}
                                        {choice.nestedOptionGroup.minRequired}
                                        {choice.nestedOptionGroup.maxAllowed
                                          ? ` - ${choice.nestedOptionGroup.maxAllowed}`
                                          : ""}
                                        )
                                      </h5>
                                      {choice.nestedOptionGroup.choices.map((nested) => {
                                        const nestedSelected =
                                          gState.nestedSelections?.[choice.id] || [];
                                        const isNestedSelected = nestedSelected.includes(
                                          nested.id
                                        );
                                        return (
                                          <div
                                            key={nested.id}
                                            className={styles.nestedChoiceRow}
                                          >
                                            <label>
                                              <input
                                                type="checkbox"
                                                checked={isNestedSelected}
                                                onChange={(e) =>
                                                  handleNestedOptionChange(
                                                    item,
                                                    group,
                                                    choice.id,
                                                    nested.id,
                                                    e.target.checked,
                                                    choice.nestedOptionGroup?.maxAllowed
                                                  )
                                                }
                                              />
                                              {nested.label}
                                              {nested.priceAdjustment
                                                ? ` (+$${nested.priceAdjustment.toFixed(
                                                    2
                                                  )})`
                                                : ""}
                                            </label>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Special Instructions */}
              <div className={styles.instructionsRow}>
                <label>Special Instructions:</label>
                <textarea
                  rows={2}
                  className={styles.instructionsInput}
                  value={item.specialInstructions || ""}
                  onChange={(e) =>
                    handleInstructionsChange(item, e.target.value)
                  }
                />
              </div>

              {/* Price Display */}
              <p className={styles.itemPrice}>
                Item Price: ${calculateItemPrice(item).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ---------------------- Saved for Later Section ---------------------- */}
      {savedItems.length > 0 && (
        <div className={styles.savedContainer}>
          <h2 className={styles.savedTitle}>Saved for Later</h2>
          <div className={styles.savedItemsWrapper}>
            {savedItems.map((item, index) => (
              <div
                key={`${item.cartItemId}-${index}`}
                className={`${styles.savedItem} fade-in`}
              >
                {item.image && (
                  <Image
                    src={item.image}
                    alt={item.title}
                    width={80}
                    height={80}
                    unoptimized
                    className={styles.savedThumbnail}
                  />
                )}
                <div className={styles.savedInfo}>
                  <p className={styles.savedItemTitle}>{item.title}</p>
                  <p className={styles.savedItemPrice}>
                    ${item.price.toFixed(2)}
                  </p>
                </div>
                <div className={styles.savedActions}>
                  <button
                    className={styles.returnBtn}
                    onClick={() => moveBackToCart(item.cartItemId)}
                  >
                    Move to Cart
                  </button>
                  <button
                    className={styles.removeSavedBtn}
                    onClick={() => removeFromSaved(item.cartItemId)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------------- Recommended Items (Marquee) ---------------------- */}
      <div className={styles.recommendationsContainer}>
        <h2 className={styles.recommendTitle}>You may also like these items</h2>
        {displayedRecs.length > 0 ? (
          <div className={styles.marqueeWrapper}>
            <div className={styles.marqueeTrack}>
              {marqueeRecs.map((rec, i) => (
                <div
                  key={`rec-${rec.id}-${i}`}
                  className={`${styles.recommendItem} fade-in`}
                  onClick={() =>
                    router.push(`/menuitem/${rec.id}?highlight=true`)
                  }
                >
                  <div className={styles.recommendImageContainer}>
                    {rec.image && (
                      <Image
                        src={rec.image}
                        alt={rec.title}
                        fill
                        unoptimized
                        className={styles.recommendThumbnail}
                      />
                    )}
                  </div>
                  <button className={styles.addRecommendBtn}>
                    View / Add
                  </button>
                  <div className={styles.recommendInfo}>
                    <h4 className={styles.recommendItemTitle}>{rec.title}</h4>
                    <p className={styles.recommendItemPrice}>
                      ${rec.price.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p>No additional recommendations.</p>
        )}
      </div>

      {/* ---------------------- Footer ---------------------- */}
      {cartItems.length > 0 && (
        <div className={styles.cartFooter}>
          <h2 className={styles.cartTotal}>Total: ${totalPrice}</h2>
          <div className={styles.footerButtons}>
            <button onClick={handleCheckout} className={styles.checkoutBtn}>
              Proceed to Checkout
            </button>
            <button onClick={clearCart} className={styles.clearBtn}>
              Clear Cart
            </button>
            <button onClick={handleGoToMenu} className={styles.menuBtn}>
              Back To Menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
