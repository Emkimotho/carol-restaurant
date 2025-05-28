/* =================================================================== */
/*  File: contexts/CartContext.tsx                                     */
/* ------------------------------------------------------------------- */
/*  • Tracks cart state, saved‑for‑later items, schedule & menu‑type.  */
/*  • NEW getTotalPrice():                                             */
/*      – Adds parent priceAdjustment only when that parent has        */
/*        NO nestedOptionGroup.                                        */
/*      – Always adds the priceAdjustments for any selected nested     */
/*        choices.                                                     */
/* =================================================================== */

"use client";

import React, {
  createContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { v4 as uuidv4 } from "uuid";
import { CartItem }     from "@/utils/types";

/* ------------------------------------------------------------------ */
/*  Helper types                                                      */
/* ------------------------------------------------------------------ */
interface SelectedOptions {
  [groupId: string]: {
    selectedChoiceIds: string[];
    nestedSelections?: { [choiceId: string]: string[] };
  };
}

export type OrderStatus = "none" | "asap" | "scheduled";
export type MenuType    = "MAIN" | "GOLF" | "MIXED" | null;

/* ------------------------------------------------------------------ */
export interface CartContextType {
  /* state */
  cartItems:           CartItem[];
  savedItems:          CartItem[];

  orderStatus:         OrderStatus;
  scheduledTime:       string | null;
  setOrderStatus:      (s: OrderStatus)   => void;
  setScheduledTime:    (t: string|null)   => void;

  /* menu flags */
  menuType:            MenuType;
  isGolfOrder:         boolean;

  /* cart operations */
  addToCart: (
    item: Omit<CartItem, "cartItemId" | "quantity" | "selectedOptions">,
    quantity: number,
    specialInstructions: string,
    spiceLevel?: string,
    selectedOptions?: SelectedOptions,
    sourceMenu?: "MAIN" | "GOLF"
  ) => void;
  removeFromCart:      (id: string)   => void;
  increaseQuantity:    (id: string)   => void;
  decreaseQuantity:    (id: string)   => void;
  updateCartItem:      (it: CartItem) => void;
  clearCart:           ()             => void;

  /* saved‑for‑later */
  moveToSaved:         (id: string)   => void;
  moveBackToCart:      (id: string)   => void;
  removeFromSaved:     (id: string)   => void;

  /* utils */
  getTotalPrice:       () => number;
}

export const CartContext =
  createContext<CartContextType | undefined>(undefined);

/* ------------------------------------------------------------------ */
/*           local‑storage keys                                        */
/* ------------------------------------------------------------------ */
const LS_CART   = "cartItems";
const LS_STATUS = "orderStatus";
const LS_TIME   = "scheduledTime";
const LS_MENU   = "menuType";

interface CartProviderProps { children: ReactNode; }

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  /* ------------ hydrate cart (client only) ------------- */
  const initCart = (): CartItem[] => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(LS_CART);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  /* ------------ infer / restore menu‑type --------------- */
  const initMenuType = (): MenuType => {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(LS_MENU) as MenuType | null;
      if (stored) return stored;
      const path = window.location.pathname.toLowerCase();
      return path.includes("/golf") ? "GOLF" : "MAIN";
    } catch {
      return null;
    }
  };

  /* ----------------------- state ----------------------- */
  const [cartItems, setCartItems]         = useState<CartItem[]>(initCart);
  const [savedItems, setSavedItems]       = useState<CartItem[]>([]);

  const [orderStatus, setOrderStatus]     = useState<OrderStatus>("none");
  const [scheduledTime, setScheduledTime] = useState<string|null>(null);

  const [menuType, setMenuType]           = useState<MenuType>(initMenuType);
  const [isGolfOrder, setIsGolfOrder]     = useState(
    initMenuType() === "GOLF" || initMenuType() === "MIXED"
  );

  /* --------------- load status / time ------------------ */
  useEffect(() => {
    if (typeof window !== "undefined") {
      const st = localStorage.getItem(LS_STATUS);
      const tm = localStorage.getItem(LS_TIME);
      if (st) setOrderStatus(st as OrderStatus);
      if (tm) setScheduledTime(tm);
    }
  }, []);

  /* -------------- persist cart array ------------------- */
  useEffect(() => {
    localStorage.setItem(LS_CART, JSON.stringify(cartItems));
  }, [cartItems]);

  /* -------------- persist status/time ------------------ */
  useEffect(() => {
    localStorage.setItem(LS_STATUS, orderStatus);
    if (scheduledTime) {
      localStorage.setItem(LS_TIME, scheduledTime);
    } else {
      localStorage.removeItem(LS_TIME);
    }
  }, [orderStatus, scheduledTime]);

  /* -------------- persist + flag menu‑type ------------- */
  useEffect(() => {
    localStorage.setItem(LS_MENU, menuType || "");
    setIsGolfOrder(menuType === "GOLF" || menuType === "MIXED");
  }, [menuType]);

  /* ---------- 15‑minute stale‑guard on schedule -------- */
  useEffect(() => {
    const id = setInterval(() => {
      if (orderStatus === "scheduled" && scheduledTime) {
        const diff = Date.now() - new Date(scheduledTime).getTime();
        if (diff > 15 * 60_000) {
          setOrderStatus("none");
          setScheduledTime(null);
        }
      }
    }, 60_000);
    return () => clearInterval(id);
  }, [orderStatus, scheduledTime]);

  /* ---------------- addToCart (core) ------------------- */
  const addToCart = (
    item: Omit<CartItem, "cartItemId" | "quantity" | "selectedOptions">,
    quantity: number,
    specialInstructions: string,
    spiceLevel: string = "",
    selectedOptions: SelectedOptions = {},
    sourceMenu?: "MAIN" | "GOLF"
  ) => {
    const intrinsic: MenuType =
      // @ts‑ignore – category may be undefined
      item.category?.type === "GolfMenu" ? "GOLF" : "MAIN";

    let inferredFromPath: MenuType | undefined;
    if (!sourceMenu && typeof window !== "undefined") {
      const path = window.location.pathname.toLowerCase();
      inferredFromPath = path.includes("/golf") ? "GOLF" : "MAIN";
    }

    const incoming: MenuType =
      sourceMenu ?? inferredFromPath ?? intrinsic;

    let newMode: MenuType = incoming;
    if (menuType && menuType !== incoming) newMode = "MIXED";

    const cartItem: CartItem = {
      cartItemId: uuidv4(),
      ...item,
      quantity,
      specialInstructions,
      spiceLevel,
      selectedOptions,
    };

    setCartItems(prev => [...prev, cartItem]);
    setMenuType(newMode);
  };

  /* ---------------- item mutators ---------------------- */
  const removeFromCart = (id: string) =>
    setCartItems(prev => prev.filter(i => i.cartItemId !== id));

  const increaseQuantity = (id: string) =>
    setCartItems(prev =>
      prev.map(i =>
        i.cartItemId === id ? { ...i, quantity: i.quantity + 1 } : i
      )
    );

  const decreaseQuantity = (id: string) =>
    setCartItems(prev =>
      prev.map(i =>
        i.cartItemId === id && i.quantity > 1
          ? { ...i, quantity: i.quantity - 1 }
          : i
      )
    );

  const updateCartItem = (u: CartItem) =>
    setCartItems(prev =>
      prev.map(i => (i.cartItemId === u.cartItemId ? u : i))
    );

  /* ---------------- stable clearCart ------------------ */
  const clearCart = useCallback(() => {
    setCartItems([]);
    setSavedItems([]);
    setMenuType(null);
    setIsGolfOrder(false);
    localStorage.removeItem(LS_MENU);
  }, []);

  /* -------------- saved‑for‑later ---------------------- */
  const moveToSaved = (id: string) =>
    setCartItems(prev => {
      const found = prev.find(i => i.cartItemId === id);
      if (!found) return prev;
      setSavedItems(s => [...s, found]);
      return prev.filter(i => i.cartItemId !== id);
    });

  const moveBackToCart = (id: string) =>
    setSavedItems(prev => {
      const found = prev.find(i => i.cartItemId === id);
      if (!found) return prev;
      setCartItems(c => [...c, found]);
      return prev.filter(i => i.cartItemId !== id);
    });

  const removeFromSaved = (id: string) =>
    setSavedItems(prev => prev.filter(i => i.cartItemId !== id));

  /* ------------------- totals -------------------------- */
  const getTotalPrice = (): number =>
    cartItems.reduce((sum, it) => {
      let extras = 0;

      if (it.optionGroups && it.selectedOptions) {
        it.optionGroups.forEach(group => {
          const sel = it.selectedOptions?.[group.id];
          if (!sel) return;

          group.choices.forEach(choice => {
            if (!sel.selectedChoiceIds.includes(choice.id)) return;

            /* Parent priceAdjustment is charged *only* when there is no nested group */
            if (!choice.nestedOptionGroup) {
              extras += choice.priceAdjustment ?? 0;
            }

            /* Nested selections – always charge their priceAdjustment */
            if (choice.nestedOptionGroup) {
              const nestedSel = sel.nestedSelections?.[choice.id] ?? [];
              choice.nestedOptionGroup.choices.forEach(n => {
                if (nestedSel.includes(n.id)) extras += n.priceAdjustment ?? 0;
              });
            }
          });
        });
      }

      return sum + (it.price + extras) * it.quantity;
    }, 0);

  /* ---------------- provider --------------------------- */
  return (
    <CartContext.Provider
      value={{
        cartItems,
        savedItems,
        orderStatus,
        scheduledTime,
        setOrderStatus,
        setScheduledTime,
        menuType,
        isGolfOrder,

        addToCart,
        removeFromCart,
        increaseQuantity,
        decreaseQuantity,
        updateCartItem,
        clearCart,

        moveToSaved,
        moveBackToCart,
        removeFromSaved,

        getTotalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
