// File: data/menuData.ts

export interface Accompaniment {
  id: number;
  name: string;
  price: number;
}

export interface AccompanimentGroup {
  id: string;
  label: string;
  maxSelections: number;
  type: "primaryChoice" | "freeAddOns";
  options: Accompaniment[];
}

export interface MenuItem {
  id: number;
  title: string;
  description: string;
  price: number;
  image: string;
  sections: string[]; // Updated to allow multiple sections
  category?: string;
  hasSpiceLevel: boolean;
  accompanimentGroups?: AccompanimentGroup[];
}

const menuData: MenuItem[] = [
  {
    id: 1,
    title: "Spicy Chicken Curry",
    description: "A hot and spicy chicken curry served with rice.",
    price: 12.99,
    image: "/images/spicy-chicken-curry.jpg",
    sections: ["MainMenu"],
    category: "Lunch/Dinner", // unified category
    hasSpiceLevel: true,
    accompanimentGroups: [
      {
        id: "sides",
        label: "Choose a Side",
        maxSelections: 1,
        type: "primaryChoice",
        options: [
          { id: 101, name: "Extra Rice", price: 1.5 },
          { id: 102, name: "Naan Bread", price: 2.0 },
        ],
      },
    ],
  },
  {
    id: 2,
    title: "Mild Vegetable Stew",
    description: "A mild stew with seasonal vegetables.",
    price: 9.99,
    image: "/images/vegetable-stew.jpg",
    sections: ["MainMenu"],
    category: "Lunch/Dinner",
    hasSpiceLevel: false,
    accompanimentGroups: [
      {
        id: "sides",
        label: "Add Garlic Bread",
        maxSelections: 1,
        type: "primaryChoice",
        options: [{ id: 103, name: "Garlic Bread", price: 1.75 }],
      },
    ],
  },
  {
    id: 3,
    title: "Classic Cheeseburger",
    description: "A juicy beef burger with cheese, lettuce, and tomato.",
    price: 8.99,
    image: "/images/cheeseburger.jpg",
    sections: ["MainMenu"],
    category: "Lunch/Dinner",
    hasSpiceLevel: false,
    accompanimentGroups: [
      {
        id: "toppings",
        label: "Choose Toppings",
        maxSelections: 2,
        type: "freeAddOns",
        options: [
          { id: 104, name: "Extra Cheese", price: 0.5 },
          { id: 105, name: "Bacon", price: 1.0 },
        ],
      },
      {
        id: "sides",
        label: "Add a Side",
        maxSelections: 1,
        type: "primaryChoice",
        options: [{ id: 106, name: "Fries", price: 2.5 }],
      },
    ],
  },
  {
    id: 4,
    title: "Pancake Breakfast",
    description: "Fluffy pancakes served with maple syrup and butter.",
    price: 6.99,
    image: "/images/pancakes.jpg",
    sections: ["MainMenu"],
    category: "Breakfast",
    hasSpiceLevel: false,
    accompanimentGroups: [
      {
        id: "toppings",
        label: "Add Toppings",
        maxSelections: 3,
        type: "freeAddOns",
        options: [
          { id: 107, name: "Blueberries", price: 1.0 },
          { id: 108, name: "Chocolate Chips", price: 0.75 },
          { id: 109, name: "Whipped Cream", price: 0.5 },
        ],
      },
    ],
  },
  {
    id: 9,
    title: "Rice Bowl Special",
    description: "Build your perfect rice bowl with your choice of protein and extra sides.",
    price: 11.99,
    image: "/images/rice-bowl.jpg",
    sections: ["MainMenu"],
    category: "Lunch/Dinner",
    hasSpiceLevel: false,
    accompanimentGroups: [
      {
        id: "protein",
        label: "Choose Your Protein",
        maxSelections: 1,
        type: "primaryChoice",
        options: [
          { id: 201, name: "Beef Meat", price: 3.0 },
          { id: 202, name: "Chicken Meat", price: 2.5 },
        ],
      },
      {
        id: "sides",
        label: "Add Sides",
        maxSelections: 2,
        type: "freeAddOns",
        options: [
          { id: 203, name: "Fries", price: 1.5 },
          { id: 204, name: "Salad", price: 1.0 },
          { id: 205, name: "Extra Rice", price: 1.0 },
        ],
      },
    ],
  },
  // Test item that appears in both MainMenu and GolfMenu:
  {
    id: 10,
    title: "Test Lunch Dinner Special",
    description: "A special test item for Lunch/Dinner category with unique options.",
    price: 10.99,
    image: "/images/test-special.jpg",
    sections: ["MainMenu", "GolfMenu"],
    category: "Lunch/Dinner",
    hasSpiceLevel: false,
    accompanimentGroups: [
      {
        id: "mainChoice",
        label: "Select Main Option",
        maxSelections: 1,
        type: "primaryChoice",
        options: [
          { id: 301, name: "Option A", price: 2.0 },
          { id: 302, name: "Option B", price: 2.5 },
        ],
      },
      {
        id: "extras",
        label: "Choose Extras",
        maxSelections: 2,
        type: "freeAddOns",
        options: [
          { id: 303, name: "Extra Sauce", price: 0.75 },
          { id: 304, name: "Side Salad", price: 1.0 },
        ],
      },
    ],
  },
  // New item for Desserts tab:
  {
    id: 11,
    title: "Chocolate Cake",
    description: "Decadent chocolate cake with a rich, fudgy texture.",
    price: 5.99,
    image: "/images/chocolate-cake.jpg",
    sections: ["MainMenu"],
    category: "Desserts",
    hasSpiceLevel: false,
  },
  // New item for Soft Drinks tab:
  {
    id: 12,
    title: "Fresh Lemonade",
    description: "Refreshing lemonade made with real lemons and a hint of mint.",
    price: 3.99,
    image: "/images/lemonade.jpg",
    sections: ["MainMenu"],
    category: "Soft Drinks",
    hasSpiceLevel: false,
  },
  // New item for Alcoholic Drinks tab:
  {
    id: 13,
    title: "Craft Beer",
    description: "Locally brewed craft beer with a full-bodied taste.",
    price: 6.5,
    image: "/images/craft-beer.jpg",
    sections: ["MainMenu"],
    category: "Alcoholic Drinks",
    hasSpiceLevel: false,
  },
  // New item for Snacks tab:
  {
    id: 14,
    title: "French Fries",
    description: "Crispy golden fries served with your choice of dipping sauce.",
    price: 2.99,
    image: "/images/french-fries.jpg",
    sections: ["MainMenu"],
    category: "Snacks",
    hasSpiceLevel: false,
  },
];

export default menuData;
