"use client";

import React, { createContext, useState, ReactNode, useEffect } from "react";

export interface Order {
  items: any[];
  schedule: string | null;
  orderType: string | null;
}

export interface OrderContextType {
  order: Order;
  setOrder: React.Dispatch<React.SetStateAction<Order>>;
  setSchedule: (isoString: string, orderType?: string) => void;
  clearSchedule: () => void;
}

export const OrderContext = createContext<OrderContextType | undefined>(undefined);

const LOCAL_STORAGE_ORDER_KEY = "orderState";

interface OrderProviderProps {
  children: ReactNode;
}

export const OrderProvider: React.FC<OrderProviderProps> = ({ children }) => {
  // Lazy initializer for order state.
  const getInitialOrder = (): Order => {
    if (typeof window !== "undefined") {
      const storedOrder = localStorage.getItem(LOCAL_STORAGE_ORDER_KEY);
      if (storedOrder) {
        try {
          return JSON.parse(storedOrder);
        } catch (error) {
          console.error("Error parsing order from localStorage", error);
        }
      }
    }
    return { items: [], schedule: null, orderType: null };
  };

  const [order, setOrder] = useState<Order>(getInitialOrder);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Write the order state to localStorage on change.
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_ORDER_KEY, JSON.stringify(order));
    }
  }, [order]);

  const setSchedule = (isoString: string, type?: string) => {
    setOrder((prev) => ({
      ...prev,
      schedule: isoString,
      orderType: type ?? prev.orderType,
    }));
  };

  const clearSchedule = () => {
    setOrder((prev) => ({
      ...prev,
      schedule: null,
      orderType: null,
    }));
  };

  // Do not render children until we've mounted on the client.
  if (!hasMounted) return null;

  return (
    <OrderContext.Provider value={{ order, setOrder, setSchedule, clearSchedule }}>
      {children}
    </OrderContext.Provider>
  );
};
