"use client";

import React, { useState, useEffect } from "react";
import CategoryList from "./CategoryList";
import MenuItemList from "./MenuItemList";
import MenuItemEditor from "./MenuItemEditor";
import ItemDetailPage from "@/components/MenuItem/ItemDetailPage";
import styles from "./MenuBuilder.module.css";
import type { MenuCategory, MenuItem } from "@/utils/types";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";

const MenuBuilder: React.FC = () => {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [previewItem, setPreviewItem] = useState<MenuItem | null>(null);

  const [loadingCategories, setLoadingCategories] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Optional toggle for showing/hiding menu items.
  const [showItems, setShowItems] = useState<boolean>(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    setLoadingCategories(true);
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
      setLoadingCategories(false);
    }
  }

  function handleCategorySelect(catId: string) {
    setSelectedCategory(catId);
    setEditingItem(null);
  }

  function handleReorder(newOrder: MenuCategory[]) {
    setCategories(newOrder);
  }

  async function handleCreateSubcategory() {
    const subcategoryName = prompt("Enter new subcategory name:");
    if (!subcategoryName) return;

    try {
      const res = await fetch("/api/menu/category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: subcategoryName, type: "MainMenu" }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert("Error: " + data.message);
        return;
      }
      setCategories((prev) => [...prev, data.category]);
    } catch (error) {
      console.error("Subcategory creation error:", error);
      alert("Error creating subcategory.");
    }
  }

  async function handleEditCategory(catId: string) {
    const category = categories.find((c) => c.id === catId);
    if (!category) {
      alert("Subcategory not found.");
      return;
    }
    const newName = prompt("Enter new subcategory name", category.name);
    if (!newName) return;

    try {
      const res = await fetch(`/api/menu/category/${catId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, type: category.type }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert("Error: " + data.message);
        return;
      }
      fetchCategories();
    } catch (err) {
      console.error("Error updating subcategory:", err);
      alert("Error updating subcategory.");
    }
  }

  async function handleDeleteCategory(catId: string) {
    const confirmDelete = confirm("Are you sure you want to delete this subcategory?");
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/menu/category/${catId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert("Error: " + data.message);
        return;
      }
      fetchCategories();
    } catch (err) {
      console.error("Error deleting subcategory:", err);
      alert("Error deleting subcategory.");
    }
  }

  function handleEditItem(item: MenuItem) {
    setEditingItem(item);
  }

  async function handleDeleteItem(item: MenuItem) {
    const confirmDel = confirm(`Delete "${item.title}"?`);
    if (!confirmDel) return;

    try {
      const res = await fetch(`/api/menu/item/${item.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(`Error: ${data.message}`);
        return;
      }
      toast.success(`Menu item "${item.title}" deleted.`);
      queryClient.invalidateQueries({ queryKey: ["menuItems"] });
      if (editingItem && editingItem.id === item.id) {
        setEditingItem(null);
      }
    } catch (err) {
      console.error("Error deleting item:", err);
      toast.error("Error deleting menu item.");
    }
  }

  function handleNewItem() {
    setEditingItem(null);
  }

  function handlePreviewItem(item: MenuItem) {
    setPreviewItem(item);
  }

  function handleSaved() {
    fetchCategories();
    setEditingItem(null);
    queryClient.invalidateQueries({ queryKey: ["menuItems"] });
  }

  return (
    <div className={styles.menuBuilderContainer}>
      <h2>Menu Builder - Manage Categories & Items</h2>

      {loadingCategories && <p>Loading categories...</p>}
      {error && <p className={styles.error}>{error}</p>}

      <button onClick={handleCreateSubcategory} className={styles.addCategoryButton}>
        + Add Subcategory
      </button>

      <CategoryList
        categories={categories}
        onSelectCategory={handleCategorySelect}
        onReorder={handleReorder}
        onEditCategory={handleEditCategory}
        onDeleteCategory={handleDeleteCategory}
      />

      <hr />

      <button
        className={styles.toggleItemsButton}
        onClick={() => setShowItems((prev) => !prev)}
      >
        {showItems ? "Hide Menu Items" : "Show Menu Items"}
      </button>

      {showItems && (
        <>
          <hr />
          <MenuItemList onEditItem={handleEditItem} onDeleteItem={handleDeleteItem} />
        </>
      )}

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
