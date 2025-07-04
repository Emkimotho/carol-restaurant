// File: components/MenuItem/ItemDetailPage.tsx

"use client";

import React from "react";
import Image from "next/image";
import styles from "./ItemDetailPage.module.css";

import { useItemDetail } from "./useItemDetail";
import RecommendationsSection from "./RecommendationsSection";
import MenuTimingBar from "@/components/MenuTimingBar/MenuTimingBar";          // ← NEW

import type { MenuItem as MenuItemType } from "@/utils/types";
import { getCloudinaryImageUrl } from "@/lib/cloudinary-client";

interface ItemDetailPageProps {
  item: MenuItemType & {
    cloudinaryPublicId?: string;
    imageUrl?: string;
  };
  sameCategory?: (MenuItemType & {
    cloudinaryPublicId?: string;
    imageUrl?: string;
  })[];
  isPreview?: boolean;
}

export default function ItemDetailPage({
  item,
  sameCategory = [],
  isPreview = false,
}: ItemDetailPageProps) {
  /* All state & handlers come from the custom hook */
  const {
    router,
    searchParams,
    quantity,
    handleQuantityIncrease,
    handleQuantityDecrease,
    spiceLevel,
    setSpiceLevel,
    specialInstructions,
    setSpecialInstructions,
    selectedOptions,
    handleOptionChange,
    handleNestedOptionChange,
    calculateTotalPrice,
    handleAddToCart,
    handleBackToMenu,
  } = useItemDetail(item, isPreview);

  /* Local helpers */
  const provenance = (searchParams.get("from") || "").toLowerCase();
  const recommendations = sameCategory.filter((m) => m.id !== item.id);

  /* Build Cloudinary-backed image src or fallback to any existing URL */
  const IMAGE_WIDTH = 300;
  const IMAGE_HEIGHT = 300;
  const src = item.cloudinaryPublicId
    ? getCloudinaryImageUrl(item.cloudinaryPublicId, IMAGE_WIDTH, IMAGE_HEIGHT)
    : item.imageUrl
    ? item.imageUrl
    : item.image || "";

  // Debug: log the computed image URL
  console.log("📸 ItemDetailPage image src →", src);

  return (
    <div className={styles.detailPageContainer}>
      {/* ------------------------------------------------------------ */}
      {/*  Fixed timing bar (same as Menu view)                       */}
      {/* ------------------------------------------------------------ */}
      <MenuTimingBar />                                               {/* ← NEW */}

      <div className={styles.mainContent}>
        {/* ——— Image ——— */}
        <div className={styles.imageContainer}>
          {src && (
            <Image
              src={src}
              alt={item.title}
              width={IMAGE_WIDTH}
              height={IMAGE_HEIGHT}
              unoptimized
              className={styles.itemImage}
            />
          )}
        </div>

        {/* ——— Info / Options ——— */}
        <div className={styles.infoContainer}>
          <h1 className={styles.itemTitle}>{item.title}</h1>
          {item.description && (
            <p className={styles.itemDescription}>{item.description}</p>
          )}
          <p className={styles.price}>Price: ${item.price.toFixed(2)}</p>

          {/* -------- OPTION GROUPS -------- */}
          {item.optionGroups?.map((group) => {
            const gState = selectedOptions[group.id] || {
              selectedChoiceIds: [],
              nestedSelections: {},
            };

            return (
              <div key={group.id} className={styles.optionGroup}>
                <h4 className={styles.groupTitle}>
                  {group.title} (Select {group.minRequired}
                  {group.maxAllowed ? ` - ${group.maxAllowed}` : ""})
                </h4>

                {group.optionType === "dropdown" ? (
                  /* ---- Dropdown ---- */
                  <select
                    className={styles.dropdownSelect}
                    value={gState.selectedChoiceIds[0] || ""}
                    onChange={(e) => {
                      const cid = e.target.value;
                      const ch = group.choices.find((c) => c.id === cid);
                      if (ch) handleOptionChange(group, ch, true);
                    }}
                  >
                    <option value="">-- Select --</option>
                    {group.choices.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                        {c.nestedOptionGroup
                          ? ""
                          : c.priceAdjustment
                          ? ` (+$${c.priceAdjustment.toFixed(2)})`
                          : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  /* ---- Radio / Checkbox list ---- */
                  <div className={styles.optionList}>
                    {group.choices.map((choice) => {
                      const isSel = gState.selectedChoiceIds.includes(choice.id);
                      return (
                        <div key={choice.id} className={styles.optionItem}>
                          <label>
                            <input
                              type={
                                group.optionType === "single-select"
                                  ? "radio"
                                  : "checkbox"
                              }
                              name={group.id}
                              checked={isSel}
                              onChange={(e) =>
                                handleOptionChange(
                                  group,
                                  choice,
                                  e.target.checked
                                )
                              }
                            />
                            {choice.label}
                            {choice.nestedOptionGroup
                              ? ""
                              : choice.priceAdjustment
                              ? ` (+$${choice.priceAdjustment.toFixed(2)})`
                              : ""}
                          </label>

                          {/* ---- Nested choices ---- */}
                          {choice.nestedOptionGroup && isSel && (
                            <div className={styles.nestedOptionGroup}>
                              <h5 className={styles.nestedGroupTitle}>
                                {choice.nestedOptionGroup.title} (Select{" "}
                                {choice.nestedOptionGroup.minRequired}
                                {choice.nestedOptionGroup.maxAllowed
                                  ? ` - ${choice.nestedOptionGroup.maxAllowed}`
                                  : ""}
                                )
                              </h5>
                              {choice.nestedOptionGroup.choices.map(
                                (nested) => {
                                  const nestSel =
                                    gState.nestedSelections[choice.id] || [];
                                  const nestChecked =
                                    nestSel.includes(nested.id);

                                  return (
                                    <div
                                      key={nested.id}
                                      className={styles.nestedOptionItem}
                                    >
                                      <label>
                                        <input
                                          type="checkbox"
                                          checked={nestChecked}
                                          onChange={(e) =>
                                            handleNestedOptionChange(
                                              group.id,
                                              choice.id,
                                              nested.id,
                                              e.target.checked,
                                              choice.nestedOptionGroup?.maxAllowed
                                            )
                                          }
                                        />
                                        {nested.label}
                                        {nested.priceAdjustment
                                          ? ` (+$${nested.priceAdjustment.toFixed(
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

          {/* -------- SPICE LEVEL -------- */}
          {item.hasSpiceLevel && (
            <div className={styles.spiceLevelContainer}>
              <label className={styles.spiceLabel}>Choose Spice Level:</label>
              <div className={styles.spiceOptions}>
                {["No Spice", "Mild", "Medium", "Hot"].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setSpiceLevel(lvl)}
                    className={
                      spiceLevel === lvl
                        ? styles.btnSelected
                        : styles.btnOutline
                    }
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* -------- QUANTITY -------- */}
          <div className={styles.quantityContainer}>
            <label className={styles.quantityLabel}>Quantity:</label>
            <div className={styles.quantityControls}>
              <button
                onClick={handleQuantityDecrease}
                className={styles.btnCircle}
              >
                −
              </button>
              <span className={styles.quantityDisplay}>{quantity}</span>
              <button
                onClick={handleQuantityIncrease}
                className={styles.btnCircle}
              >
                +
              </button>
            </div>
          </div>

          {/* -------- SPECIAL INSTRUCTIONS -------- */}
          <div className={styles.specialInstructionsContainer}>
            <label
              htmlFor="specialInstructions"
              className={styles.instructionsLabel}
            >
              Special Instructions:
            </label>
            <textarea
              id="specialInstructions"
              maxLength={500}
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Extra sauce, no onions, etc."
              className={styles.instructionsInput}
            />
          </div>

          {/* -------- FOOTER BUTTONS -------- */}
          <div className={styles.buttonsRow}>
            <div className={styles.cartActions}>
              <div className={styles.totalPrice}>
                Total Price: ${calculateTotalPrice()}
              </div>
              <button
                id="addToCartBtn"
                className={styles.btnAddToCart}
                onClick={handleAddToCart}
                disabled={isPreview}
              >
                Add to Cart
              </button>
            </div>
            <button
              type="button"
              className={styles.btnBackToMenu}
              onClick={handleBackToMenu}
            >
              Back
            </button>
          </div>
        </div>
      </div>

      {/* ---------- Recommendations ---------- */}
      {recommendations.length > 0 && (
        <RecommendationsSection
          title="You may also like ..."
          items={recommendations}
          provenance={provenance}
        />
      )}
    </div>
  );
}
