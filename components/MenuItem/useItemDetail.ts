/* File: components/ItemDetailPage/useItemDetail.ts
   --------------------------------------------------------------------
   • NEW resetForm() is called after a successful Add-to-Cart so the
     page clears itself (quantity ↩︎ 1, spice level ↩︎ default, text
     boxes emptied, options unchecked).
   • All original logic, helpers, and comments remain intact.
   -------------------------------------------------------------------- */

"use client";

import { useState, useEffect, useContext } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";

import { CartContext }  from "@/contexts/CartContext";
import { OrderContext } from "@/contexts/OrderContext";
import {
  MenuItem as MenuItemType,
  MenuItemOptionGroup,
  MenuOptionChoice,
} from "@/utils/types";

/* =================================================================== */
/*                    Custom Hook: useItemDetail                       */
/* =================================================================== */
export function useItemDetail(item: MenuItemType, isPreview = false) {
  const router              = useRouter();
  const searchParams        = useSearchParams();
  const { addToCart }       = useContext(CartContext)!;
  const { order, setOrder } = useContext(OrderContext)!;

  /* ---------- state ------------------------------------------------- */
  const [quantity, setQuantity]                       = useState<number>(1);
  const [spiceLevel, setSpiceLevel]                   = useState<string>("No Spice");
  const [specialInstructions, setSpecialInstructions] = useState<string>("");

  const [selectedOptions, setSelectedOptions] = useState<{
    [groupId: string]: {
      selectedChoiceIds: string[];
      nestedSelections:  { [choiceId: string]: string[] };
    };
  }>({});

  /* ---------- helpers to build/reset option state ------------------- */
  function buildInitialSelections(it: MenuItemType) {
    const obj: {
      [groupId: string]: {
        selectedChoiceIds: string[];
        nestedSelections:  { [choiceId: string]: string[] };
      };
    } = {};
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

  /* ---------- reset whenever the *item* changes --------------------- */
  useEffect(() => resetForm(), [item]);

  /* ---------- option change handlers (unchanged) -------------------- */
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

  /* ---------- price calc / validations (unchanged) ------------------ */
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

  /* ---------- Add-to-Cart (with new form reset) --------------------- */
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

    /* trigger animation & alcohol flag logic (unchanged) */
    window.dispatchEvent(new CustomEvent("cart-add"));
    if (item.isAlcohol) setOrder((prev) => ({ ...prev, containsAlcohol: true }));

    toast.success("Item added to cart!");

    /* ---------- NEW: clear the form so user can add next item -------- */
    resetForm();
  }

  /* ---------- other small handlers ---------------------------------- */
  const handleQuantityIncrease = () => setQuantity((q) => q + 1);
  const handleQuantityDecrease = () => setQuantity((q) => (q > 1 ? q - 1 : 1));

  const handleBackToMenu = () => {
    if (isPreview) return toast.info("Preview mode: 'Back' disabled.");
    router.back();
  };

  /* ---------- expose to component ----------------------------------- */
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
