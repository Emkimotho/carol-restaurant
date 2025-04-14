// File: contexts/CartContext.tsx
"use client";

import React, { createContext, useState, ReactNode, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { CartItem } from "@/utils/types";

// -- Type for selected options on a cart item.
interface SelectedOptions {
  [groupId: string]: {
    selectedChoiceIds: string[];
    nestedSelections?: { [choiceId: string]: string[] };
  };
}

// -- Order status types.
export type OrderStatus = "none" | "asap" | "scheduled";

// -- Cart context type including state and functions.
export interface CartContextType {
  cartItems: CartItem[];
  savedItems: CartItem[];
  isSidebarCartOpen: boolean;
  orderStatus: OrderStatus;
  scheduledTime: string | null; // ISO timestamp
  addToCart: (
    item: Omit<CartItem, "cartItemId" | "quantity" | "selectedOptions">,
    quantity: number,
    specialInstructions: string,
    spiceLevel?: string,
    selectedOptions?: SelectedOptions
  ) => void;
  removeFromCart: (cartItemId: string) => void;
  increaseQuantity: (cartItemId: string) => void;
  decreaseQuantity: (cartItemId: string) => void;
  updateCartItem: (updatedItem: CartItem) => void;
  getTotalPrice: () => number;
  openSidebarCart: () => void;
  closeSidebarCart: () => void;
  clearCart: () => void;
  moveToSaved: (cartItemId: string) => void;
  moveBackToCart: (cartItemId: string) => void;
  removeFromSaved: (cartItemId: string) => void;
  setOrderStatus: (status: OrderStatus) => void;
  setScheduledTime: (time: string | null) => void;
}

// -- Create the CartContext.
export const CartContext = createContext<CartContextType | undefined>(undefined);

// -- Local Storage Keys.
const LOCAL_STORAGE_CART_KEY = "cartItems";
const LOCAL_STORAGE_ORDER_STATUS_KEY = "orderStatus";
const LOCAL_STORAGE_SCHEDULED_TIME_KEY = "scheduledTime";

// -- CartProvider Props.
interface CartProviderProps {
  children: ReactNode;
}

export function CartProvider({ children }: CartProviderProps) {
  // -- Lazy initializer for cart items.
  const getInitialCart = (): CartItem[] => {
    if (typeof window !== "undefined") {
      const storedCart = localStorage.getItem(LOCAL_STORAGE_CART_KEY);
      if (storedCart) {
        try {
          return JSON.parse(storedCart);
        } catch (error) {
          console.error("Error parsing cart from localStorage", error);
        }
      }
    }
    return [];
  };

  // -- State variables.
  const [cartItems, setCartItems] = useState<CartItem[]>(getInitialCart());
  const [savedItems, setSavedItems] = useState<CartItem[]>([]);
  const [isSidebarCartOpen, setIsSidebarCartOpen] = useState<boolean>(false);
  const [orderStatus, setOrderStatus] = useState<OrderStatus>("none");
  const [scheduledTime, setScheduledTime] = useState<string | null>(null);
  const [hasMounted, setHasMounted] = useState(false);

  // -- On mount, rehydrate orderStatus and scheduledTime from localStorage.
  useEffect(() => {
    setHasMounted(true);
    if (typeof window !== "undefined") {
      const savedStatus = localStorage.getItem(LOCAL_STORAGE_ORDER_STATUS_KEY);
      const savedTime = localStorage.getItem(LOCAL_STORAGE_SCHEDULED_TIME_KEY);
      if (savedStatus) setOrderStatus(savedStatus as OrderStatus);
      if (savedTime) setScheduledTime(savedTime);
    }
  }, []);

  // -- Persist cartItems to localStorage.
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_CART_KEY, JSON.stringify(cartItems));
    }
  }, [cartItems]);

  // -- Persist orderStatus and scheduledTime to localStorage.
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_ORDER_STATUS_KEY, orderStatus);
      if (scheduledTime) {
        localStorage.setItem(LOCAL_STORAGE_SCHEDULED_TIME_KEY, scheduledTime);
      } else {
        localStorage.removeItem(LOCAL_STORAGE_SCHEDULED_TIME_KEY);
      }
    }
  }, [orderStatus, scheduledTime]);

  // -- Check every minute if the scheduled time has expired (15 minutes threshold).
  useEffect(() => {
    const timer = setInterval(() => {
      if (orderStatus === "scheduled" && scheduledTime) {
        const scheduledDate = new Date(scheduledTime);
        const now = new Date();
        if (now.getTime() - scheduledDate.getTime() > 15 * 60 * 1000) {
          setOrderStatus("none");
          setScheduledTime(null);
        }
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [orderStatus, scheduledTime]);

  // -- Cart functions.
  const addToCart = (
    item: Omit<CartItem, "cartItemId" | "quantity" | "selectedOptions">,
    quantity: number,
    specialInstructions: string,
    spiceLevel?: string,
    selectedOptions?: SelectedOptions
  ) => {
    // When adding an item to the cart, include all properties from the item.
    // This will include `cloverItemId` if present.
    const cartItemId = uuidv4();
    const newItem: CartItem = {
      cartItemId,
      ...item,
      quantity,
      specialInstructions,
      spiceLevel: spiceLevel || "",
      selectedOptions: selectedOptions || {},
    };
    setCartItems((prev) => [...prev, newItem]);
  };

  const removeFromCart = (cartItemId: string) => {
    setCartItems((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
  };

  const increaseQuantity = (cartItemId: string) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.cartItemId === cartItemId ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  };

  const decreaseQuantity = (cartItemId: string) => {
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.cartItemId === cartItemId && item.quantity > 1) {
          return { ...item, quantity: item.quantity - 1 };
        }
        return item;
      })
    );
  };

  const updateCartItem = (updatedItem: CartItem) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.cartItemId === updatedItem.cartItemId ? updatedItem : item
      )
    );
  };

  const getTotalPrice = (): number => {
    return cartItems.reduce((total, item) => {
      let optionsCost = 0;
      if (item.selectedOptions) {
        // Implement your own cost calculation logic based on item.selectedOptions here.
        // For example, if each selected option adds a specific cost, sum them up.
      }
      return total + (item.price + optionsCost) * item.quantity;
    }, 0);
  };

  const openSidebarCart = () => setIsSidebarCartOpen(true);
  const closeSidebarCart = () => setIsSidebarCartOpen(false);
  const clearCart = () => setCartItems([]);

  const moveToSaved = (cartItemId: string) => {
    setCartItems((prevCart) => {
      const itemToSave = prevCart.find((i) => i.cartItemId === cartItemId);
      if (!itemToSave) return prevCart;
      setSavedItems((prevSaved) => [...prevSaved, itemToSave]);
      return prevCart.filter((i) => i.cartItemId !== cartItemId);
    });
  };

  const moveBackToCart = (cartItemId: string) => {
    setSavedItems((prevSaved) => {
      const itemToRestore = prevSaved.find((i) => i.cartItemId === cartItemId);
      if (!itemToRestore) return prevSaved;
      setCartItems((prevCart) => [...prevCart, itemToRestore]);
      return prevSaved.filter((i) => i.cartItemId !== cartItemId);
    });
  };

  const removeFromSaved = (cartItemId: string) => {
    setSavedItems((prevSaved) =>
      prevSaved.filter((item) => item.cartItemId !== cartItemId)
    );
  };

  if (!hasMounted) return null;

  return (
    <CartContext.Provider
      value={{
        cartItems,
        savedItems,
        isSidebarCartOpen,
        orderStatus,
        scheduledTime,
        addToCart,
        removeFromCart,
        increaseQuantity,
        decreaseQuantity,
        updateCartItem,
        getTotalPrice,
        openSidebarCart,
        closeSidebarCart,
        clearCart,
        moveToSaved,
        moveBackToCart,
        removeFromSaved,
        setOrderStatus,
        setScheduledTime,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
