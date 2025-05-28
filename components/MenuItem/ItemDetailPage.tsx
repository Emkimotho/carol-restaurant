"use client";

import React, {
  useState,
  useEffect,
  useContext,
  ChangeEvent,
} from "react";
import Image from "next/image";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";
import { toast } from "react-toastify";

import { CartContext }  from "@/contexts/CartContext";
import { OrderContext } from "@/contexts/OrderContext";
import styles           from "./ItemDetailPage.module.css";

import {
  MenuItem as MenuItemType,
  MenuItemOptionGroup,
  MenuOptionChoice,
} from "@/utils/types";

interface ItemDetailPageProps {
  item: MenuItemType;
  recommendedDrinks?: MenuItemType[];
  desserts?: MenuItemType[];
  snacks?: MenuItemType[];
  softDrinks?: MenuItemType[];
  isPreview?: boolean;
}

export default function ItemDetailPage({
  item,
  recommendedDrinks = [],
  desserts = [],
  snacks = [],
  softDrinks = [],
  isPreview = false,
}: ItemDetailPageProps) {
  const router               = useRouter();
  const searchParams         = useSearchParams();
  const { addToCart }        = useContext(CartContext)!;
  const { order, setOrder }  = useContext(OrderContext)!;

  const [quantity, setQuantity]                       = useState<number>(1);
  const [spiceLevel, setSpiceLevel]                   = useState<string>("No Spice");
  const [specialInstructions, setSpecialInstructions] = useState<string>("");

  const [selectedOptions, setSelectedOptions] = useState<{
    [groupId: string]: {
      selectedChoiceIds: string[];
      nestedSelections:  { [choiceId: string]: string[] };
    };
  }>({});

  // Reset selections when item changes
  useEffect(() => {
    setQuantity(1);
    setSpiceLevel("No Spice");
    setSpecialInstructions("");

    if (item.optionGroups?.length) {
      const init: {
        [groupId: string]: {
          selectedChoiceIds: string[];
          nestedSelections:  { [choiceId: string]: string[] };
        };
      } = {};
      item.optionGroups.forEach((group) => {
        init[group.id] = { selectedChoiceIds: [], nestedSelections: {} };
      });
      setSelectedOptions(init);
    } else {
      setSelectedOptions({});
    }
  }, [item]);

  // Handle choice selection
  function handleOptionChange(
    group: MenuItemOptionGroup,
    choice: MenuOptionChoice,
    checked: boolean
  ) {
    setSelectedOptions((prev) => {
      const gState = prev[group.id] || {
        selectedChoiceIds: [],
        nestedSelections : {},
      };
      let nextSel = [...gState.selectedChoiceIds];

      if (group.optionType === "single-select" || group.optionType === "dropdown") {
        nextSel = checked ? [choice.id] : [];
      } else {
        if (checked) {
          if (nextSel.length >= (group.maxAllowed ?? Infinity)) {
            toast.error(`You can select up to ${group.maxAllowed} item(s).`);
            return prev;
          }
          nextSel.push(choice.id);
        } else {
          nextSel = nextSel.filter((id) => id !== choice.id);
        }
      }

      return {
        ...prev,
        [group.id]: { ...gState, selectedChoiceIds: nextSel },
      };
    });
  }

  // Handle nested option selection
  function handleNestedOptionChange(
    groupId: string,
    parentChoiceId: string,
    nestedId: string,
    checked: boolean,
    nestedMax?: number
  ) {
    setSelectedOptions((prev) => {
      const gState = prev[groupId] || {
        selectedChoiceIds: [],
        nestedSelections : {},
      };
      const current = gState.nestedSelections[parentChoiceId] || [];
      let next = [...current];

      if (checked) {
        if (next.length >= (nestedMax ?? Infinity)) {
          toast.error(`You can select up to ${nestedMax} nested options.`);
          return prev;
        }
        next.push(nestedId);
      } else {
        next = next.filter((id) => id !== nestedId);
      }

      return {
        ...prev,
        [groupId]: {
          ...gState,
          nestedSelections: {
            ...gState.nestedSelections,
            [parentChoiceId]: next,
          },
        },
      };
    });
  }

  // Compute total price
  function calculateTotalPrice(): string {
    let total = item.price;

    if (item.optionGroups && selectedOptions) {
      item.optionGroups.forEach((group) => {
        const gState = selectedOptions[group.id];
        if (!gState) return;

        group.choices.forEach((choice) => {
          if (!gState.selectedChoiceIds.includes(choice.id)) return;

          if (choice.nestedOptionGroup) {
            const nestedChosen = gState.nestedSelections[choice.id] || [];
            choice.nestedOptionGroup.choices.forEach((nested) => {
              if (nestedChosen.includes(nested.id)) {
                total += nested.priceAdjustment ?? 0;
              }
            });
          } else {
            total += choice.priceAdjustment ?? 0;
          }
        });
      });
    }

    return (total * quantity).toFixed(2);
  }

  // Validate selections before adding
  function canAddToCart(): boolean {
    if (!item.optionGroups?.length) return true;

    for (const group of item.optionGroups) {
      const gState = selectedOptions[group.id];
      const selCnt = gState?.selectedChoiceIds.length ?? 0;

      if (selCnt < group.minRequired) {
        toast.error(
          `Please select at least ${group.minRequired} option(s) for ${group.title}.`
        );
        return false;
      }

      for (const ch of group.choices) {
        if (
          ch.nestedOptionGroup &&
          gState?.selectedChoiceIds.includes(ch.id)
        ) {
          const nestCnt = gState.nestedSelections[ch.id]?.length ?? 0;
          if (nestCnt < ch.nestedOptionGroup.minRequired) {
            toast.error(
              `Please select at least ${ch.nestedOptionGroup.minRequired} option(s) for ${ch.label}.`
            );
            return false;
          }
        }
      }
    }

    return true;
  }

  // Add item to cart
function handleAddToCart() {
  if (isPreview) {
    return toast.info("Preview mode: Add to cart is disabled.");
  }
  if (!canAddToCart()) return;

  const provenance = (searchParams.get("from") || "").toLowerCase();
  const sourceMenu =
    provenance === "golf"
      ? "GOLF"
      : provenance === "main"
      ? "MAIN"
      : undefined;

  const cartBase = {
    id:             item.id,
    title:          item.title,
    description:    item.description,
    price:          item.price,
    image:          item.image,
    hasSpiceLevel:  item.hasSpiceLevel,
    optionGroups:   item.optionGroups || [],
    showInGolfMenu: item.showInGolfMenu,
    category:       item.category,
    specialInstructions,
    cloverItemId:   item.cloverItemId ?? undefined,
    stock:          item.stock,
    isAlcohol:      item.isAlcohol,
  };

  addToCart(
    cartBase,
    quantity,
    specialInstructions,
    item.hasSpiceLevel ? spiceLevel : undefined,
    selectedOptions,
    sourceMenu
  );
  // ── trigger the golf-ball animation on every add to cart ──
  window.dispatchEvent(new CustomEvent('cart-add'));

  if (item.isAlcohol) {
    setOrder(prev => ({ ...prev, containsAlcohol: true }));
  }

  toast.success("Item added to cart!");
}

const handleQuantityIncrease = () => setQuantity(q => q + 1);
const handleQuantityDecrease = () => setQuantity(q => (q > 1 ? q - 1 : 1));

const handleBackToMenu = () => {
  if (isPreview) return toast.info("Preview mode: 'Back' disabled.");
  router.back();
};

const provenance      = (searchParams.get("from") || "").toLowerCase();
const filteredDrinks  = recommendedDrinks.filter(d => d.id !== item.id);
const filteredDessert = desserts.filter(d => d.id !== item.id);
const filteredSnacks  = snacks.filter(d => d.id !== item.id);
const filteredSoft    = softDrinks.filter(d => d.id !== item.id);

return (
  <div className={styles.detailPageContainer}>
    <div className={styles.mainContent}>
      <div className={styles.imageContainer}>
        {item.image && (
          <Image
            src={item.image}
            alt={item.title}
            width={500}
            height={400}
            unoptimized
            className={styles.itemImage}
          />
        )}
      </div>

      <div className={styles.infoContainer}>
        <h1 className={styles.itemTitle}>{item.title}</h1>
        {item.description && (
          <p className={styles.itemDescription}>{item.description}</p>
        )}
        <p className={styles.price}>Price: ${item.price.toFixed(2)}</p>

          {/* OPTION GROUPS */}
          {item.optionGroups?.map((group) => {
            const gState = selectedOptions[group.id] || {
              selectedChoiceIds: [],
              nestedSelections : {},
            };

            return (
              <div key={group.id} className={styles.optionGroup}>
                <h4 className={styles.groupTitle}>
                  {group.title} (Select {group.minRequired}
                  {group.maxAllowed ? ` - ${group.maxAllowed}` : ""})
                </h4>

                {group.optionType === "dropdown" ? (
                  <select
                    className={styles.dropdownSelect}
                    value={gState.selectedChoiceIds[0] || ""}
                    onChange={(e) => {
                      const cid = e.target.value;
                      const ch  = group.choices.find(c => c.id === cid);
                      if (ch) handleOptionChange(group, ch, true);
                    }}
                  >
                    <option value="">-- Select --</option>
                    {group.choices.map(c => (
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
                  <div className={styles.optionList}>
                    {group.choices.map(choice => {
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
                              onChange={e =>
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
                              {choice.nestedOptionGroup.choices.map(nested => {
                                const nestSel =
                                  gState.nestedSelections[choice.id] || [];
                                const nestChecked = nestSel.includes(nested.id);

                                return (
                                  <div
                                    key={nested.id}
                                    className={styles.nestedOptionItem}
                                  >
                                    <label>
                                      <input
                                        type="checkbox"
                                        checked={nestChecked}
                                        onChange={e =>
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
                                        ? ` (+$${nested.priceAdjustment.toFixed(2)})`
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

          {/* SPICE LEVEL */}
          {item.hasSpiceLevel && (
            <div className={styles.spiceLevelContainer}>
              <label className={styles.spiceLabel}>Choose Spice Level:</label>
              <div className={styles.spiceOptions}>
                {["No Spice", "Mild", "Medium", "Hot"].map(lvl => (
                  <button
                    key={lvl}
                    onClick={() => setSpiceLevel(lvl)}
                    className={
                      spiceLevel === lvl ? styles.btnSelected : styles.btnOutline
                    }
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* QUANTITY */}
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

          {/* SPECIAL INSTRUCTIONS */}
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
              onChange={e => setSpecialInstructions(e.target.value)}
              placeholder="Extra sauce, no onions, etc."
              className={styles.instructionsInput}
            />
          </div>

          {/* FOOTER BUTTONS */}
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
                {isPreview ? "Preview Mode" : "Add to Cart"}
              </button>
            </div>
            <button
              type="button"
              className={styles.btnBackToMenu}
              onClick={handleBackToMenu}
            >
              {isPreview ? "Close Preview" : "Back"}
            </button>
          </div>
        </div>
      </div>

      {/* RECOMMENDATIONS: Drinks */}
      {filteredDrinks.length > 0 && (
        <div className={styles.recommendations}>
          <h3 className={styles.recommendationsTitle}>
            You might also like…
          </h3>
          <div className={styles.drinkList}>
            {filteredDrinks.map(rec => (
              <div
                key={rec.id}
                className={styles.drinkItem}
                onClick={() =>
                  router.push(
                    `/menuitem/${rec.id}?highlight=true&from=${provenance}`
                  )
                }
              >
                <Image
                  src={rec.image || ""}
                  alt={rec.title}
                  width={100}
                  height={100}
                  unoptimized
                  className={styles.drinkImage}
                />
                <p className={styles.drinkTitle}>{rec.title}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RECOMMENDATIONS: Desserts */}
      {filteredDessert.length > 0 && (
        <div className={styles.recommendations}>
          <h3 className={styles.recommendationsTitle}>
            Desserts you might enjoy…
          </h3>
          <div className={styles.drinkList}>
            {filteredDessert.map(rec => (
              <div
                key={rec.id}
                className={styles.drinkItem}
                onClick={() =>
                  router.push(
                    `/menuitem/${rec.id}?highlight=true&from=${provenance}`
                  )
                }
              >
                <Image
                  src={rec.image || ""}
                  alt={rec.title}
                  width={100}
                  height={100}
                  unoptimized
                  className={styles.drinkImage}
                />
                <p className={styles.drinkTitle}>{rec.title}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RECOMMENDATIONS: Snacks */}
      {filteredSnacks.length > 0 && (
        <div className={styles.recommendations}>
          <h3 className={styles.recommendationsTitle}>
            Snack picks for you…
          </h3>
          <div className={styles.drinkList}>
            {filteredSnacks.map(rec => (
              <div
                key={rec.id}
                className={styles.drinkItem}
                onClick={() =>
                  router.push(
                    `/menuitem/${rec.id}?highlight=true&from=${provenance}`
                  )
                }
              >
                <Image
                  src={rec.image || ""}
                  alt={rec.title}
                  width={100}
                  height={100}
                  unoptimized
                  className={styles.drinkImage}
                />
                <p className={styles.drinkTitle}>{rec.title}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RECOMMENDATIONS: Soft Drinks */}
      {filteredSoft.length > 0 && (
        <div className={styles.recommendations}>
          <h3 className={styles.recommendationsTitle}>
            Soft drinks you might like…
          </h3>
          <div className={styles.drinkList}>
            {filteredSoft.map(rec => (
              <div
                key={rec.id}
                className={styles.drinkItem}
                onClick={() =>
                  router.push(
                    `/menuitem/${rec.id}?highlight=true&from=${provenance}`
                  )
                }
              >
                <Image
                  src={rec.image || ""}
                  alt={rec.title}
                  width={100}
                  height={100}
                  unoptimized
                  className={styles.drinkImage}
                />
                <p className={styles.drinkTitle}>{rec.title}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
