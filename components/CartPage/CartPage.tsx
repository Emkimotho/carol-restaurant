/* eslint-disable react/jsx-key */
"use client";

/* Section 1: Imports */
import React from "react";
import Image from "next/image";
import styles from "./CartPage.module.css";
import { getCloudinaryImageUrl } from "@/lib/cloudinary-client";
import { useCartPage, MAX_RECS } from "./useCartPage";
import type { CartItem, MenuItem as MenuItemType } from "@/utils/types";

/* Section 2: Props */
interface CartPageProps {
  cart: CartItem[];            // passed by the route but not used here
  crossSell: MenuItemType[];   // server-side cross-sell suggestions
}

/* Section 3: Component */
export default function CartPage({ cart, crossSell }: CartPageProps) {
  /* Section 3.1: Hook */
  const {
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
  } = useCartPage(crossSell);

  /* Section 4: Empty Cart View */
  if (!uniqCart.length && !uniqSaved.length) {
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
          <button
            onClick={() => router.push("/menu")}
            className={styles.menuBtn}
          >
            Back to Menu
          </button>
        </div>
      </div>
    );
  }

  /* Section 5: Main Render */
  return (
    <div className={styles.cartContainer}>
      {/* Section 5.1: Header */}
      <div className={styles.cartHeader}>
        <span className={styles.cartHeaderIcon} aria-label="Cart" />
        <h1 className={styles.pageTitle}>Your Cart</h1>
        <p className={styles.cartSubtitle}>
          Review your selections below, then proceed to checkout.
        </p>
      </div>

      {/* Section 5.2: Cart Items */}
      {uniqCart.length > 0 && (
        <div className={styles.cartItemsContainer}>
          {uniqCart.map((item, idx) => {
            const groups = item.optionGroups ?? [];
            const alreadySaved = uniqSaved.some(
              (s) => s.cartItemId === item.cartItemId
            );

            return (
              /* Section 5.2.1: Cart Item Row */
              <div
                key={item.cartItemId}
                className={`${styles.cartItem} fade-in`}
              >
             {/* Section 5.2.1.1: Item Header */}
<div className={styles.itemHeader}>
  <div className={styles.itemNumber}>{idx + 1}.</div>

  {/* Thumbnail */}
  {(() => {
    const thumbSrc = item.cloudinaryPublicId
      ? getCloudinaryImageUrl(item.cloudinaryPublicId, 150, 150)
      : item.imageUrl ?? item.image;
    if (!thumbSrc) return null;
    console.log("Cart thumbnail src:", thumbSrc);
    return (
      <div className={styles.thumbnail}>
        <Image
          src={thumbSrc}
          alt={item.title}
          width={150}
          height={150}
          unoptimized
          sizes="(max-width:480px) 80px, 150px"
          priority={idx < 2}
          style={{ width: "auto", height: "auto" }}
          className={styles.itemThumbnail}
        />
      </div>
    );
  })()}

  {/* Title & Description */}
  <div className={styles.itemInfo}>
    <h3 className={styles.itemTitle}>{item.title}</h3>
    {item.description && (
      <p className={styles.itemDesc}>{item.description}</p>
    )}
  </div>

  {/* Remove / Save for Later */}
  <div className={styles.actionButtons}>
    <button
      type="button"
      onClick={() => removeFromCart(item.cartItemId)}
      className={styles.removeBtn}
    >
      Remove
    </button>
    <button
      type="button"
      onClick={() => !alreadySaved && moveToSaved(item.cartItemId)}
      className={styles.saveLaterBtn}
      disabled={alreadySaved}
      title={alreadySaved ? "Already saved" : "Save for later"}
    >
      {alreadySaved ? "Saved" : "Save for Later"}
    </button>
  </div>
</div>

                {/* Section 5.2.1.2: Quantity Row */}
                <div className={styles.quantityRow}>
                  <label>Quantity:</label>
                  <button
                    className={styles.stepBtn}
                    onClick={() =>
                      changeQty(item, item.quantity - 1)
                    }
                  >
                    –
                  </button>
                  <span className={styles.quantityValue}>
                    {item.quantity}
                  </span>
                  <button
                    className={styles.stepBtn}
                    onClick={() =>
                      changeQty(item, item.quantity + 1)
                    }
                  >
                    +
                  </button>
                </div>

                {/* Section 5.2.1.3: Spice Level */}
                {item.hasSpiceLevel && (
                  <div className={styles.spiceLevelRow}>
                    <label>Spice Level:</label>
                    <div className={styles.spiceButtons}>
                      {[
                        "No Spice",
                        "Mild",
                        "Medium",
                        "Hot",
                      ].map((lvl) => (
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

                {/* Section 5.2.1.4: Option Groups */}
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
                                  {!c.nestedOptionGroup &&
                                  c.priceAdjustment
                                    ? ` (+$${c.priceAdjustment.toFixed(
                                        2
                                      )})`
                                    : ""}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className={styles.optionList}>
                              {g.choices.map((c) => {
                                const checked =
                                  state.selectedChoiceIds.includes(c.id);
                                return (
                                  <div
                                    key={c.id}
                                    className={styles.choiceRow}
                                  >
                                    <label>
                                      <input
                                        type={
                                          g.optionType ===
                                          "single-select"
                                            ? "radio"
                                            : "checkbox"
                                        }
                                        checked={checked}
                                        name={`g-${g.id}`}
                                        onChange={(e) =>
                                          updateChoice(
                                            item,
                                            g,
                                            c,
                                            e.target.checked
                                          )
                                        }
                                      />
                                      {c.label}
                                      {!c.nestedOptionGroup &&
                                      c.priceAdjustment
                                        ? ` (+$${c.priceAdjustment.toFixed(
                                            2
                                          )})`
                                        : ""}
                                    </label>
                                    {c.nestedOptionGroup &&
                                      checked && (
                                        <div
                                          className={
                                            styles.nestedOptions
                                          }
                                        >
                                          <h5
                                            className={
                                              styles.nestedGroupTitle
                                            }
                                          >
                                            {
                                              c.nestedOptionGroup
                                                .title
                                            }{" "}
                                            (Select{" "}
                                            {
                                              c.nestedOptionGroup
                                                .minRequired
                                            }
                                            {c.nestedOptionGroup
                                              .maxAllowed
                                              ? ` - ${c.nestedOptionGroup.maxAllowed}`
                                              : ""}
                                            )
                                          </h5>
                                          {c.nestedOptionGroup.choices.map(
                                            (n) => {
                                              const nSel =
                                                state
                                                  .nestedSelections?.[
                                                  c.id
                                                ] ?? [];
                                              const nChecked =
                                                nSel.includes(n.id);
                                              return (
                                                <div
                                                  key={n.id}
                                                  className={
                                                    styles.nestedChoiceRow
                                                  }
                                                >
                                                  <label>
                                                    <input
                                                      type="checkbox"
                                                      checked={
                                                        nChecked
                                                      }
                                                      onChange={(
                                                        e
                                                      ) =>
                                                        updateNested(
                                                          item,
                                                          g,
                                                          c.id,
                                                          n.id,
                                                          e
                                                            .target
                                                            .checked,
                                                          c
                                                            .nestedOptionGroup
                                                            ?.maxAllowed
                                                        )
                                                      }
                                                    />
                                                    {n.label}
                                                    {n.priceAdjustment
                                                      ? ` (+$${n.priceAdjustment.toFixed(
                                                          2
                                                        )})`
                                                      : ""}
                                                  </label>
                                                </div>
                                              );
                                            }
                                          )}
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

                {/* Section 5.2.1.5: Special Instructions */}
                <div className={styles.instructionsRow}>
                  <label>Special Instructions:</label>
                  <textarea
                    className={styles.instructionsInput}
                    rows={2}
                    value={item.specialInstructions || ""}
                    onChange={(e) =>
                      changeNote(item, e.target.value)
                    }
                  />
                </div>

                {/* Section 5.2.1.6: Item Price */}
                <p className={styles.itemPrice}>
                  Item Price: ${priceOf(item).toFixed(2)}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Section 5.3: Saved for Later */}
      {uniqSaved.length > 0 && (
        <div className={styles.savedContainer}>
          <h2 className={styles.savedTitle}>Saved for Later</h2>
          <div className={styles.savedItemsWrapper}>
            {uniqSaved.map((item) => (
              <div
                key={item.cartItemId}
                className={styles.savedItem}
              >
                {(item.cloudinaryPublicId ||
                  item.imageUrl ||
                  item.image) && (
                  <div
                    className={
                      styles.savedThumbnailContainer
                    }
                  >
                    {(() => {
                      const src = item.cloudinaryPublicId
                        ? getCloudinaryImageUrl(
                            item.cloudinaryPublicId,
                            80,
                            80
                          )
                        : item.imageUrl
                        ? item.imageUrl
                        : item.image!;
                      return (
                        <Image
                          src={src}
                          alt={item.title}
                          width={80}
                          height={80}
                          unoptimized
                          sizes="(max-width:480px) 60px, 80px"
                          className={styles.savedThumbnail}
                          loading="lazy"
                        />
                      );
                    })()}
                  </div>
                )}
                <div className={styles.savedInfo}>
                  <p className={styles.savedItemTitle}>
                    {item.title}
                  </p>
                  <p className={styles.savedItemPrice}>
                    ${item.price.toFixed(2)}
                  </p>
                </div>
                <div className={styles.savedActions}>
                  <button
                    className={styles.returnBtn}
                    onClick={() =>
                      moveBackToCart(item.cartItemId)
                    }
                  >
                    Move to Cart
                  </button>
                  <button
                    className={styles.removeSavedBtn}
                    onClick={() =>
                      removeFromSaved(item.cartItemId)
                    }
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 5.4: Recommendations */}
<div className={styles.recommendationsContainer}>
  <h2 className={styles.recommendTitle}>You may also like</h2>
  {recs.length ? (
    <div className={styles.marqueeWrapper}>
      <div className={styles.marqueeTrack}>
        {[
          ...recs.slice(0, MAX_RECS),
          ...recs.slice(0, MAX_RECS),
        ].map((rec, i) => (
          <div
            key={`${rec.id}-${i}`}
            className={styles.recommendItem}
            onClick={() => router.push(`/menuitem/${rec.id}`)}
          >
            <div className={styles.recommendImageContainer}>
              {(() => {
                const src = rec.cloudinaryPublicId
                  ? getCloudinaryImageUrl(rec.cloudinaryPublicId, 160, 160)
                  : rec.image || "/placeholder.png";
                return (
                  <Image
                    src={src}
                    alt={rec.title}
                    width={160}
                    height={160}
                    unoptimized
                    sizes="(max-width:480px) 120px, 160px"
                    style={{ width: "auto" }}       // <- preserve aspect ratio
                    className={styles.recommendThumbnail}
                    loading="lazy"
                  />
                );
              })()}
            </div>
            <button className={styles.addRecommendBtn}>
              View / Add
            </button>
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

      {/* Section 5.5: Footer */}
      {uniqCart.length > 0 && (
        <div className={styles.cartFooter}>
          <h2 className={styles.cartTotal}>
            Total: ${cartTotal.toFixed(2)}
          </h2>
          <div className={styles.footerButtons}>
            <button
              onClick={() => router.push("/checkout")}
              className={styles.checkoutBtn}
            >
              Proceed to Checkout
            </button>
            <button
              onClick={() => router.push("/menu")}
              className={styles.menuBtn}
            >
              Back to Menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
