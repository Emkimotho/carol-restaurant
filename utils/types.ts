// File: utils/types.ts

/**
 * Represents a menu category (main sections or subcategories).
 */
export interface MenuCategory {
  id: string;       // e.g., "cat_123"
  name: string;     // e.g., "Desserts", "Soft Drinks", "Lunch/Dinner"
  type: string;     // e.g., "MainMenu", "GolfMenu"
  order: number;    // For ordering categories in the menu
}

/**
 * Represents a single nested option choice.
 */
export interface NestedOptionChoice {
  id: string;
  label: string;          // e.g., "Ketchup", "Mayo"
  priceAdjustment?: number; // Optional extra cost for this nested choice
}

/**
 * Represents a nested option group for a menu option choice.
 */
export interface NestedOptionGroup {
  id: string;
  title: string;       // e.g., "Choose Sauce"
  minRequired: number;
  maxAllowed?: number;
  choices: NestedOptionChoice[];
}

/**
 * Represents a choice within an option group.
 */
export interface MenuOptionChoice {
  id: string;
  label: string;         // e.g., "Beef", "Chicken"
  priceAdjustment?: number;  // Optional extra cost for the choice
  nestedOptionGroup?: NestedOptionGroup;
}

/**
 * Represents an option group for a menu item (e.g., "Choose Protein", "Add Sides").
 */
export interface MenuItemOptionGroup {
  id: string;
  title: string;   // e.g., "Choose Protein", "Add Sides"
  minRequired: number;
  maxAllowed?: number;
  optionType: "single-select" | "multi-select" | "dropdown";
  choices: MenuOptionChoice[];
}

/**
 * Represents a menu item available for order.
 */
export interface MenuItem {
  id: string;
  title: string;
  description?: string;
  price: number;
  image?: string;
  hasSpiceLevel: boolean;
  showInGolfMenu?: boolean;
  // Each menu item now includes a category.
  category: MenuCategory;
  // Option groups allow for further customization.
  optionGroups?: MenuItemOptionGroup[];
  // NEW: Optional Clover Item ID for integrating with Clover inventory and payments.
  cloverItemId?: string;
  // NEW: Stock field to track inventory.
  stock: number;
}

/**
 * Represents an item added to the cart.
 * This extends MenuItem with additional properties for cart management.
 */
export interface CartItem extends MenuItem {
  cartItemId: string;
  quantity: number;
  specialInstructions: string;
  spiceLevel?: string | null;
  // Stores the user's selections for each option group.
  selectedOptions?: {
    [groupId: string]: {
      selectedChoiceIds: string[];
      nestedSelections?: { [choiceId: string]: string[] };
    };
  };
}

/**
 * Represents a user of the system.
 */
export interface User {
  id: number;
  name: string;
  email: string;
  // Additional properties as needed.
}
