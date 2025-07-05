// File: components/ItemDetailPage/useItemDetail.ts

/* =================================================================== */
/* 1. Imports                                                          */
/* =================================================================== */
"use client";

import { v4 as uuidv4 } from "uuid";
import { useState, useEffect, useContext } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";

import { CartContext } from "@/contexts/CartContext";
import { OrderContext } from "@/contexts/OrderContext";
import {
  MenuItem as MenuItemType,
  MenuItemOptionGroup,
  MenuOptionChoice,
} from "@/utils/types";

/* =================================================================== */
/* 2. Hook signature                                                   */
/* =================================================================== */
export function useItemDetail(item: MenuItemType, isPreview = false) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToCart } = useContext(CartContext)!;
  const { order, setOrder } = useContext(OrderContext)!;

  /* =================================================================== */
  /* 3. Local state                                                     */
  /* =================================================================== */
  const [quantity, setQuantity] = useState<number>(1);
  const [spiceLevel, setSpiceLevel] = useState<string>("No Spice");
  const [specialInstructions, setSpecialInstructions] = useState<string>("");

  const [selectedOptions, setSelectedOptions] = useState<{
    [groupId: string]: {
      selectedChoiceIds: string[];
      nestedSelections: { [choiceId: string]: string[] };
    };
  }>({});

  /* =================================================================== */
  /* 4. Helpers to init + reset                                          */
  /* =================================================================== */
  function buildInitialSelections(it: MenuItemType) {
    const obj: typeof selectedOptions = {};
    it.optionGroups?.forEach((g) => {
      obj[g.id] = { selectedChoiceIds: [], nestedSelections: {} };
    });
    return obj;
  }

  function resetForm() {
    setQuantity(1);
    setSpiceLevel("No Spice");
    setSpecialInstructions("");
    setSelectedOptions(buildInitialSelections(item));
  }

  useEffect(() => {
    resetForm();
  }, [item]);

  /* =================================================================== */
  /* 5. Option change handlers                                          */
  /* =================================================================== */
  function handleOptionChange(
    group: MenuItemOptionGroup,
    choice: MenuOptionChoice,
    checked: boolean
  ) {
    setSelectedOptions((prev) => {
      const gState = prev[group.id] || {
        selectedChoiceIds: [],
        nestedSelections: {},
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
        nestedSelections: {},
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

  /* =================================================================== */
  /* 6. Price calculation + validation                                   */
  /* =================================================================== */
  function calculateTotalPrice(): string {
    let total = item.price;

    item.optionGroups?.forEach((group) => {
      const gState = selectedOptions[group.id];
      if (!gState) return;

      group.choices.forEach((choice) => {
        if (!gState.selectedChoiceIds.includes(choice.id)) return;

        if (choice.nestedOptionGroup) {
          const nestedChosen = gState.nestedSelections[choice.id] || [];
          choice.nestedOptionGroup.choices.forEach((n) => {
            if (nestedChosen.includes(n.id)) total += n.priceAdjustment ?? 0;
          });
        } else {
          total += choice.priceAdjustment ?? 0;
        }
      });
    });

    return (total * quantity).toFixed(2);
  }

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

  /* =================================================================== */
/* 7. Add-to-Cart & reset                                              */
/* =================================================================== */
function handleAddToCart() {
  if (isPreview) {
    toast.info("Preview mode: Add to cart is disabled.");
    return;
  }
  if (!canAddToCart()) return;

  const provenance = (searchParams.get("from") || "").toLowerCase();
  const sourceMenu =
    provenance === "golf"
      ? "GOLF"
      : provenance === "main"
      ? "MAIN"
      : undefined;

  /* 7.1 Build the cart item payload, now including images */
  const cartBase = {
    cartItemId:        uuidv4(),                    // unique per-add
    id:                item.id,
    title:             item.title,
    description:       item.description,
    price:             item.price,
    image:             item.image,                   // legacy
    imageUrl:          item.imageUrl,                // Cloudinary secure URL
    cloudinaryPublicId:item.cloudinaryPublicId,      // Cloudinary ID
    hasSpiceLevel:     item.hasSpiceLevel,
    optionGroups:      item.optionGroups || [],
    showInGolfMenu:    item.showInGolfMenu,
    category:          item.category,
    cloverItemId:      item.cloverItemId ?? undefined,
    stock:             item.stock,
    isAlcohol:         item.isAlcohol,
    // user choices:
    quantity,
    specialInstructions,
    spiceLevel:        item.hasSpiceLevel ? spiceLevel : undefined,
    selectedOptions,
  };

  /* 7.2 Perform the add */
  addToCart(
    cartBase,
    quantity,
    specialInstructions,
    item.hasSpiceLevel ? spiceLevel : undefined,
    selectedOptions,
    sourceMenu
  );

  /* 7.3 Trigger any side-effects */
  window.dispatchEvent(new CustomEvent("cart-add"));
  if (item.isAlcohol) {
    setOrder((prev) => ({ ...prev, containsAlcohol: true }));
  }

  toast.success("Item added to cart!");

  /* 7.4 Reset the form for next use */
  resetForm();
}

  /* =================================================================== */
  /* 8. Other handlers                                                   */
  /* =================================================================== */
  const handleQuantityIncrease = () => setQuantity((q) => q + 1);
  const handleQuantityDecrease = () =>
    setQuantity((q) => (q > 1 ? q - 1 : 1));
  const handleBackToMenu = () => {
    if (isPreview) {
      toast.info("Preview mode: 'Back' disabled.");
      return;
    }
    router.back();
  };

  /* =================================================================== */
  /* 9. Exposed API                                                      */
  /* =================================================================== */
  return {
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
    canAddToCart,
    handleAddToCart,
    handleBackToMenu,
  };
}
