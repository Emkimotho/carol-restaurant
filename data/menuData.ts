import { MenuItem } from "@/utils/types";

const menuData: MenuItem[] = [
  {
    id: "9",
    title: "Rice Bowl Special",
    description:
      "Build your perfect rice bowl with your choice of protein and extra sides.",
    price: 11.99,
    image: "/images/rice-bowl.jpg",
    hasSpiceLevel: false,
    category: {
      id: "cat1",
      name: "Lunch/Dinner",
      type: "MainMenu",
      order: 1,
    },
    optionGroups: [
      {
        id: "protein",
        title: "Choose Your Protein",
        minRequired: 1,
        maxAllowed: 1,
        optionType: "single-select",
        choices: [
          {
            id: "201",
            label: "Beef Meat",
            priceAdjustment: 3.0,
            nestedOptionGroup: {
              id: "sauce",
              title: "Choose Your Sauce",
              minRequired: 1,
              maxAllowed: 1,
              choices: [
                { id: "sauce1", label: "BBQ Sauce" },
                { id: "sauce2", label: "Sweet Chili Sauce" },
              ],
            },
          },
          {
            id: "202",
            label: "Chicken Meat",
            priceAdjustment: 2.5,
          },
        ],
      },
      {
        id: "sides",
        title: "Add Sides",
        minRequired: 0,
        maxAllowed: 2,
        optionType: "multi-select",
        choices: [
          { id: "203", label: "Salad", priceAdjustment: 1.0 },
          { id: "204", label: "Extra Rice", priceAdjustment: 1.0 },
        ],
      },
    ],
  },
  {
    id: "10",
    title: "Test Lunch Dinner Special",
    description:
      "A special test item for Lunch/Dinner category with unique options.",
    price: 10.99,
    image: "/images/test-special.jpg",
    hasSpiceLevel: false,
    category: {
      id: "cat2",
      name: "Lunch/Dinner",
      type: "MainMenu",
      order: 1,
    },
    optionGroups: [
      {
        id: "mainChoice",
        title: "Select Main Option",
        minRequired: 1,
        maxAllowed: 1,
        optionType: "dropdown",
        choices: [
          { id: "301", label: "Option A", priceAdjustment: 2.0 },
          { id: "302", label: "Option B", priceAdjustment: 2.5 },
        ],
      },
      {
        id: "extras",
        title: "Choose Extras",
        minRequired: 0,
        maxAllowed: 2,
        optionType: "multi-select",
        choices: [
          { id: "303", label: "Extra Sauce", priceAdjustment: 0.75 },
          { id: "304", label: "Side Salad", priceAdjustment: 1.0 },
        ],
      },
    ],
  },
  {
    id: "11",
    title: "Spicy Chicken Curry",
    description:
      "A fiery curry with bold spices. Choose your protein: Beef or Chicken. If Chicken is selected, choose whether it's Grilled or Fried. Customize your spice level and add a side of fries if desired.",
    price: 13.99,
    image: "/images/spicy-chicken-curry.jpg",
    hasSpiceLevel: true,
    category: {
      id: "cat3",
      name: "Lunch/Dinner",
      type: "MainMenu",
      order: 1,
    },
    optionGroups: [
      {
        id: "protein",
        title: "Choose Your Protein",
        minRequired: 1,
        maxAllowed: 1,
        optionType: "single-select",
        choices: [
          {
            id: "411",
            label: "Beef",
            priceAdjustment: 0,
          },
          {
            id: "412",
            label: "Chicken",
            priceAdjustment: 0,
            nestedOptionGroup: {
              id: "chicken-type",
              title: "Choose Chicken Type",
              minRequired: 1,
              maxAllowed: 1,
              choices: [
                { id: "chicken1", label: "Grilled", priceAdjustment: 0 },
                { id: "chicken2", label: "Fried", priceAdjustment: 1.5 },
              ],
            },
          },
        ],
      },
      {
        id: "sides",
        title: "Add Sides",
        minRequired: 0,
        maxAllowed: 2,
        optionType: "multi-select",
        choices: [
          {
            id: "501",
            label: "Fries",
            priceAdjustment: 1.5,
            nestedOptionGroup: {
              id: "fries-sauce",
              title: "Choose Your Fries Sauce",
              minRequired: 1,
              maxAllowed: 1,
              choices: [
                { id: "sauce3", label: "Ketchup", priceAdjustment: 0 },
                { id: "sauce4", label: "Mayonnaise", priceAdjustment: 0 },
                { id: "sauce5", label: "Curry Sauce", priceAdjustment: 0.5 },
              ],
            },
          },
          { id: "502", label: "Coleslaw", priceAdjustment: 1.0 },
        ],
      },
    ],
  },
  {
    id: "12",
    title: "Dual Protein Special",
    description:
      "Choose between Beef or Chicken. If you choose Chicken, then select whether it is Grilled or Fried (+$1.50).",
    price: 15.99,
    image: "/images/dual-protein.jpg",
    hasSpiceLevel: false,
    category: {
      id: "cat4",
      name: "Lunch/Dinner",
      type: "MainMenu",
      order: 1,
    },
    optionGroups: [
      {
        id: "protein",
        title: "Choose Your Protein",
        minRequired: 1,
        maxAllowed: 1,
        optionType: "single-select",
        choices: [
          { id: "601", label: "Beef", priceAdjustment: 0 },
          {
            id: "602",
            label: "Chicken",
            priceAdjustment: 0,
            nestedOptionGroup: {
              id: "chicken-type",
              title: "Choose Chicken Type",
              minRequired: 1,
              maxAllowed: 1,
              choices: [
                { id: "chicken1", label: "Grilled", priceAdjustment: 0 },
                { id: "chicken2", label: "Fried", priceAdjustment: 1.5 },
              ],
            },
          },
        ],
      },
    ],
  },
];

export default menuData;
