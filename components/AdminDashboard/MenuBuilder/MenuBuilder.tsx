"use client";

import React, { useState, useEffect } from "react";
import CategoryList from "./CategoryList";
import MenuItemEditor from "./MenuItemEditor";
import ItemDetailPage from "@/components/MenuItem/ItemDetailPage"; // Adjust path if needed
import styles from "./MenuBuilder.module.css";
import type { MenuCategory, MenuItem } from "@/utils/types";

const MenuBuilder: React.FC = () => {
  // State for subcategories (MenuCategory)
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  // The ID of the currently selected subcategory
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  // The menu item currently being edited (or null for a new item)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  // For displaying a detailed preview of a menu item
  const [previewItem, setPreviewItem] = useState<MenuItem | null>(null);

  // Loading and error states
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Fetch subcategories when the component mounts
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch subcategories from the backend API
  const fetchCategories = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/menu/category");
      if (!res.ok) throw new Error("Failed to fetch categories");
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Handler: when a subcategory is selected from the CategoryList
  const handleCategorySelect = (catId: string) => {
    setSelectedCategory(catId);
    setEditingItem(null); // Reset any editing item
  };

  // Handler: update categories after drag-and-drop reordering
  const handleReorder = (newOrder: MenuCategory[]) => {
    setCategories(newOrder);
    // Optionally, persist the new order to the backend here
  };

  // Handler: create a new subcategory (defaults type to "MainMenu")
  const handleCreateSubcategory = async () => {
    const subcategoryName = prompt("Enter new subcategory name:");
    if (!subcategoryName) return;

    try {
      const res = await fetch("/api/menu/category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: subcategoryName, type: "MainMenu" }),
      });
      const data = await res.json();
      if (res.ok) {
        setCategories([...categories, data.category]);
      } else {
        alert("Error: " + data.message);
      }
    } catch (error) {
      console.error("Subcategory creation error:", error);
      alert("Error creating subcategory.");
    }
  };

  // Handler: after a menu item is saved, refresh categories and clear the editor
  const handleSaved = () => {
    fetchCategories();
    setEditingItem(null);
  };

  // Handler: set an existing menu item for editing
  const handleEditItem = (menuItem: MenuItem) => {
    setEditingItem(menuItem);
  };

  // Handler: start a new menu item
  const handleNewItem = () => {
    setEditingItem(null);
  };

  // Handler: when MenuItemEditor triggers a preview, store the item to preview
  const handlePreviewItem = (item: MenuItem) => {
    setPreviewItem(item);
  };

  return (
    <div className={styles.menuBuilderContainer}>
      <h2>Menu Builder - Manage Categories & Items</h2>

      {loading && <p>Loading categories...</p>}
      {error && <p className={styles.error}>{error}</p>}

      {/* Button to create a new subcategory */}
      <button onClick={handleCreateSubcategory} className={styles.addCategoryButton}>
        + Add Subcategory
      </button>

      {/* Render the subcategory list with drag-and-drop reordering */}
      <CategoryList
        categories={categories}
        onSelectCategory={handleCategorySelect}
        onReorder={handleReorder}
      />

      <hr />

      <div className={styles.editorSection}>
        <div className={styles.editorHeader}>
          <h2>{editingItem ? "Edit Menu Item" : "Add New Menu Item"}</h2>
          {!editingItem && (
            <button onClick={handleNewItem} className={styles.newItemButton}>
              New Menu Item
            </button>
          )}
        </div>

        <MenuItemEditor
          categoryId={selectedCategory}
          editingItem={editingItem}
          onSaved={handleSaved}
          categories={categories}
          onPreview={handlePreviewItem}
        />
      </div>

      {/* Preview Modal: display the detailed preview using the customer-facing ItemDetailPage */}
      {previewItem && (
        <div className={styles.previewModal}>
          <div className={styles.previewContent}>
            <ItemDetailPage item={previewItem} isPreview />
            <button onClick={() => setPreviewItem(null)}>Close Preview</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuBuilder;
