"use client";

import React, { createContext, useState, ReactNode, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { CartItem } from "../utils/types";

interface SelectedOptions {
  [groupId: string]: {
    selectedChoiceIds: string[];
    nestedSelections?: { [choiceId: string]: string[] };
  };
}

interface CartContextType {
  cartItems: CartItem[];
  isSidebarCartOpen: boolean;
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
}

export const CartContext = createContext<CartContextType | undefined>(undefined);

const LOCAL_STORAGE_CART_KEY = "cartItems";

export function CartProvider({ children }: { children: ReactNode }) {
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

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(LOCAL_STORAGE_CART_KEY, JSON.stringify(cartItems));
    }
  }, [cartItems]);

  const addToCart = (
    item: Omit<CartItem, "cartItemId" | "quantity" | "selectedOptions">,
    quantity: number,
    specialInstructions: string,
    spiceLevel?: string,
    selectedOptions?: SelectedOptions
  ) => {
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
        Object.values(item.selectedOptions).forEach((group) => {
          // Extend if you want to add adjustments for nested selections.
        });
      }
      return total + (item.price + optionsCost) * item.quantity;
    }, 0);
  };

  const openSidebarCart = () => setIsSidebarCartOpen(true);
  const closeSidebarCart = () => setIsSidebarCartOpen(false);
  const clearCart = () => setCartItems([]);

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
