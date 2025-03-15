"use client";

import React, { useState, useEffect } from "react";
import styles from "./EditItemModal.module.css";
import { CartItem, Accompaniment, AccompanimentGroup } from "@/utils/types";

interface EditItemModalProps {
  item: CartItem;
  onClose: () => void;
  updateCartItem: (updatedItem: CartItem) => void;
}

const EditItemModal: React.FC<EditItemModalProps> = ({ item, onClose, updateCartItem }) => {
  // All hooks are called unconditionally.
  const [quantity, setQuantity] = useState<number>(item.quantity);
  const [specialInstructions, setSpecialInstructions] = useState<string>(item.specialInstructions || "");
  const [spiceLevel, setSpiceLevel] = useState<string>(item.spiceLevel || "");
  const [selectedAccompaniments, setSelectedAccompaniments] = useState<{ [groupId: string]: Accompaniment[] }>(
    item.selectedAccompaniments || {}
  );

  // Use availableAccompanimentGroups if provided; fallback to item.accompanimentGroups.
  const availableAccompanimentGroups: AccompanimentGroup[] =
    item.availableAccompanimentGroups || item.accompanimentGroups || [];

  // Lock body scrolling when the modal is open.
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  // Handler to update accompaniment selections and enforce max allowed selections.
  const handleAccompanimentChange = (
    groupId: string,
    accompaniment: Accompaniment,
    isChecked: boolean,
    maxSelections: number
  ) => {
    setSelectedAccompaniments((prev) => {
      const currentSelections = prev[groupId] || [];
      if (isChecked) {
        if (maxSelections === 1) {
          return { ...prev, [groupId]: [accompaniment] };
        } else {
          if (currentSelections.length < maxSelections) {
            return { ...prev, [groupId]: [...currentSelections, accompaniment] };
          } else {
            alert(`You can only select up to ${maxSelections} option${maxSelections > 1 ? "s" : ""} in this category.`);
            return prev;
          }
        }
      } else {
        return { ...prev, [groupId]: currentSelections.filter((acc) => acc.id !== accompaniment.id) };
      }
    });
  };

  // Calculate the total price based on the base price, selected accompaniments, and quantity.
  const calculateTotalPrice = (): string => {
    let total = item.price;
    Object.values(selectedAccompaniments).forEach((groupSelections) => {
      groupSelections.forEach((acc) => {
        total += acc.price;
      });
    });
    total *= quantity;
    return total.toFixed(2);
  };

  // Save changes by updating the cart item and closing the modal.
  const handleSave = () => {
    const updatedItem: CartItem = {
      ...item,
      quantity,
      specialInstructions,
      spiceLevel: item.hasSpiceLevel ? spiceLevel : null,
      selectedAccompaniments,
    };
    updateCartItem(updatedItem);
    onClose();
  };

  // Quantity adjustment handlers.
  const handleQuantityIncrease = () => setQuantity((prev) => prev + 1);
  const handleQuantityDecrease = () => setQuantity((prev) => (prev > 1 ? prev - 1 : 1));

  return (
    <div className={styles["modal-overlay"]} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles["modal__close-btn"]} onClick={onClose} aria-label="Close Modal">
          &times;
        </button>
        <div className={styles.modal__header}>
          <h2>Edit {item.title}</h2>
          {item.description && (
            <div className={styles.modal__description}>
              <p>{item.description}</p>
            </div>
          )}
        </div>
        <div className={styles.modal__content}>
          {/* Quantity Selector */}
          <div className={styles["modal__section"]}>
            <label>Quantity:</label>
            <div className={styles["quantity-controls"]}>
              <button onClick={handleQuantityDecrease} className={styles["quantity-btn"]} aria-label="Decrease Quantity">
                -
              </button>
              <span className={styles["quantity-display"]}>{quantity}</span>
              <button onClick={handleQuantityIncrease} className={styles["quantity-btn"]} aria-label="Increase Quantity">
                +
              </button>
            </div>
          </div>
          {/* Spice Level Selector */}
          {item.hasSpiceLevel && (
            <div className={styles["modal__section"]}>
              <label>Spice Level:</label>
              <div className={styles["spice-options"]}>
                {["No Spice", "Mild", "Medium", "Hot"].map((level) => (
                  <button
                    key={level}
                    className={`${styles.btn} ${spiceLevel === level ? styles["btn--selected"] : styles["btn--outline"]}`}
                    onClick={() => setSpiceLevel(level)}
                    aria-pressed={spiceLevel === level}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          )}
          {/* Accompaniments Selector */}
          {availableAccompanimentGroups.length > 0 && (
            <div className={styles["modal__section"]}>
              <label>Accompaniments:</label>
              {availableAccompanimentGroups.map((group) => {
                const groupSelections = selectedAccompaniments[group.id] || [];
                return (
                  <div key={group.id} className={styles["accompaniment-group"]}>
                    <p>
                      <strong>{group.label} (Max {group.maxSelections})</strong>
                    </p>
                    {group.options.map((acc) => {
                      const isChecked = groupSelections.some((selected) => selected.id === acc.id);
                      const disableCheckbox = !isChecked && groupSelections.length >= group.maxSelections;
                      return (
                        <div key={acc.id} className={styles["accompaniment-option"]}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={disableCheckbox}
                            onChange={(e) =>
                              handleAccompanimentChange(group.id, acc, e.target.checked, group.maxSelections)
                            }
                          />
                          <span>
                            {acc.name} (+${acc.price.toFixed(2)})
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
          {/* Fallback for read-only accompaniments */}
          {availableAccompanimentGroups.length === 0 &&
            item.selectedAccompaniments &&
            Object.keys(item.selectedAccompaniments).length > 0 && (
              <div className={styles["modal__section"]}>
                <label>Accompaniments:</label>
                {Object.entries(item.selectedAccompaniments).map(([groupId, selections]) => {
                  const selectionArray = Array.isArray(selections) ? selections : [];
                  return (
                    <div key={groupId}>
                      <p>
                        <strong>{groupId}</strong>
                      </p>
                      <ul>
                        {selectionArray.map((acc: Accompaniment) => (
                          <li key={acc.id}>
                            {acc.name} (+${acc.price.toFixed(2)})
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          {/* Special Instructions */}
          <div className={styles["modal__section"]}>
            <label htmlFor="editSpecialInstructions">Special Instructions:</label>
            <textarea
              id="editSpecialInstructions"
              maxLength={500}
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Add any special requests or dietary restrictions here."
            ></textarea>
          </div>
        </div>
        <div className={styles.modal__footer}>
          <div className={styles.modal__totalPrice}>Total Price: ${calculateTotalPrice()}</div>
          <button className={styles["btn-primary"]} onClick={handleSave}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditItemModal;
