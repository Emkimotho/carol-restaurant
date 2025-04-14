// File: contexts/OrderContext.tsx
"use client";

import React, { createContext, useState, ReactNode, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

/**
 * Helper function to generate a human-friendly Order ID.
 * It uses the current date and a portion of a UUID to produce a string like "ORD-20250413-ABC123".
 */
function generateOrderId(): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = uuidv4().split("-")[0].toUpperCase();
  return `ORD-${datePart}-${randomPart}`;
}

/**
 * Interface defining the structure of a delivery address.
 */
export interface DeliveryAddress {
  street: string;
  aptSuite?: string;
  city: string;
  state: string;
  zipCode: string;
  deliveryOption?: string;
  deliveryInstructions?: string;
}

/**
 * The Order interface describes the shape of an order.
 * - `id` is an optional field that will store the database record ID after order creation.
 * - `orderId` is the human-friendly order ID.
 * - `createdAt` holds the creation timestamp, which is important for display purposes.
 * - `status` tracks the current order state (e.g., "ORDER_RECEIVED", "IN_PROGRESS", etc.).
 * - **New Fields:**  
 *    - `customerName` optionally holds the name of the customer.
 *    - `customerAddress` optionally holds the customer's address.
 */
export interface Order {
  id?: string;            // Optional: Primary key from the database when the order is created.
  items: any[];
  schedule: string | null;
  orderType: string | null;
  orderId: string | null; // Human-friendly order ID.
  deliveryAddress?: DeliveryAddress; // May be undefined if not set.
  totalAmount: number;    // Total cost of the order.
  status: string;         // Order status (e.g., "ORDER_RECEIVED", "IN_PROGRESS", etc.)
  createdAt?: string;     // Timestamp when the order was created.
  customerName?: string;  // Optional: Customer's name.
  customerAddress?: string; // Optional: Customer's address.
}

/**
 * OrderContextType defines the methods and state exposed by the OrderContext.
 */
export interface OrderContextType {
  order: Order;
  setOrder: React.Dispatch<React.SetStateAction<Order>>;
  setSchedule: (isoString: string, orderType?: string) => void;
  clearSchedule: () => void;
  setDeliveryAddress: (deliveryAddress: DeliveryAddress) => void;
}

/**
 * Create the OrderContext, which will be used throughout the app.
 */
export const OrderContext = createContext<OrderContextType | undefined>(undefined);

const LOCAL_STORAGE_ORDER_KEY = "orderState";

interface OrderProviderProps {
  children: ReactNode;
}

/**
 * OrderProvider is the context provider for order state management.
 * It handles initialization (with localStorage support), persistence, and provides methods to update the order.
 */
export const OrderProvider: React.FC<OrderProviderProps> = ({ children }) => {
  // 1) Lazy initializer: Attempt to load the order from localStorage.
  const getInitialOrder = (): Order => {
    if (typeof window !== "undefined") {
      const storedOrder = localStorage.getItem(LOCAL_STORAGE_ORDER_KEY);
      if (storedOrder) {
        try {
          const parsed = JSON.parse(storedOrder);
          // Ensure orderId exists; if not, generate one.
          if (!parsed.orderId) {
            parsed.orderId = generateOrderId();
          }
          // Ensure totalAmount is present, defaulting to 0 if not.
          if (typeof parsed.totalAmount !== "number") {
            parsed.totalAmount = 0;
          }
          // Ensure status exists; default to "ORDER_RECEIVED".
          if (!parsed.status) {
            parsed.status = "ORDER_RECEIVED";
          }
          // Ensure createdAt exists; default to the current time.
          if (!parsed.createdAt) {
            parsed.createdAt = new Date().toISOString();
          }
          // Optional fields: customerName and customerAddress remain as is if present.
          localStorage.setItem(LOCAL_STORAGE_ORDER_KEY, JSON.stringify(parsed));
          return parsed;
        } catch (error) {
          console.error("Error parsing order from localStorage", error);
        }
      }
    }
    // Default order if nothing is stored in localStorage.
    return {
      items: [],
      schedule: null,
      orderType: null,
      orderId: generateOrderId(),
      totalAmount: 0,
      status: "ORDER_RECEIVED", // Default status.
      createdAt: new Date().toISOString(),
      // Default customer fields can be left undefined.
      customerName: undefined,
      customerAddress: undefined,
    };
  };

  const [order, setOrder] = useState<Order>(getInitialOrder());
  const [hasMounted, setHasMounted] = useState(false);

  // 2) Mark the component as mounted to prevent SSR mismatches.
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // 3) Persist the order state to localStorage whenever it changes, after the component has mounted.
  useEffect(() => {
    if (!hasMounted) return;
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_ORDER_KEY, JSON.stringify(order));
    }
  }, [order, hasMounted]);

  // 4) setSchedule function: Update schedule (and optionally orderType) if the value has changed.
  const setSchedule = (isoString: string, type?: string) => {
    setOrder((prev) => {
      if (prev.schedule === isoString && (!type || prev.orderType === type)) {
        return prev; // No change.
      }
      return {
        ...prev,
        schedule: isoString,
        orderType: type ?? prev.orderType,
      };
    });
  };

  // 5) clearSchedule function: Clear the schedule and orderType values.
  const clearSchedule = () => {
    setOrder((prev) => {
      if (!prev.schedule && !prev.orderType) return prev; // No change.
      return {
        ...prev,
        schedule: null,
        orderType: null,
      };
    });
  };

  // 6) setDeliveryAddress function: Update the delivery address if it has changed.
  const setDeliveryAddress = (newAddress: DeliveryAddress) => {
    setOrder((prev) => {
      // Build a complete previous address with defaults.
      const oldAddress: DeliveryAddress = {
        street: prev.deliveryAddress?.street || "",
        aptSuite: prev.deliveryAddress?.aptSuite || "",
        city: prev.deliveryAddress?.city || "",
        state: prev.deliveryAddress?.state || "",
        zipCode: prev.deliveryAddress?.zipCode || "",
        deliveryOption: prev.deliveryAddress?.deliveryOption || "",
        deliveryInstructions: prev.deliveryAddress?.deliveryInstructions || "",
      };

      const comparableNew: DeliveryAddress = {
        street: newAddress.street || "",
        aptSuite: newAddress.aptSuite || "",
        city: newAddress.city || "",
        state: newAddress.state || "",
        zipCode: newAddress.zipCode || "",
        deliveryOption: newAddress.deliveryOption || "",
        deliveryInstructions: newAddress.deliveryInstructions || "",
      };

      // If the addresses match, skip updating.
      if (
        oldAddress.street === comparableNew.street &&
        oldAddress.aptSuite === comparableNew.aptSuite &&
        oldAddress.city === comparableNew.city &&
        oldAddress.state === comparableNew.state &&
        oldAddress.zipCode === comparableNew.zipCode &&
        oldAddress.deliveryOption === comparableNew.deliveryOption &&
        oldAddress.deliveryInstructions === comparableNew.deliveryInstructions
      ) {
        return prev; // No change.
      }
      return { ...prev, deliveryAddress: comparableNew };
    });
  };

  // Do not render children until the component has mounted to prevent hydration errors.
  if (!hasMounted) return null;

  return (
    <OrderContext.Provider
      value={{
        order,
        setOrder,
        setSchedule,
        clearSchedule,
        setDeliveryAddress,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};
