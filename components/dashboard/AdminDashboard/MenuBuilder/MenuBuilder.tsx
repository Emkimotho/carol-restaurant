/* ------------------------------------------------------------------
   File: components/dashboard/AdminDashboard/MenuBuilder/MenuBuilder.tsx

   • Admin UI for Categories & Items
   • Supports:
       – selecting category type  (MainMenu | GolfMenu)
       – “Hidden on public menu”  checkbox when creating / editing
   ------------------------------------------------------------------ */

"use client";

import React, { useState, useEffect } from "react";
import CategoryList      from "./CategoryList";
import MenuItemList      from "./MenuItemList";
import MenuItemEditor    from "./MenuItemEditor";
import ItemDetailPage    from "@/components/MenuItem/ItemDetailPage";
import styles            from "./MenuBuilder.module.css";
import { useQueryClient } from "@tanstack/react-query";
import { toast }          from "react-toastify";

import type { MenuCategory, MenuItem } from "@/utils/types";

const MenuBuilder: React.FC = () => {
  /* ----------------------------------------------------------------
     local state
  ------------------------------------------------------------------ */
  const [categories,        setCategories]      = useState<MenuCategory[]>([]);
  const [selectedCategory,  setSelectedCategory]= useState<string | null>(null);
  const [editingItem,       setEditingItem]     = useState<MenuItem | null>(null);
  const [previewItem,       setPreviewItem]     = useState<MenuItem | null>(null);

  const [loadingCategories, setLoadingCategories] = useState(false);
  const [error,             setError]             = useState("");

  const [showItems,         setShowItems] = useState(false);  // collapsible item list

  const queryClient = useQueryClient();

  /* ----------------------------------------------------------------
     fetch categories once on mount
  ------------------------------------------------------------------ */
  useEffect(() => { fetchCategories(); }, []);

  async function fetchCategories() {
    setLoadingCategories(true);
    setError("");
    try {
      const res  = await fetch("/api/menu/category");
      if (!res.ok) throw new Error("Failed to fetch categories");
      const json = await res.json();
      setCategories(json.categories || []);
    } catch (err: any) {
      setError(err.message || "Unknown error occurred");
    } finally {
      setLoadingCategories(false);
    }
  }

  /* ----------------------------------------------------------------
     category helpers
  ------------------------------------------------------------------ */
  function handleCategorySelect(catId: string) {
    setSelectedCategory(catId);
    setEditingItem(null);               // reset the right‑hand editor
  }

  function handleReorder(newOrder: MenuCategory[]) {
    setCategories(newOrder);
    // TODO: Persist new order with PATCH /api/menu/category/reorder
  }

  /* ----------------------------------------------------------------
     create / edit / delete category
     (quick‑and‑dirty window.prompt UI – fine for internal admin)
  ------------------------------------------------------------------ */
  async function handleCreateSubcategory() {
    const name         = prompt("Sub‑category name:");
    if (!name) return;

    const type         = prompt('Type ("MainMenu" or "GolfMenu"):', "MainMenu") || "MainMenu";
    const hiddenAnswer = prompt("Hide on public menu? (yes / no):", "no")      || "no";
    const hidden       = hiddenAnswer.toLowerCase() === "yes";

    try {
      const res  = await fetch("/api/menu/category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, hidden }),
      });
      const json = await res.json();
      if (!res.ok) return alert("Error: " + json.message);

      setCategories(prev => [...prev, json.category]);
    } catch {
      alert("Error creating sub‑category.");
    }
  }

  async function handleEditCategory(catId: string) {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return alert("Sub‑category not found.");

    const name   = prompt("Sub‑category name:",   cat.name) || cat.name;
    const type   = prompt('Type ("MainMenu" or "GolfMenu"):', cat.type) || cat.type;
    const hidden = (prompt("Hide on public menu? (yes / no):", cat.hidden ? "yes" : "no") || (cat.hidden ? "yes" : "no"))
      .toLowerCase() === "yes";

    try {
      const res  = await fetch(`/api/menu/category/${catId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, hidden }),
      });
      const json = await res.json();
      if (!res.ok) return alert("Error: " + json.message);

      fetchCategories();                        // refresh list
    } catch {
      alert("Error updating sub‑category.");
    }
  }

  async function handleDeleteCategory(catId: string) {
    if (!confirm("Delete this sub‑category?")) return;
    try {
      const res  = await fetch(`/api/menu/category/${catId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) return alert("Error: " + json.message);

      fetchCategories();
    } catch {
      alert("Error deleting sub‑category.");
    }
  }

  /* ----------------------------------------------------------------
     menu‑item handlers
  ------------------------------------------------------------------ */
  function handleEditItem(item: MenuItem) {
    setEditingItem(item);
  }

  async function handleDeleteItem(item: MenuItem) {
    if (!confirm(`Delete "${item.title}"?`)) return;
    try {
      const res  = await fetch(`/api/menu/item/${item.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) return toast.error(`Error: ${json.message}`);

      toast.success(`Menu item "${item.title}" deleted.`);
      queryClient.invalidateQueries({ queryKey: ["menuItems"] });      // refresh RTK cache
      setEditingItem(curr => (curr?.id === item.id ? null : curr));    /* FIX */
    } catch {
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
    fetchCategories();                                   // reflect any category add / move
    setEditingItem(null);
    queryClient.invalidateQueries({ queryKey: ["menuItems"] });
  }

  /* ----------------------------------------------------------------
     render
  ------------------------------------------------------------------ */
  return (
    <div className={styles.menuBuilderContainer}>
      <h2>Menu Builder &nbsp;–&nbsp; Manage Categories & Items</h2>

      {loadingCategories && <p>Loading categories…</p>}
      {error && <p className={styles.error}>{error}</p>}

      <button onClick={handleCreateSubcategory} className={styles.addCategoryButton}>
        + Add Sub‑category
      </button>

      <CategoryList
        categories={categories}
        onSelectCategory={handleCategorySelect}
        onReorder={handleReorder}
        onEditCategory={handleEditCategory}
        onDeleteCategory={handleDeleteCategory}
        selected={selectedCategory}             /* FIX – highlight active */
      />

      <hr />

      <button
        className={styles.toggleItemsButton}
        onClick={() => setShowItems(p => !p)}
        disabled={!!error || loadingCategories} /* FIX – avoid clicking while loading/error */
      >
        {showItems ? "Hide Menu Items" : "Show Menu Items"}
      </button>

      {showItems && (
        <>
          <hr />
          <MenuItemList
            onEditItem={handleEditItem}
            onDeleteItem={handleDeleteItem}
            filterCategory={selectedCategory}   /* optional helper to narrow list */
          />
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
          onPreview={handlePreviewItem}
          categories={categories}
        />
      </div>

      {previewItem && (
        <div className={styles.previewModal}>
          <div className={styles.previewContent}>
            <ItemDetailPage item={previewItem} isPreview />
            <button onClick={() => setPreviewItem(null)}>Close Preview</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuBuilder;
