// File: components/EditItemModal/EditItemModal.tsx

"use client";

import React, { useState, useEffect } from "react";
import styles from "./EditItemModal.module.css";
import type { CartItem, MenuItemOptionGroup, MenuOptionChoice } from "@/utils/types";

interface EditItemModalProps {
  item: CartItem; // CartItem extends MenuItem
  onClose: () => void;
  updateCartItem: (updatedItem: CartItem) => void;
}

const EditItemModal: React.FC<EditItemModalProps> = ({ item, onClose, updateCartItem }) => {
  // Local state for quantity, instructions, spice, etc.
  const [quantity, setQuantity] = useState<number>(item.quantity);
  const [specialInstructions, setSpecialInstructions] = useState<string>(
    item.specialInstructions || ""
  );
  const [spiceLevel, setSpiceLevel] = useState<string>(item.spiceLevel || "");
  /**
   * Copy the selectedOptions from the cart item if present.
   * This structure lets us manipulate top-level and nested group selections.
   */
  const [selectedOptions, setSelectedOptions] = useState<{
    [groupId: string]: {
      selectedChoiceIds: string[];
      nestedSelections?: { [choiceId: string]: string[] };
    };
  }>(item.selectedOptions || {});

  // We have the entire item.optionGroups available (since CartItem extends MenuItem).
  const optionGroups = item.optionGroups || [];

  // Lock body scrolling when the modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  /**
   * handleOptionChange: toggles a top-level choice
   * (mirroring ItemDetailPage logic).
   */
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
          if (
            groupState.selectedChoiceIds.length < (group.maxAllowed || Infinity)
          ) {
            newSelections = [...groupState.selectedChoiceIds, choice.id];
          } else {
            alert(`You can select up to ${group.maxAllowed} item(s).`);
            return prev;
          }
        } else {
          newSelections = groupState.selectedChoiceIds.filter(
            (id) => id !== choice.id
          );
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

  /**
   * handleNestedOptionChange: toggles a nested choice within a top-level choice
   */
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
      const currentNested = groupState.nestedSelections?.[parentChoiceId] || [];
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

  /**
   * Calculate the total price = base item price + selected choice priceAdjustments,
   * all multiplied by quantity.
   */
  function calculateTotalPrice(): string {
    let total = item.price;
    // Summation logic similar to ItemDetailPage
    optionGroups.forEach((group) => {
      const gState = selectedOptions[group.id];
      if (gState && gState.selectedChoiceIds.length) {
        group.choices.forEach((choice) => {
          if (gState.selectedChoiceIds.includes(choice.id)) {
            if (choice.priceAdjustment) {
              total += choice.priceAdjustment;
            }
            // Nested
            if (choice.nestedOptionGroup) {
              const nestedSelected = gState.nestedSelections?.[choice.id] || [];
              choice.nestedOptionGroup.choices.forEach((nestedChoice) => {
                if (nestedSelected.includes(nestedChoice.id)) {
                  // If nested has a priceAdjustment, add it here
                  if (nestedChoice.priceAdjustment) {
                    total += nestedChoice.priceAdjustment;
                  }
                }
              });
            }
          }
        });
      }
    });
    total *= quantity;
    return total.toFixed(2);
  }

  /**
   * Save changes back to the cart item, then call updateCartItem + onClose.
   */
  const handleSave = () => {
    const updatedItem: CartItem = {
      ...item,
      quantity,
      specialInstructions,
      spiceLevel: item.hasSpiceLevel ? spiceLevel : null,
      selectedOptions,
    };
    updateCartItem(updatedItem);
    onClose();
  };

  /**
   * Increase or decrease quantity (minimum 1).
   */
  const handleQuantityIncrease = () => setQuantity((prev) => prev + 1);
  const handleQuantityDecrease = () => setQuantity((prev) => (prev > 1 ? prev - 1 : 1));

  return (
    <div
      className={styles.modalOverlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        aria-labelledby="edit-item-modal-heading"
      >
        <button
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close Modal"
        >
          &times;
        </button>

        <div className={styles.modalHeader}>
          <h2 id="edit-item-modal-heading">Edit {item.title}</h2>
          {item.description && (
            <div className={styles.itemDescription}>
              <p>{item.description}</p>
            </div>
          )}
        </div>

        <div className={styles.modalContent}>
          {/* Quantity */}
          <div className={styles.section}>
            <label>Quantity:</label>
            <div className={styles.quantityControls}>
              <button
                onClick={handleQuantityDecrease}
                className={styles.quantityBtn}
                aria-label="Decrease Quantity"
              >
                -
              </button>
              <span className={styles.quantityDisplay}>{quantity}</span>
              <button
                onClick={handleQuantityIncrease}
                className={styles.quantityBtn}
                aria-label="Increase Quantity"
              >
                +
              </button>
            </div>
          </div>

          {/* Spice Level (if hasSpiceLevel) */}
          {item.hasSpiceLevel && (
            <div className={styles.section}>
              <label>Spice Level:</label>
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

          {/* Option Groups (similar to detail page) */}
          {optionGroups.length > 0 && (
            <div className={styles.section}>
              <label>Customize:</label>
              {optionGroups.map((group) => {
                const gState = selectedOptions[group.id] || {
                  selectedChoiceIds: [],
                  nestedSelections: {},
                };
                return (
                  <div key={group.id} className={styles.optionGroup}>
                    <p>
                      <strong>
                        {group.title} (Select {group.minRequired}
                        {group.maxAllowed ? ` - ${group.maxAllowed}` : ""})
                      </strong>
                    </p>
                    {/* If dropdown */}
                    {group.optionType === "dropdown" ? (
                      <select
                        value={gState.selectedChoiceIds[0] || ""}
                        onChange={(e) => {
                          const choiceId = e.target.value;
                          group.choices.forEach((choice) => {
                            handleOptionChange(group, choice, choice.id === choiceId);
                          });
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
                                  group.optionType === "single-select"
                                    ? "radio"
                                    : "checkbox"
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
                            {/* Nested if isSelected */}
                            {choice.nestedOptionGroup && isSelected && (
                              <div className={styles.nestedOptionGroup}>
                                <strong>
                                  {choice.nestedOptionGroup.title} (Select{" "}
                                  {choice.nestedOptionGroup.minRequired}
                                  {choice.nestedOptionGroup.maxAllowed
                                    ? ` - ${choice.nestedOptionGroup.maxAllowed}`
                                    : ""}
                                  )
                                </strong>
                                {choice.nestedOptionGroup.choices.map((nestedChoice) => {
                                  const nestedSelected =
                                    gState.nestedSelections?.[choice.id] || [];
                                  const isNestedSelected = nestedSelected.includes(
                                    nestedChoice.id
                                  );
                                  return (
                                    <div
                                      key={nestedChoice.id}
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
                                              nestedChoice.id,
                                              e.target.checked,
                                              choice.nestedOptionGroup!.maxAllowed
                                            )
                                          }
                                        />
                                        {nestedChoice.label}
                                        {nestedChoice.priceAdjustment
                                          ? ` (+$${nestedChoice.priceAdjustment.toFixed(2)})`
                                          : ""}
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
                );
              })}
            </div>
          )}

          {/* Special Instructions */}
          <div className={styles.section}>
            <label htmlFor="editSpecialInstructions">Special Instructions:</label>
            <textarea
              id="editSpecialInstructions"
              maxLength={500}
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Add any special requests here."
            />
          </div>
        </div>

        <div className={styles.modalFooter}>
          <div className={styles.totalPrice}>
            Total Price: ${calculateTotalPrice()}
          </div>
          <button className={styles.btnPrimary} onClick={handleSave}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditItemModal;
