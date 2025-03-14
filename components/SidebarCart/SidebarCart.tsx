// File: components/SidebarCart/SidebarCart.tsx
"use client";

import React, { useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./SidebarCart.module.css";
import { CartContext } from "@/contexts/CartContext";
import EditItemModal from "../EditItemModal/EditItemModal";
import { Accompaniment } from "@/utils/types";

interface SidebarCartProps {
  isOpen: boolean;
  onClose: () => void;
}

const SidebarCart: React.FC<SidebarCartProps> = ({ isOpen, onClose }) => {
  const { cartItems, removeFromCart, updateCartItem, getTotalPrice } = useContext(CartContext)!;
  const [editingItem, setEditingItem] = useState<any>(null);
  const [minimized, setMinimized] = useState(false);
  const router = useRouter();
  const totalPrice = getTotalPrice().toFixed(2);

  // Ensure the sidebar is expanded whenever it opens.
  useEffect(() => {
    if (isOpen) {
      setMinimized(false);
    }
  }, [isOpen]);

  const toggleMinimize = () => {
    setMinimized(prev => !prev);
  };

  const handleClose = () => {
    onClose();
  };

  const handleCheckout = () => {
    onClose();
    router.push("/checkout");
  };

  // Redirect to the menu page when "Add Orders" is clicked.
  const handleAddOrders = () => {
    onClose();
    router.push("/menu");
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
  };

  const closeEditModal = () => {
    setEditingItem(null);
  };

  const handleUpdateCartItem = (updatedItem: any) => {
    updateCartItem(updatedItem);
    closeEditModal();
  };

  return (
    <>
      <div
        className={`${styles.sidebarCart} ${isOpen ? styles.open : ""} ${minimized ? styles.minimized : ""}`}
      >
        <div className={styles.sidebarCartHeader}>
          <h2>Your Cart</h2>
          <div
            className={minimized
              ? `${styles.buttonGroup} ${styles.buttonGroupMinimized}`
              : styles.buttonGroup
            }
          >
            <button
              className={styles.expandButton}
              onClick={toggleMinimize}
              aria-label={minimized ? "Expand Cart" : "Minimize Cart"}
            >
              {minimized ? "Expand" : "Minimize"}
            </button>
            <button
              className={styles.closeButton}
              onClick={handleClose}
              aria-label="Close Cart"
            >
              Close
            </button>
          </div>
        </div>
        {!minimized && (
          <div className={styles.sidebarCartContent}>
            {cartItems.length === 0 ? (
              <div className={styles.emptyCart}>
                <h3>Your cart is empty.</h3>
                <button
                  className={`${styles.btn} ${styles.btnAddOrders}`}
                  onClick={handleAddOrders}
                >
                  Add Orders
                </button>
              </div>
            ) : (
              cartItems.map((item: any) => {
                // Compute additional cost from grouped accompaniments.
                const accompanimentsCost = Object.values(item.selectedAccompaniments || {})
                  .flat()
                  .reduce((acc: number, ai: Accompaniment) => acc + ai.price, 0);

                return (
                  <div key={item.cartItemId} className={styles.sidebarCartItem}>
                    <div className={styles.itemDetails}>
                      <h5>
                        {item.title}{" "}
                        {item.quantity > 1 && (
                          <span className={styles.quantityIndicator}>
                            × {item.quantity}
                          </span>
                        )}
                      </h5>
                      {item.description && <p>{item.description}</p>}
                      {item.spiceLevel && <p>Spice Level: {item.spiceLevel}</p>}
                      
                      {/* Render grouped accompaniments */}
                      {Object.keys(item.selectedAccompaniments || {}).length > 0 && (
                        <div>
                          <p>Accompaniments:</p>
                          {Object.entries(item.selectedAccompaniments || {}).map(([groupId, selections]) => {
                            // Look up group label from availableAccompanimentGroups if provided.
                            const groupLabel = item.availableAccompanimentGroups?.find(
                              (group: any) => group.id === groupId
                            )?.label || groupId;
                            // Ensure selections is an array.
                            const selectionArray = Array.isArray(selections) ? selections : [];
                            return (
                              <div key={groupId}>
                                <p>
                                  <strong>{groupLabel}</strong>
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
                      {item.specialInstructions && (
                        <p>Note: {item.specialInstructions}</p>
                      )}
                    </div>
                    <div className={styles.itemActions}>
                      <button
                        onClick={() => openEditModal(item)}
                        className={`${styles.btn} ${styles.btnEdit}`}
                        aria-label="Edit Item"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => removeFromCart(item.cartItemId)}
                        className={`${styles.btn} ${styles.btnRemove}`}
                        aria-label="Remove Item"
                      >
                        Remove
                      </button>
                    </div>
                    <p className={styles.itemPrice}>
                      ${((item.price + accompanimentsCost) * item.quantity).toFixed(2)}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        )}
        {!minimized && cartItems.length > 0 && (
          <div className={styles.sidebarCartFooter}>
            <h3>Total: ${totalPrice}</h3>
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={handleCheckout}
            >
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>
      {editingItem && (
        <EditItemModal
          item={editingItem}
          onClose={closeEditModal}
          updateCartItem={handleUpdateCartItem}
        />
      )}
    </>
  );
};

export default SidebarCart;
