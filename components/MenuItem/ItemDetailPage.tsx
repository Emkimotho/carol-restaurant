"use client";

import React, { useState, useEffect, useContext } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import styles from "./ItemDetailPage.module.css";
import { CartContext } from "@/contexts/CartContext";

// If these types exist in "@/utils/types", import them instead.
export interface MenuCategory {
  id: string;
  name: string;
  type: string;
  order: number;
}

export interface NestedOptionChoice {
  id: string;
  label: string;
  priceAdjustment?: number;
}

export interface NestedOptionGroup {
  id: string;
  title: string;
  minRequired: number;
  maxAllowed?: number;
  choices: NestedOptionChoice[];
}

export interface MenuOptionChoice {
  id: string;
  label: string;
  priceAdjustment?: number;
  nestedOptionGroup?: NestedOptionGroup;
}

export interface MenuItemOptionGroup {
  id: string;
  title: string;
  minRequired: number;
  maxAllowed?: number;
  optionType: "single-select" | "multi-select" | "dropdown";
  choices: MenuOptionChoice[];
}

export interface MenuCategoryRef {
  id: string;
  name: string;
  type: string;
  order: number;
}

export interface MenuItem {
  id: string;
  title: string;
  description?: string;
  price: number;
  image?: string;
  hasSpiceLevel: boolean;
  category: MenuCategoryRef;
  optionGroups?: MenuItemOptionGroup[];
}

interface ItemDetailPageProps {
  item: MenuItem;
  recommendedDrinks?: MenuItem[];
  desserts?: MenuItem[];
  snacks?: MenuItem[];
  softDrinks?: MenuItem[];
  isPreview?: boolean; // Skip cart logic if true
}

export default function ItemDetailPage({
  item,
  recommendedDrinks = [],
  desserts = [],
  snacks = [],
  softDrinks = [],
  isPreview = false,
}: ItemDetailPageProps) {
  const router = useRouter();
  const { addToCart, isSidebarCartOpen, openSidebarCart } = useContext(CartContext)!;

  // States for quantity, spice, instructions
  const [quantity, setQuantity] = useState<number>(1);
  const [spiceLevel, setSpiceLevel] = useState<string>("No Spice");
  const [specialInstructions, setSpecialInstructions] = useState<string>("");
  const [selectedOptions, setSelectedOptions] = useState<{
    [groupId: string]: {
      selectedChoiceIds: string[];
      nestedSelections: { [choiceId: string]: string[] };
    };
  }>({});

  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    // Reset states when item changes
    setQuantity(1);
    setSpiceLevel("No Spice");
    setSpecialInstructions("");

    if (item.optionGroups) {
      const init: {
        [groupId: string]: {
          selectedChoiceIds: string[];
          nestedSelections: { [choiceId: string]: string[] };
        };
      } = {};
      item.optionGroups.forEach((group) => {
        init[group.id] = { selectedChoiceIds: [], nestedSelections: {} };
      });
      setSelectedOptions(init);
    } else {
      setSelectedOptions({});
    }
  }, [item]);

  // Handle top-level options
  function handleOptionChange(
    group: MenuItemOptionGroup,
    choice: MenuOptionChoice,
    checked: boolean
  ) {
    setSelectedOptions((prev) => {
      const groupState = prev[group.id] || {
        selectedChoiceIds: [],
        nestedSelections: {},
      };
      let newSelections: string[] = [];

      if (group.optionType === "single-select" || group.optionType === "dropdown") {
        newSelections = checked ? [choice.id] : [];
      } else {
        // multi-select
        if (checked) {
          if (groupState.selectedChoiceIds.length < (group.maxAllowed || Infinity)) {
            newSelections = [...groupState.selectedChoiceIds, choice.id];
          } else {
            alert(`You can select up to ${group.maxAllowed} item(s).`);
            return prev;
          }
        } else {
          newSelections = groupState.selectedChoiceIds.filter((id) => id !== choice.id);
        }
      }

      return {
        ...prev,
        [group.id]: {
          ...groupState,
          selectedChoiceIds: newSelections,
        },
      };
    });
  }

  // Handle nested options
  function handleNestedOptionChange(
    groupId: string,
    parentChoiceId: string,
    nestedOptionId: string,
    checked: boolean,
    nestedMaxAllowed?: number
  ) {
    setSelectedOptions((prev) => {
      const groupState = prev[groupId] || {
        selectedChoiceIds: [],
        nestedSelections: {},
      };
      const currentNested = groupState.nestedSelections[parentChoiceId] || [];
      let newNested = [...currentNested];

      if (checked) {
        if (newNested.length < (nestedMaxAllowed || Infinity)) {
          newNested = [...newNested, nestedOptionId];
        } else {
          alert(`You can select up to ${nestedMaxAllowed} nested options.`);
          return prev;
        }
      } else {
        newNested = newNested.filter((id) => id !== nestedOptionId);
      }

      return {
        ...prev,
        [groupId]: {
          ...groupState,
          nestedSelections: {
            ...groupState.nestedSelections,
            [parentChoiceId]: newNested,
          },
        },
      };
    });
  }

  // Calculate total price
  function calculateTotalPrice() {
    let total = item.price;
    if (item.optionGroups) {
      item.optionGroups.forEach((group) => {
        const gState = selectedOptions[group.id];
        if (gState && gState.selectedChoiceIds.length) {
          group.choices.forEach((choice) => {
            if (gState.selectedChoiceIds.includes(choice.id)) {
              if (choice.priceAdjustment) {
                total += choice.priceAdjustment;
              }
              // Nested
              if (choice.nestedOptionGroup) {
                const nestedSelected = gState.nestedSelections[choice.id] || [];
                choice.nestedOptionGroup.choices.forEach((nestedChoice) => {
                  if (nestedSelected.includes(nestedChoice.id)) {
                    // Add nested price if needed
                  }
                });
              }
            }
          });
        }
      });
    }
    return (total * quantity).toFixed(2);
  }

  // Add to cart (skip if isPreview)
  function handleAddToCart() {
    if (isPreview) {
      alert("Preview mode: Add to cart is disabled.");
      return;
    }

    const mainCartItem = {
      id: item.id,
      title: item.title,
      description: item.description,
      price: item.price,
      image: item.image,
      hasSpiceLevel: item.hasSpiceLevel,
      optionGroups: item.optionGroups,
      specialInstructions,
      category: item.category,
    };

    addToCart(
      mainCartItem,
      quantity,
      specialInstructions,
      item.hasSpiceLevel ? spiceLevel : undefined,
      selectedOptions
    );

    if (typeof window !== "undefined" && window.innerWidth < 768) {
      if (!isSidebarCartOpen) {
        openSidebarCart?.();
      }
    } else {
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        router.push("/menu");
      }, 3000);
    }
  }

  function handleQuantityIncrease() {
    setQuantity((prev) => prev + 1);
  }
  function handleQuantityDecrease() {
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1));
  }

  // If not preview, go back. If preview, disable or just show alert
  function handleBackToMenu() {
    if (isPreview) {
      alert("Preview mode: 'Back to Menu' is disabled.");
      return;
    }
    router.push("/menu");
  }

  return (
    <div className={styles.detailPageContainer}>
      <div className={styles.mainContent}>
        {/* Image */}
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

        {/* Info */}
        <div className={styles.infoContainer}>
          <h1 className={styles.itemTitle}>{item.title}</h1>
          <p className={styles.itemDescription}>{item.description}</p>

          {/* Option Groups */}
          {item.optionGroups &&
            item.optionGroups.map((group) => {
              const gState = selectedOptions[group.id] || {
                selectedChoiceIds: [],
                nestedSelections: {},
              };
              return (
                <div key={group.id} className={styles.optionGroup}>
                  <h4 className={styles.groupTitle}>
                    {group.title} (Select {group.minRequired}
                    {group.maxAllowed ? ` - ${group.maxAllowed}` : ""})
                  </h4>
                  <div className={styles.options}>
                    {group.optionType === "dropdown" ? (
                      <select
                        value={gState.selectedChoiceIds[0] || ""}
                        onChange={(e) => {
                          const choiceId = e.target.value;
                          group.choices.forEach((choice) =>
                            handleOptionChange(group, choice, choice.id === choiceId)
                          );
                        }}
                      >
                        <option value="">-- Select --</option>
                        {group.choices.map((choice) => (
                          <option key={choice.id} value={choice.id}>
                            {choice.label}
                            {choice.priceAdjustment
                              ? ` (+$${choice.priceAdjustment.toFixed(2)})`
                              : ""}
                          </option>
                        ))}
                      </select>
                    ) : (
                      // single-select or multi-select
                      group.choices.map((choice) => {
                        const isSelected = gState.selectedChoiceIds.includes(choice.id);
                        return (
                          <div key={choice.id} className={styles.optionItem}>
                            <label>
                              <input
                                type={
                                  group.optionType === "single-select" ? "radio" : "checkbox"
                                }
                                name={group.id}
                                checked={isSelected}
                                onChange={(e) =>
                                  handleOptionChange(group, choice, e.target.checked)
                                }
                              />
                              {choice.label}
                              {choice.priceAdjustment
                                ? ` (+$${choice.priceAdjustment.toFixed(2)})`
                                : ""}
                            </label>
                            {/* Nested options if isSelected */}
                            {choice.nestedOptionGroup && isSelected && (
                              <div className={styles.nestedOptionGroup}>
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
                                    gState.nestedSelections[choice.id] || [];
                                  const isNestedSelected = nestedSelected.includes(nested.id);
                                  return (
                                    <div
                                      key={nested.id}
                                      className={styles.nestedOptionItem}
                                    >
                                      <label>
                                        <input
                                          type="checkbox"
                                          checked={isNestedSelected}
                                          onChange={(e) =>
                                            handleNestedOptionChange(
                                              group.id,
                                              choice.id,
                                              nested.id,
                                              e.target.checked,
                                              choice.nestedOptionGroup!.maxAllowed
                                            )
                                          }
                                        />
                                        {nested.label}
                                      </label>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}

          {item.hasSpiceLevel && (
            <div className={styles.spiceLevelContainer}>
              <label className={styles.spiceLabel}>Choose Spice Level:</label>
              <div className={styles.spiceOptions}>
                {["No Spice", "Mild", "Medium", "Hot"].map((level) => (
                  <button
                    key={level}
                    onClick={() => setSpiceLevel(level)}
                    className={spiceLevel === level ? styles.btnSelected : styles.btnOutline}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          )}

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

          <div className={styles.buttonsRow}>
            <div className={styles.cartActions}>
              <div className={styles.totalPrice}>
                Total Price: ${calculateTotalPrice()}
              </div>
              <button
                className={styles.btnAddToCart}
                onClick={handleAddToCart}
                disabled={isPreview}
              >
                {isPreview ? "Preview Mode" : "Add to Cart"}
              </button>
            </div>
            <button type="button" className={styles.btnBackToMenu} onClick={handleBackToMenu}>
              {isPreview ? "Close Preview" : "Back to Menu"}
            </button>
          </div>
        </div>
      </div>

      {/* Recommended items */}
      {recommendedDrinks.length > 0 && (
        <div className={styles.recommendations}>
          <h3 className={styles.recommendationsTitle}>You might also like...</h3>
          <div className={styles.drinkList}>
            {recommendedDrinks.map((drink) => (
              <div key={drink.id} className={styles.drinkItem}>
                <Image
                  src={drink.image || ""}
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

      {/* Toast (skip in preview) */}
      {showToast && !isPreview && (
        <div className={styles.toastNotification}>
          <div className={styles.toastContent}>Item added to cart!</div>
        </div>
      )}
    </div>
  );
}
