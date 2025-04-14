// File: components/ItemDetailPage.tsx

"use client";

import React, { useState, useEffect, useContext } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CartContext } from "@/contexts/CartContext";
import { toast } from "react-toastify";
import styles from "./ItemDetailPage.module.css";

// Types
import {
  MenuItem as MenuItemType,
  MenuItemOptionGroup,
  MenuOptionChoice,
} from "@/utils/types";

interface ItemDetailPageProps {
  item: MenuItemType;
  recommendedDrinks?: MenuItemType[];
  desserts?: MenuItemType[];
  snacks?: MenuItemType[];
  softDrinks?: MenuItemType[];
  isPreview?: boolean; // If true, disable cart functionality
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
  const { addToCart } = useContext(CartContext)!;

  // States
  const [quantity, setQuantity] = useState<number>(1);
  const [spiceLevel, setSpiceLevel] = useState<string>("No Spice");
  const [specialInstructions, setSpecialInstructions] = useState<string>("");
  const [selectedOptions, setSelectedOptions] = useState<{
    [groupId: string]: {
      selectedChoiceIds: string[];
      nestedSelections: { [choiceId: string]: string[] };
    };
  }>({});

  // On item change, reset states
  useEffect(() => {
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
      item.optionGroups.forEach((group: MenuItemOptionGroup) => {
        init[group.id] = {
          selectedChoiceIds: [],
          nestedSelections: {},
        };
      });
      setSelectedOptions(init);
    } else {
      setSelectedOptions({});
    }
  }, [item]);

  // ---------- HANDLERS ----------

  // For top-level option groups
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
      let newSelections = [...groupState.selectedChoiceIds];

      if (group.optionType === "single-select" || group.optionType === "dropdown") {
        newSelections = checked ? [choice.id] : [];
      } else {
        // multi-select: allow multiple selections if within max limit.
        if (checked) {
          if (newSelections.length < (group.maxAllowed || Infinity)) {
            newSelections.push(choice.id);
          } else {
            toast.error(`You can select up to ${group.maxAllowed} item(s).`);
            return prev;
          }
        } else {
          newSelections = newSelections.filter((id) => id !== choice.id);
        }
      }

      return {
        ...prev,
        [group.id]: { ...groupState, selectedChoiceIds: newSelections },
      };
    });
  }

  // For nested options within a group.
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
          newNested.push(nestedOptionId);
        } else {
          toast.error(`You can select up to ${nestedMaxAllowed} nested options.`);
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

  /**
   * Calculates the total price for the item, including any price adjustments from options.
   */
  function calculateTotalPrice(): string {
    let total = item.price;
    if (item.optionGroups && selectedOptions) {
      item.optionGroups.forEach((group: MenuItemOptionGroup) => {
        const gState = selectedOptions[group.id];
        if (gState && gState.selectedChoiceIds.length) {
          group.choices.forEach((choice: MenuOptionChoice) => {
            if (gState.selectedChoiceIds.includes(choice.id)) {
              // If a nested group exists, add nested choice adjustments
              if (choice.nestedOptionGroup) {
                const nestedSelected = gState.nestedSelections[choice.id] || [];
                choice.nestedOptionGroup.choices.forEach((nested) => {
                  if (nestedSelected.includes(nested.id) && nested.priceAdjustment) {
                    total += nested.priceAdjustment;
                  }
                });
              } else {
                if (choice.priceAdjustment) {
                  total += choice.priceAdjustment;
                }
              }
            }
          });
        }
      });
    }
    return (total * quantity).toFixed(2);
  }

  // Validate that minimum selections are met.
  function canAddToCart() {
    if (!item.optionGroups) return true;
    for (const group of item.optionGroups) {
      const gState = selectedOptions[group.id];
      const selectedCount = gState ? gState.selectedChoiceIds.length : 0;
      if (selectedCount < group.minRequired) {
        toast.error(`Please select at least ${group.minRequired} option(s) for ${group.title}.`);
        return false;
      }
      if (group.choices) {
        for (const choice of group.choices) {
          if (choice.nestedOptionGroup && gState?.selectedChoiceIds.includes(choice.id)) {
            const nestedSelected = gState.nestedSelections[choice.id] || [];
            if (nestedSelected.length < choice.nestedOptionGroup.minRequired) {
              toast.error(`Please select at least ${choice.nestedOptionGroup.minRequired} option(s) for ${choice.label}.`);
              return false;
            }
          }
        }
      }
    }
    return true;
  }

  // Handle adding the item to the cart.
  function handleAddToCart() {
    if (isPreview) {
      toast.info("Preview mode: Add to cart is disabled.");
      return;
    }
    if (!canAddToCart()) {
      return;
    }

    // Build main cart item including the clover item id and stock.
    const mainCartItem = {
      id: item.id,
      title: item.title,
      description: item.description,
      price: item.price,
      image: item.image,
      hasSpiceLevel: item.hasSpiceLevel,
      optionGroups: item.optionGroups || [],
      showInGolfMenu: item.showInGolfMenu,
      category: item.category,
      specialInstructions,
      cloverItemId: item.cloverItemId || null, // Ensure this is set (if available)
      stock: item.stock || 0,                 // Include stock (defaults to 0 if not set)
    };

    // Call addToCart from the CartContext.
    addToCart(
      mainCartItem,
      quantity,
      specialInstructions,
      item.hasSpiceLevel ? spiceLevel : undefined,
      selectedOptions
    );

    toast.success("Item added to cart!");
  }

  // Basic quantity adjustments.
  function handleQuantityIncrease() {
    setQuantity((prev) => prev + 1);
  }
  function handleQuantityDecrease() {
    setQuantity((prev) => Math.max(1, prev - 1));
  }

  // Return to the menu.
  function handleBackToMenu() {
    if (isPreview) {
      toast.info("Preview mode: 'Back to Menu' is disabled.");
      return;
    }
    router.push("/menu");
  }

  // Filter out recommendations
  const filteredDrinks = recommendedDrinks?.filter((rec) => rec.id !== item.id) || [];
  const filteredDesserts = desserts?.filter((rec) => rec.id !== item.id) || [];
  const filteredSnacks = snacks?.filter((rec) => rec.id !== item.id) || [];
  const filteredSoftDrinks = softDrinks?.filter((rec) => rec.id !== item.id) || [];

  return (
    <div className={styles.detailPageContainer}>
      <div className={styles.mainContent}>
        {/* Image Section */}
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

        {/* Information Section */}
        <div className={styles.infoContainer}>
          <h1 className={styles.itemTitle}>{item.title}</h1>
          {item.description && <p className={styles.itemDescription}>{item.description}</p>}
          <p className={styles.price}>Price: ${item.price.toFixed(2)}</p>

          {/* Option Groups */}
          {item.optionGroups?.map((group: MenuItemOptionGroup) => {
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
                {group.optionType === "dropdown" ? (
                  <select
                    className={styles.dropdownSelect}
                    value={gState.selectedChoiceIds[0] || ""}
                    onChange={(e) => {
                      const choiceId = e.target.value;
                      const choice = group.choices.find((c) => c.id === choiceId);
                      if (choice) handleOptionChange(group, choice, true);
                    }}
                  >
                    <option value="">-- Select --</option>
                    {group.choices.map((choice: MenuOptionChoice) => (
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
                    {group.choices.map((choice: MenuOptionChoice) => {
                      const isSelected = gState.selectedChoiceIds.includes(choice.id);
                      return (
                        <div key={choice.id} className={styles.optionItem}>
                          <label>
                            <input
                              type={group.optionType === "single-select" ? "radio" : "checkbox"}
                              name={group.id}
                              checked={isSelected}
                              onChange={(e) =>
                                handleOptionChange(group, choice, e.target.checked)
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
                            <div className={styles.nestedOptionGroup}>
                              <h5 className={styles.nestedGroupTitle}>
                                {choice.nestedOptionGroup.title} (Select{" "}
                                {choice.nestedOptionGroup.minRequired}
                                {choice.nestedOptionGroup.maxAllowed
                                  ? ` - ${choice.nestedOptionGroup.maxAllowed}`
                                  : ""})
                              </h5>
                              {choice.nestedOptionGroup.choices.map((nested) => {
                                const nestedSelected =
                                  gState.nestedSelections[choice.id] || [];
                                const isNestedSelected = nestedSelected.includes(nested.id);
                                return (
                                  <div key={nested.id} className={styles.nestedOptionItem}>
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
                                            choice.nestedOptionGroup?.maxAllowed
                                          )
                                        }
                                      />
                                      {nested.label}
                                      {nested.priceAdjustment
                                        ? ` (+$${nested.priceAdjustment.toFixed(2)})`
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
            <label htmlFor="specialInstructions" className={styles.instructionsLabel}>
              Special Instructions:
            </label>
            <textarea
              id="specialInstructions"
              maxLength={500}
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Extra sauce, no onions, etc."
              className={styles.instructionsInput}
            />
          </div>

          {/* Footer Buttons */}
          <div className={styles.buttonsRow}>
            <div className={styles.cartActions}>
              <div className={styles.totalPrice}>Total Price: ${calculateTotalPrice()}</div>
              <button
                id="addToCartBtn"
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

      {/* Recommended Items */}
      {recommendedDrinks?.length > 0 && (
        <div className={styles.recommendations}>
          <h3 className={styles.recommendationsTitle}>You might also like...</h3>
          <div className={styles.drinkList}>
            {recommendedDrinks
              .filter((rec) => rec.id !== item.id)
              .map((rec) => (
                <div
                  key={rec.id}
                  className={styles.drinkItem}
                  onClick={() => router.push(`/menuitem/${rec.id}?highlight=true`)}
                >
                  <Image
                    src={rec.image || ""}
                    alt={rec.title}
                    width={100}
                    height={100}
                    unoptimized
                    className={styles.drinkImage}
                  />
                  <p className={styles.drinkTitle}>{rec.title}</p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
