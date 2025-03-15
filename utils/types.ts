// File: utils/types.ts

/**
 * Represents an accompaniment option that can be added to a menu item.
 */
export interface Accompaniment {
  /** Unique identifier for the accompaniment */
  id: number;
  /** Name of the accompaniment */
  name: string;
  /** Additional cost for the accompaniment */
  price: number;
}

/**
 * Represents a group of accompaniment options.
 */
export interface AccompanimentGroup {
  /** Unique identifier for the group */
  id: string;
  /** Display label for the group */
  label: string;
  /** Maximum number of selections allowed for this group */
  maxSelections: number;
  /**
   * Type of group that can determine selection rules:
   * - 'primaryChoice': only one option can be selected
   * - 'freeAddOns': multiple options can be selected (up to a specified limit or unlimited)
   */
  type: "primaryChoice" | "freeAddOns";
  /** List of accompaniment options for this group */
  options: Accompaniment[];
}

/**
 * Represents a menu item available for order.
 */
export interface MenuItem {
  /** Unique identifier for the menu item */
  id: number;
  /** Title or name of the menu item */
  title: string;
  /** Detailed description of the menu item */
  description: string;
  /** Base price of the menu item */
  price: number;
  /** URL or path to the image of the menu item */
  image: string;
  /** Flag indicating if this item supports different spice levels */
  hasSpiceLevel: boolean;
  /** List of accompaniment groups available for this item (if any) */
  accompanimentGroups?: AccompanimentGroup[];
  /**
   * Optional pre-selected accompaniments for this item.
   * This is useful when rendering detailed views where a default selection is provided.
   */
  selectedAccompaniments?: { [groupId: string]: Accompaniment[] };
}

/**
 * Represents an item added to the cart.
 * It extends the MenuItem with additional properties for cart management.
 */
export interface CartItem extends MenuItem {
  /** Unique cart-specific identifier (e.g., a UUID) */
  cartItemId: string;
  /** Quantity ordered */
  quantity: number;
  /** Any special instructions provided by the customer */
  specialInstructions: string;
  /**
   * Selected spice level for the item.
   * If the item does not support spice level, this may be null.
   */
  spiceLevel?: string | null;
  /**
   * Selected accompaniments grouped by the group ID.
   * This stores the customer's choices.
   */
  selectedAccompaniments: { [groupId: string]: Accompaniment[] };
  /**
   * Full list of available accompaniment groups.
   * Useful for editing selections in the cart.
   */
  availableAccompanimentGroups?: AccompanimentGroup[];
}

/**
 * Represents a user of the system.
 */
export interface User {
  /** Unique identifier for the user */
  id: number;
  /** Full name of the user */
  name: string;
  /** Email address of the user */
  email: string;
  // Additional user properties can be added here as needed.
}
