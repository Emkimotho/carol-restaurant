/* ------------------------------------------------------------------ *
 *  useCartPage – encapsulates all stateful logic for CartPage        *
 * ------------------------------------------------------------------ */
"use client";

import { useEffect, useRef, useState, useContext } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { CartContext } from "@/contexts/CartContext";
import type {
  CartItem,
  MenuItem as MenuItemType,
  MenuItemOptionGroup,
  MenuOptionChoice,
  SelectedOptions,
} from "@/utils/types";

/* ------------------------------------------------------------------ *
 *  CONSTANTS                                                         *
 * ------------------------------------------------------------------ */
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 min
export const MAX_RECS = 6;

/* ------------------------------------------------------------------ *
 *  UTILS                                                             *
 * ------------------------------------------------------------------ */
export const uniqBy = <T, K>(array: T[], keyFn: (t: T) => K): T[] =>
  [...new Map(array.map((item) => [keyFn(item), item])).values()];

const ensureGroupState = (
  prev: SelectedOptions | undefined,
  groupId: string
): SelectedOptions => {
  const next: SelectedOptions = prev ? { ...prev } : {};
  if (next[groupId]) {
    const g = next[groupId];
    next[groupId] = {
      selectedChoiceIds: [...g.selectedChoiceIds],
      nestedSelections: { ...g.nestedSelections },
    };
  } else {
    next[groupId] = { selectedChoiceIds: [], nestedSelections: {} };
  }
  return next;
};

const cartSection = (items: CartItem[]) => {
  if (!items.length) return "Unknown";
  const allMain = items.every(
    (c) => (c.category?.type ?? "MainMenu") === "MainMenu" && !c.showInGolfMenu
  );
  if (allMain) return "MainMenu";
  const allGolf = items.every(
    (c) => c.category?.type === "GolfMenu" || c.showInGolfMenu
  );
  if (allGolf) return "GolfMenu";
  return "Mixed";
};

/* ------------------------------------------------------------------ *
 *  Hook                                                              *
 * ------------------------------------------------------------------ */
export function useCartPage(crossSell: MenuItemType[]) {
  const {
    cartItems,
    savedItems,
    removeFromCart,
    updateCartItem,
    moveToSaved,
    moveBackToCart,
    removeFromSaved,
    clearCart,
  } = useContext(CartContext)!;

  const router = useRouter();
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);
  const [cleared, setCleared] = useState(false);

  /* -------- price helper -------- */
  const priceOf = (item: CartItem) => {
    let total = item.price;
    (item.optionGroups ?? []).forEach((g) => {
      const s = item.selectedOptions?.[g.id];
      if (!s) return;
      g.choices.forEach((c) => {
        if (!s.selectedChoiceIds.includes(c.id)) return;
        if (c.nestedOptionGroup) {
          const nestSel = s.nestedSelections?.[c.id] ?? [];
          c.nestedOptionGroup.choices.forEach((n) => {
            if (nestSel.includes(n.id) && n.priceAdjustment)
              total += n.priceAdjustment;
          });
        } else if (c.priceAdjustment) total += c.priceAdjustment;
      });
    });
    return total * (item.quantity || 1);
  };

  const cartTotal = parseFloat(
    cartItems.reduce((sum, it) => sum + priceOf(it), 0).toFixed(2)
  );

  /* ------------- inactivity timer ------------- */
  const resetTimer = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      clearCart();
      setCleared(true);
      toast.info("Cart cleared after 15 min of inactivity.");
    }, INACTIVITY_TIMEOUT);
  };

  useEffect(() => {
    resetTimer();
    const evs = ["click", "keydown", "mousemove", "touchstart"];
    evs.forEach((ev) => window.addEventListener(ev, resetTimer));
    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      evs.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, []);

  /* ------------- helpers for modifying items ------------- */
  const changeQty = (ci: CartItem, q: number) =>
    q > 0 && updateCartItem({ ...ci, quantity: q });

  const changeNote = (ci: CartItem, v: string) =>
    updateCartItem({ ...ci, specialInstructions: v });

  const changeLvl = (ci: CartItem, v: string) =>
    updateCartItem({ ...ci, spiceLevel: v });

  const updateChoice = (
    ci: CartItem,
    g: MenuItemOptionGroup,
    c: MenuOptionChoice,
    checked: boolean
  ) => {
    const sel = ensureGroupState(ci.selectedOptions, g.id);
    const pg = sel[g.id];
    let ids = [...pg.selectedChoiceIds];

    if (g.optionType === "single-select" || g.optionType === "dropdown") {
      ids = checked ? [c.id] : [];
    } else {
      ids = checked
        ? [...new Set([...ids, c.id])]
        : ids.filter((x) => x !== c.id);
    }

    updateCartItem({
      ...ci,
      selectedOptions: { ...sel, [g.id]: { ...pg, selectedChoiceIds: ids } },
    });
  };

  const updateNested = (
    ci: CartItem,
    g: MenuItemOptionGroup,
    parentId: string,
    nId: string,
    checked: boolean,
    max?: number
  ) => {
    const sel = ensureGroupState(ci.selectedOptions, g.id);
    const pg = sel[g.id];
    const curr = (pg.nestedSelections ?? {})[parentId] ?? [];
    let nextArr = checked
      ? [...new Set([...curr, nId])]
      : curr.filter((x) => x !== nId);

    if (checked && max && nextArr.length > max) {
      toast.error(`Only ${max} allowed`);
      return;
    }

    updateCartItem({
      ...ci,
      selectedOptions: {
        ...sel,
        [g.id]: {
          ...pg,
          nestedSelections: { ...pg.nestedSelections, [parentId]: nextArr },
        },
      },
    });
  };

  /* -------- dedup lists to avoid double-render bug -------- */
  const uniqCart = uniqBy(cartItems, (c) => c.cartItemId);
  const uniqSaved = uniqBy(savedItems, (s) => s.cartItemId);

  /* -------- prepare recommendations (server prop) -------- */
  const section = cartSection(uniqCart);
  const idsInCartSet = new Set(uniqCart.map((c) => c.id));

  const eligible = crossSell.filter((cs) => {
    if (idsInCartSet.has(cs.id)) return false;
    if (section === "MainMenu")
      return cs.category?.type === "MainMenu" && !cs.showInGolfMenu;
    if (section === "GolfMenu")
      return cs.category?.type === "GolfMenu" || cs.showInGolfMenu;
    return true; // Mixed / Unknown
  });

  const recs = eligible.slice(0, MAX_RECS);

  return {
    router,
    cleared,
    cartTotal,
    uniqCart,
    uniqSaved,
    recs,
    priceOf,
    changeQty,
    changeNote,
    changeLvl,
    updateChoice,
    updateNested,
    removeFromCart,
    moveToSaved,
    moveBackToCart,
    removeFromSaved,
  };
}
