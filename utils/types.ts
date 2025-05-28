// File: utils/types.ts

/**
 * Represents which menu section an item belongs to.
 */
export type MenuCategoryType = "MainMenu" | "GolfMenu";

/**
 * Represents a menu category (main sections or subcategories).
 */
export interface MenuCategory {
  id:     string;             // e.g., "cat_123"
  name:   string;             // e.g., "Desserts", "Soft Drinks"
  type:   MenuCategoryType;   // "MainMenu" or "GolfMenu"
  order:  number;             // Ordering index
  hidden: boolean;            // if true, not shown publicly
}

/**
 * A single nested option choice (e.g., "Mayo", "Ketchup").
 */
export interface NestedOptionChoice {
  id:               string;
  label:            string;    // Display label
  priceAdjustment?: number;    // Extra cost if selected
}

/**
 * A nested group under another choice (e.g., "Choose Sauce").
 */
export interface NestedOptionGroup {
  id:          string;
  title:       string;               // Group title
  minRequired: number;               // Minimum selections
  maxAllowed?: number;               // Optional maximum
  choices:     NestedOptionChoice[]; // The nested choices
}

/**
 * A single option within an option-group (e.g., "Beef", "Chicken").
 */
export interface MenuOptionChoice {
  id:                 string;
  label:              string;            // Choice label
  priceAdjustment?:   number;            // Extra cost
  nestedOptionGroup?: NestedOptionGroup; // If this choice unlocks another group
}

/**
 * An option group for a menu item (e.g., "Choose Protein").
 */
export interface MenuItemOptionGroup {
  id:          string;
  title:       string;                       // Group title
  minRequired: number;                       // Min selections
  maxAllowed?: number;                       // Optional max
  optionType:  "single-select" | "multi-select" | "dropdown";
  choices:     MenuOptionChoice[];
}

/**
 * A menu item available for ordering.
 */
export interface MenuItem {
  id:             string;
  title:          string;
  description?:   string;
  price:          number;
  image?:         string;
  hasSpiceLevel:  boolean;
  /** Matches Prisma's `isAlcohol` field */
  isAlcohol:      boolean;
  showInGolfMenu?: boolean;
  category:       MenuCategory;
  optionGroups?:  MenuItemOptionGroup[];
  cloverItemId:   string;  // Clover inventory ID
  stock:          number;
}

/**
 * User's selections for each option group, including nested picks.
 */
export interface SelectedOptions {
  [groupId: string]: {
    selectedChoiceIds: string[];
    nestedSelections?: { [choiceId: string]: string[] };
  };
}

/**
 * An item in the cart, extends the menu item.
 */
export interface CartItem extends MenuItem {
  cartItemId:          string;              // Unique cart entry ID
  quantity:            number;
  specialInstructions: string;
  spiceLevel?:         string;              // If `hasSpiceLevel` is true
  selectedOptions?:    SelectedOptions;
}

/**
 * Props for the unified Order Summary step component.
 */
export interface OrderSummaryStepProps {
  cartItems:         CartItem[];
  getTotalPrice:     () => number;
  orderType:         string;   // "" for golf flow
  tip:               string;
  customTip:         string;
  onTipChange:       (value: string) => void;
  onCustomTipChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onNext:            () => void;
  onBack:            () => void;
  taxRate?:          number;
  /** Whether we're in the golf-flow summary */
  isGolf:            boolean;
  /** Computed from `cartItems.some(i => i.isAlcohol)` */
  containsAlcohol:   boolean;
}

/**
 * Represents a logged-in user.
 */
export interface User {
  id:    number;
  name:  string;
  email: string;
}
