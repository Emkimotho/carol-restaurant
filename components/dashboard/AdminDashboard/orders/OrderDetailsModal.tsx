"use client";

import React from "react";
import styles from "./OrderDetailsModal.module.css";

export interface Order {
  id: string;
  orderId: string;
  status: string;
  orderType: string | null;
  totalAmount: number;
  createdAt: string;
  items: any[];
  customerName?: string;
  customerAddress?: string;
  deliveryAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    deliveryOption?: string;
    deliveryInstructions?: string;
  };
}

interface OrderDetailsModalProps {
  order: Order;
  onClose: () => void;
}

/**
 * OrderDetailsModal displays key details in a modern, minimalist style.
 * It highlights the main item with an associated customer note (if any)
 * and shows accompaniments (if available) in a distinct sub-section.
 */
const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ order, onClose }) => {
  // Extract the main item (assuming the first item is the main dish)
  const mainItem = order.items && order.items.length > 0 ? order.items[0] : null;

  // Helper: Retrieve customer note (if any) from the main item's special instructions.
  const customerNote =
    mainItem && mainItem.specialInstructions ? mainItem.specialInstructions : null;

  // Helper: Create a summary of accompaniments (selected options) for the main item.
  const renderAccompaniments = () => {
    if (!mainItem || !mainItem.optionGroups || !mainItem.selectedOptions) return null;
    const accompaniments: string[] = [];

    mainItem.optionGroups.forEach((group: any) => {
      const groupState = mainItem.selectedOptions[group.id];
      if (groupState && groupState.selectedChoiceIds.length > 0) {
        // Use group's title if available, else fallback to group id.
        const groupTitle = group.title || group.id;
        const choices = group.choices
          .filter((choice: any) => groupState.selectedChoiceIds.includes(choice.id))
          .map((choice: any) => {
            let nestedInfo = "";
            if (
              choice.nestedOptionGroup &&
              groupState.nestedSelections &&
              groupState.nestedSelections[choice.id] &&
              groupState.nestedSelections[choice.id].length > 0
            ) {
              nestedInfo = " (" + choice.nestedOptionGroup.choices
                .filter((nested: any) =>
                  groupState.nestedSelections[choice.id].includes(nested.id)
                )
                .map((nested: any) => nested.label || nested.id)
                .join(", ") + ")";
            }
            return choice.label + nestedInfo;
          });
        accompaniments.push(`${groupTitle}: ${choices.join(", ")}`);
      }
    });

    return accompaniments.length > 0 ? (
      <div className={styles.accompanimentsSection}>
        <h4>Accompaniments</h4>
        <p>{accompaniments.join(" | ")}</p>
      </div>
    ) : null;
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>Order #{order.orderId} Details</h2>
          <button className={styles.closeButton} onClick={onClose}>
            &times;
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.detailRow}>
            <span className={styles.label}>Status:</span>
            <span className={styles.value}>{order.status}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.label}>Order Type:</span>
            <span className={styles.value}>{order.orderType || "N/A"}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.label}>Total Amount:</span>
            <span className={styles.value}>${order.totalAmount.toFixed(2)}</span>
          </div>
          {order.customerName && (
            <div className={styles.detailRow}>
              <span className={styles.label}>Customer:</span>
              <span className={styles.value}>{order.customerName}</span>
            </div>
          )}
          {order.customerAddress && (
            <div className={styles.detailRow}>
              <span className={styles.label}>Address:</span>
              <span className={styles.value}>{order.customerAddress}</span>
            </div>
          )}
          <div className={styles.itemsSection}>
            <h4>Items</h4>
            {mainItem ? (
              <div className={styles.mainItemDetail}>
                <span className={styles.itemName}>
                  {mainItem.title || mainItem.name} x{mainItem.quantity}
                </span>
                {customerNote && (
                  <p className={styles.note}>
                    <em>Note:</em> {customerNote}
                  </p>
                )}
              </div>
            ) : (
              <p>No main item found.</p>
            )}
          </div>
          {renderAccompaniments()}
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;
