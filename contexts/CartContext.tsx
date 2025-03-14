"use client";

import React, { createContext, useState, ReactNode, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { CartItem, Accompaniment, AccompanimentGroup } from "../utils/types";

interface CartContextType {
  cartItems: CartItem[];
  isSidebarCartOpen: boolean;
  addToCart: (
    item: Omit<
      CartItem,
      "cartItemId" | "quantity" | "selectedAccompaniments" | "availableAccompanimentGroups"
    >,
    quantity: number,
    specialInstructions: string,
    spiceLevel?: string,
    selectedAccompaniments?: { [groupId: string]: Accompaniment[] },
    availableAccompanimentGroups?: AccompanimentGroup[]
  ) => void;
  removeFromCart: (cartItemId: string) => void;
  increaseQuantity: (cartItemId: string) => void;
  decreaseQuantity: (cartItemId: string) => void;
  updateCartItem: (updatedItem: CartItem) => void;
  getTotalPrice: () => number;
  openSidebarCart: () => void;
  closeSidebarCart: () => void;
  clearCart: () => void;
}

export const CartContext = createContext<CartContextType | undefined>(undefined);

const LOCAL_STORAGE_CART_KEY = "cartItems";

export function CartProvider({ children }: { children: ReactNode }) {
  // Lazy initializer to read from localStorage (only on client)
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

  const [cartItems, setCartItems] = useState<CartItem[]>(getInitialCart);
  const [isSidebarCartOpen, setIsSidebarCartOpen] = useState<boolean>(false);
  const [hasMounted, setHasMounted] = useState(false);

  // Set mounted flag to ensure client-only rendering (avoids hydration mismatches)
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Persist cart items whenever they change.
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_CART_KEY, JSON.stringify(cartItems));
    }
  }, [cartItems]);

  const addToCart = (
    item: Omit<CartItem, "cartItemId" | "quantity" | "selectedAccompaniments" | "availableAccompanimentGroups">,
    quantity: number,
    specialInstructions: string,
    spiceLevel?: string,
    selectedAccompaniments?: { [groupId: string]: Accompaniment[] },
    availableAccompanimentGroups?: AccompanimentGroup[]
  ) => {
    const cartItemId = uuidv4();
    const newItem: CartItem = {
      cartItemId,
      id: item.id,
      title: item.title,
      description: item.description,
      price: item.price,
      image: item.image,
      hasSpiceLevel: item.hasSpiceLevel,
      quantity,
      specialInstructions,
      spiceLevel: spiceLevel || "",
      // Ensure selectedAccompaniments always defaults to an object
      selectedAccompaniments: selectedAccompaniments || {},
      availableAccompanimentGroups: availableAccompanimentGroups || [],
      accompanimentGroups: availableAccompanimentGroups,
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

  // Updated getTotalPrice: uses a fallback to {} for selectedAccompaniments
  const getTotalPrice = (): number => {
    return cartItems.reduce((total, item) => {
      // Fallback to empty object if selectedAccompaniments is undefined or null
      const accompanimentsCost = Object.values(item.selectedAccompaniments || {}).reduce(
        (groupTotal, groupSelections) =>
          groupTotal + groupSelections.reduce((acc, accompaniment) => acc + accompaniment.price, 0),
        0
      );
      return total + (item.price + accompanimentsCost) * item.quantity;
    }, 0);
  };

  const openSidebarCart = () => setIsSidebarCartOpen(true);
  const closeSidebarCart = () => setIsSidebarCartOpen(false);
  const clearCart = () => setCartItems([]);

  // Delay rendering until after client-side mount to avoid hydration issues
  if (!hasMounted) return null;

  return (
    <CartContext.Provider
      value={{
        cartItems,
        isSidebarCartOpen,
        addToCart,
        removeFromCart,
        increaseQuantity,
        decreaseQuantity,
        updateCartItem,
        getTotalPrice,
        openSidebarCart,
        closeSidebarCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
