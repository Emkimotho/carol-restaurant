"use client"; 
// Because we'll use React state, context, etc.

import React, { useState, useContext } from "react";
import Image from "next/image";
// import { useRouter } from "next/navigation"; // optionally if you want to navigate
import styles from "./ItemDetailPage.module.css";
import { CartContext } from "@/contexts/CartContext";

// Types: adapt these to match your own
import { Accompaniment, AccompanimentGroup, MenuItem } from "@/utils/types";

interface ItemDetailPageProps {
  item: MenuItem; // from menuData or server fetch
}

export default function ItemDetailPage({ item }: ItemDetailPageProps) {
  const { addToCart } = useContext(CartContext)!;
  
  // Basic local states
  const [quantity, setQuantity] = useState(1);
  const [spiceLevel, setSpiceLevel] = useState<string>("");
  const [specialInstructions, setSpecialInstructions] = useState("");

  // Optional: track user feedback or something
  const [showMessage, setShowMessage] = useState(false);

  // Example: handle accompaniments if you like
  const [selectedAccompaniments, setSelectedAccompaniments] = useState<{ [groupId: string]: Accompaniment[] }>({});

  // In your old code, you had "deepCloneSelections()" etc.
  // For a simpler version, skip it or adapt from your old DetailedItemView.

  // Calculations
  function calculateTotalPrice(): number {
    let total = item.price;
    // add accompaniment prices
    Object.values(selectedAccompaniments).forEach((group) => {
      group.forEach((acc) => {
        total += acc.price;
      });
    });
    return total * quantity;
  }

  // Handler for adding to cart
  function handleAddToCart() {
    // Build the minimal item object
    const baseItem = {
      id: item.id,
      title: item.title,
      description: item.description,
      price: item.price,
      image: item.image,
      hasSpiceLevel: item.hasSpiceLevel,
      specialInstructions: "",
      spiceLevel: item.hasSpiceLevel ? null : undefined,
    };
    
    addToCart(
      baseItem,
      quantity,
      specialInstructions,
      item.hasSpiceLevel ? (spiceLevel || null) : null,
      selectedAccompaniments,
      item.accompanimentGroups || []
    );
    
    // Show some UI feedback
    setShowMessage(true);
    setTimeout(() => setShowMessage(false), 2000);

    // Optionally navigate away: e.g., router.push("/cart") or open a sidebar cart
    // router.push("/cart");
  }

  // Example: update quantity
  function increaseQuantity() {
    setQuantity(prev => prev + 1);
  }
  function decreaseQuantity() {
    setQuantity(prev => (prev > 1 ? prev - 1 : 1));
  }

  // Render the page
  return (
    <div className={styles.detailContainer}>
      {/** Title, image, etc. **/}
      <h1>{item.title}</h1>
      <p>{item.description}</p>
      
      <div className={styles.imageWrapper}>
        {item.image && (
          <Image
            src={item.image}
            alt={item.title}
            width={400}
            height={300}
            unoptimized
          />
        )}
      </div>

      {/** Price & quantity **/}
      <p>
        Price: <strong>${item.price.toFixed(2)}</strong>
      </p>
      <div className={styles.quantityControls}>
        <button onClick={decreaseQuantity}>-</button>
        <span>{quantity}</span>
        <button onClick={increaseQuantity}>+</button>
      </div>

      {/** Spice level if applicable **/}
      {item.hasSpiceLevel && (
        <div className={styles.spiceLevelSelector}>
          <label>Choose Spice Level:</label>
          <div>
            {["No Spice", "Mild", "Medium", "Hot"].map(level => (
              <button
                key={level}
                onClick={() => setSpiceLevel(level)}
                style={{ fontWeight: spiceLevel === level ? "bold" : "normal" }}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      )}

      {/** Special instructions **/}
      <div className={styles.instructionsWrapper}>
        <label htmlFor="specialInstructions">Special Instructions:</label>
        <textarea
          id="specialInstructions"
          value={specialInstructions}
          onChange={(e) => setSpecialInstructions(e.target.value)}
          placeholder="E.g., no onions, extra sauce..."
        />
      </div>

      {/** Add to Cart Button **/}
      <button className={styles.addButton} onClick={handleAddToCart}>
        Add to Cart (${calculateTotalPrice().toFixed(2)})
      </button>

      {/** Feedback Message **/}
      {showMessage && <div className={styles.feedback}>Item added to cart!</div>}
    </div>
  );
}
