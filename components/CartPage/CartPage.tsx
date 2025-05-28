// File: components/CartPage.tsx
/* eslint-disable react/jsx-key */
"use client";

import React, { useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "react-toastify";
import { CartContext } from "@/contexts/CartContext";
import type {
  CartItem,
  MenuItemOptionGroup,
  MenuOptionChoice,
  SelectedOptions,
} from "@/utils/types";
import styles from "./CartPage.module.css";

/* ------------------------------------------------------------------
 * CONSTANTS
 * ------------------------------------------------------------------ */
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const MAX_RECS           = 6;              // max unique recs shown

/* ------------------------------------------------------------------
 * HELPERS
 * ------------------------------------------------------------------ */
const shuffle = <T,>(arr: T[]) => [...arr].sort(() => 0.5 - Math.random());

const uniqBy = <T, K>(array: T[], keyFn: (t: T) => K): T[] =>
  [...new Map(array.map((item) => [keyFn(item), item])).values()];

/** Deep‑safe scaffold for selectedOptions[groupId] */
function ensureGroupState(
  prev: SelectedOptions | undefined,
  groupId: string
): SelectedOptions {
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
}

function cartSection(items: CartItem[]) {
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
}

/* ------------------------------------------------------------------
 * COMPONENT
 * ------------------------------------------------------------------ */
export default function CartPage() {
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

  const router                       = useRouter();
  const inactivityTimer              = useRef<NodeJS.Timeout | null>(null);
  const [recs, setRecs]              = useState<CartItem[]>([]);
  const [cleared, setCleared]        = useState(false);

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
          c.nestedOptionGroup.choices.forEach(
            (n) => nestSel.includes(n.id) && n.priceAdjustment && (total += n.priceAdjustment)
          );
        } else if (c.priceAdjustment) total += c.priceAdjustment;
      });
    });
    return total * (item.quantity || 1);
  };

  const cartTotal = parseFloat(
    cartItems.reduce((sum, it) => sum + priceOf(it), 0).toFixed(2)
  );

  /* -------- recommendations fetch -------- */
  useEffect(() => {
    (async () => {
      try {
        const r  = await fetch("/api/recommendations");
        if (!r.ok) throw new Error("fetch fail");
        const all: CartItem[] = await r.json();

        const section      = cartSection(cartItems);
        const idsInCartSet = new Set(cartItems.map((c) => c.id));

        const eligible = all.filter((rec) => {
          if (idsInCartSet.has(rec.id)) return false;
          if (section === "MainMenu")
            return rec.category?.type === "MainMenu" && !rec.showInGolfMenu;
          if (section === "GolfMenu")
            return rec.category?.type === "GolfMenu" || rec.showInGolfMenu;
          return true; // Mixed / Unknown
        });

        /* diversity: round‑robin by sub‑category */
        const buckets = new Map<string, CartItem[]>();
        eligible.forEach((rec) => {
          if (!rec.category?.id) return;
          (buckets.get(rec.category.id) ?? buckets.set(rec.category.id, []).get(rec.category.id)!).push(rec);
        });

        const order = shuffle([...buckets.keys()]);
        const picks: CartItem[] = [];
        while (picks.length < MAX_RECS && order.length) {
          for (let i = 0; i < order.length && picks.length < MAX_RECS; i++) {
            const id   = order[i];
            const pile = buckets.get(id)!;
            if (!pile.length) { order.splice(i, 1); i--; continue; }
            picks.push(pile.shift()!);
          }
        }

        setRecs(picks);
      } catch (err) {
        console.error("rec error:", err);
      }
    })();
  }, [cartItems]);

  /* -------- inactivity timer -------- */
  const resetTimer = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      clearCart();
      setCleared(true);
      toast.info("Cart cleared after 15 min of inactivity.");
    }, INACTIVITY_TIMEOUT);
  };

  useEffect(() => {
    resetTimer();
    ["click", "keydown", "mousemove", "touchstart"].forEach((ev) =>
      window.addEventListener(ev, resetTimer)
    );
    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      ["click", "keydown", "mousemove", "touchstart"].forEach((ev) =>
        window.removeEventListener(ev, resetTimer)
      );
    };
  }, []);

  /* -------- cart item helper actions -------- */
  const changeQty  = (ci: CartItem, q: number) => q > 0 && updateCartItem({ ...ci, quantity: q });
  const changeNote = (ci: CartItem, v: string) => updateCartItem({ ...ci, specialInstructions: v });
  const changeLvl  = (ci: CartItem, v: string) => updateCartItem({ ...ci, spiceLevel: v });

  const updateChoice = (
    ci: CartItem,
    g: MenuItemOptionGroup,
    c: MenuOptionChoice,
    checked: boolean
  ) => {
    const sel = ensureGroupState(ci.selectedOptions, g.id);
    const pg  = sel[g.id];
    let ids   = [...pg.selectedChoiceIds];
    if (g.optionType === "single-select" || g.optionType === "dropdown") {
      ids = checked ? [c.id] : [];
    } else {
      ids = checked ? [...new Set([...ids, c.id])] : ids.filter((x) => x !== c.id);
    }
    updateCartItem({ ...ci, selectedOptions: { ...sel, [g.id]: { ...pg, selectedChoiceIds: ids } } });
  };

  const updateNested = (
    ci: CartItem,
    g: MenuItemOptionGroup,
    parentId: string,
    nId: string,
    checked: boolean,
    max?: number
  ) => {
    const sel   = ensureGroupState(ci.selectedOptions, g.id);
    const pg    = sel[g.id];
    const curr  = (pg.nestedSelections ?? {})[parentId] ?? [];
    let nextArr = checked ? [...new Set([...curr, nId])] : curr.filter((x) => x !== nId);
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

  /* -------- dedup lists to avoid double‑render bug -------- */
  const uniqCart  = uniqBy(cartItems,  (c) => c.cartItemId);
  const uniqSaved = uniqBy(savedItems, (s) => s.cartItemId);

  /* -------- empty view -------- */
  if (!uniqCart.length && !uniqSaved.length)
    return (
      <div className={styles.cartContainer}>
        {cleared && (
          <p className={styles.inactiveWarning}>
            Your cart was cleared after inactivity.
          </p>
        )}
        <div className={styles.emptyCart}>
          <span className={styles.emptyIcon} />
          <h2 className={styles.emptyTitle}>Your cart is empty</h2>
          <p className={styles.emptySubtitle}>
            Looks like you haven’t added anything yet.
          </p>
          <button onClick={() => router.push("/menu")} className={styles.menuBtn}>
            Back to Menu
          </button>
        </div>
      </div>
    );

  /* ----------------------------------------------------------------
   *  MAIN RENDER
   * ---------------------------------------------------------------- */
  return (
    <div className={styles.cartContainer}>
      {/* ========= Header ========= */}
      <div className={styles.cartHeader}>
        <span className={styles.cartHeaderIcon} aria-label="Cart" />
        <h1 className={styles.pageTitle}>Your Cart</h1>
        <p className={styles.cartSubtitle}>
          Review your selections below, then proceed to checkout.
        </p>
      </div>

      {/* ========= Cart Items ========= */}
      {uniqCart.length > 0 && (
        <div className={styles.cartItemsContainer}>
          {uniqCart.map((item, idx) => {
            const groups = item.optionGroups ?? [];
            const alreadySaved = uniqSaved.some((s) => s.cartItemId === item.cartItemId);
            return (
              <div key={item.cartItemId} className={`${styles.cartItem} fade-in`}>
                {/* --- header row --- */}
                <div className={styles.itemHeader}>
                  <div className={styles.itemNumber}>{idx + 1}.</div>
                  {item.image && (
                    <div className={styles.thumbnail}>
                      <Image
                        src={item.image}
                        alt={item.title}
                        width={150}
                        height={150}
                        unoptimized
                        className={styles.itemThumbnail}
                      />
                    </div>
                  )}
                  <div className={styles.itemInfo}>
                    <h3 className={styles.itemTitle}>{item.title}</h3>
                    {item.description && (
                      <p className={styles.itemDesc}>{item.description}</p>
                    )}
                  </div>
                  <div className={styles.actionButtons}>
                    <button
                      onClick={() => removeFromCart(item.cartItemId)}
                      className={styles.removeBtn}
                    >
                      Remove
                    </button>
                    <button
                      onClick={() => !alreadySaved && moveToSaved(item.cartItemId)}
                      className={styles.saveLaterBtn}
                      disabled={alreadySaved}
                      title={alreadySaved ? "Already saved" : "Save for later"}
                    >
                      {alreadySaved ? "Saved" : "Save for Later"}
                    </button>
                  </div>
                </div>

                {/* --- quantity --- */}
                <div className={styles.quantityRow}>
                  <label>Quantity:</label>
                  <button
                    className={styles.stepBtn}
                    onClick={() => changeQty(item, item.quantity - 1)}
                  >
                    –
                  </button>
                  <span className={styles.quantityValue}>{item.quantity}</span>
                  <button
                    className={styles.stepBtn}
                    onClick={() => changeQty(item, item.quantity + 1)}
                  >
                    +
                  </button>
                </div>

                {/* --- spice level --- */}
                {item.hasSpiceLevel && (
                  <div className={styles.spiceLevelRow}>
                    <label>Spice Level:</label>
                    <div className={styles.spiceButtons}>
                      {["No Spice", "Mild", "Medium", "Hot"].map((lvl) => (
                        <button
                          key={lvl}
                          className={
                            item.spiceLevel === lvl
                              ? `${styles.spiceBtn} ${styles.activeSpiceBtn}`
                              : styles.spiceBtn
                          }
                          onClick={() => changeLvl(item, lvl)}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* --- option groups --- */}
                {groups.length > 0 && (
                  <div className={styles.optionGroupsContainer}>
                    {groups.map((g) => {
                      const state =
                        item.selectedOptions?.[g.id] ?? {
                          selectedChoiceIds: [],
                          nestedSelections: {},
                        };
                      return (
                        <div key={g.id} className={styles.optionGroup}>
                          <h4 className={styles.optionGroupTitle}>
                            {g.title} (Select {g.minRequired}
                            {g.maxAllowed ? ` - ${g.maxAllowed}` : ""})
                          </h4>
                          {g.optionType === "dropdown" ? (
                            <select
                              className={styles.dropdownSelect}
                              value={state.selectedChoiceIds[0] || ""}
                              onChange={(e) => {
                                const ch = g.choices.find(
                                  (x) => x.id === e.target.value
                                );
                                ch && updateChoice(item, g, ch, true);
                              }}
                            >
                              <option value="">-- Select --</option>
                              {g.choices.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.label}
                                  {!c.nestedOptionGroup && c.priceAdjustment
                                    ? ` (+$${c.priceAdjustment.toFixed(2)})`
                                    : ""}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className={styles.optionList}>
                              {g.choices.map((c) => {
                                const checked = state.selectedChoiceIds.includes(c.id);
                                return (
                                  <div key={c.id} className={styles.choiceRow}>
                                    <label>
                                      <input
                                        type={g.optionType === "single-select" ? "radio" : "checkbox"}
                                        checked={checked}
                                        name={`g-${g.id}`}
                                        onChange={(e) =>
                                          updateChoice(item, g, c, e.target.checked)
                                        }
                                      />
                                      {c.label}
                                      {!c.nestedOptionGroup && c.priceAdjustment
                                        ? ` (+$${c.priceAdjustment.toFixed(2)})`
                                        : ""}
                                    </label>

                                    {c.nestedOptionGroup && checked && (
                                      <div className={styles.nestedOptions}>
                                        <h5 className={styles.nestedGroupTitle}>
                                          {c.nestedOptionGroup.title} (Select{" "}
                                          {c.nestedOptionGroup.minRequired}
                                          {c.nestedOptionGroup.maxAllowed
                                            ? ` - ${c.nestedOptionGroup.maxAllowed}`
                                            : ""}
                                          )
                                        </h5>
                                        {c.nestedOptionGroup.choices.map((n) => {
                                          const nSel =
                                            state.nestedSelections?.[c.id] ?? [];
                                          const nChecked = nSel.includes(n.id);
                                          return (
                                            <div
                                              key={n.id}
                                              className={styles.nestedChoiceRow}
                                            >
                                              <label>
                                                <input
                                                  type="checkbox"
                                                  checked={nChecked}
                                                  onChange={(e) =>
                                                    updateNested(
                                                      item,
                                                      g,
                                                      c.id,
                                                      n.id,
                                                      e.target.checked,
                                                      c.nestedOptionGroup?.maxAllowed
                                                    )
                                                  }
                                                />
                                                {n.label}
                                                {n.priceAdjustment
                                                  ? ` (+$${n.priceAdjustment.toFixed(2)})`
                                                  : ""}
                                              </label>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* --- instructions --- */}
                <div className={styles.instructionsRow}>
                  <label>Special Instructions:</label>
                  <textarea
                    className={styles.instructionsInput}
                    rows={2}
                    value={item.specialInstructions || ""}
                    onChange={(e) => changeNote(item, e.target.value)}
                  />
                </div>

                {/* --- price --- */}
                <p className={styles.itemPrice}>
                  Item&nbsp;Price:&nbsp;${priceOf(item).toFixed(2)}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* ========= Saved for later ========= */}
      {uniqSaved.length > 0 && (
        <div className={styles.savedContainer}>
          <h2 className={styles.savedTitle}>Saved for Later</h2>
          <div className={styles.savedItemsWrapper}>
            {uniqSaved.map((item) => (
              <div key={item.cartItemId} className={styles.savedItem}>
                {item.image && (
                  <Image
                    src={item.image}
                    alt={item.title}
                    width={80}
                    height={80}
                    unoptimized
                    className={styles.savedThumbnail}
                  />
                )}
                <div className={styles.savedInfo}>
                  <p className={styles.savedItemTitle}>{item.title}</p>
                  <p className={styles.savedItemPrice}>
                    ${item.price.toFixed(2)}
                  </p>
                </div>
                <div className={styles.savedActions}>
                  <button
                    className={styles.returnBtn}
                    onClick={() => moveBackToCart(item.cartItemId)}
                  >
                    Move to Cart
                  </button>
                  <button
                    className={styles.removeSavedBtn}
                    onClick={() => removeFromSaved(item.cartItemId)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========= Recommendations ========= */}
      <div className={styles.recommendationsContainer}>
        <h2 className={styles.recommendTitle}>You may also like</h2>
        {recs.length ? (
          <div className={styles.marqueeWrapper}>
            <div className={styles.marqueeTrack}>
              {[...recs.slice(0, 3), ...recs.slice(0, 3)].map((rec, i) => (
                <div
                  key={rec.id + "-" + i}
                  className={styles.recommendItem}
                  onClick={() => router.push(`/menuitem/${rec.id}`)}
                >
                  <div className={styles.recommendImageContainer}>
                    {/* fallback prevents layout shift if no img */}
                    <Image
                      src={rec.image || "/placeholder.png"}
                      alt={rec.title}
                      fill
                      unoptimized
                      className={styles.recommendThumbnail}
                    />
                  </div>
                  <button className={styles.addRecommendBtn}>View / Add</button>
                  <div className={styles.recommendInfo}>
                    <p className={styles.recommendItemTitle}>{rec.title}</p>
                    <p className={styles.recommendItemPrice}>
                      ${rec.price.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p>No additional recommendations.</p>
        )}
      </div>

      {/* ========= Footer ========= */}
      {uniqCart.length > 0 && (
        <div className={styles.cartFooter}>
          <h2 className={styles.cartTotal}>Total: ${cartTotal.toFixed(2)}</h2>
          <div className={styles.footerButtons}>
            <button
              onClick={() => router.push("/checkout")}
              className={styles.checkoutBtn}
            >
              Proceed to Checkout
            </button>
            <button onClick={clearCart} className={styles.clearBtn}>
              Clear Cart
            </button>
            <button onClick={() => router.push("/menu")} className={styles.menuBtn}>
              Back to Menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
