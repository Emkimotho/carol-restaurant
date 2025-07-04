// File: components/dashboard/AdminDashboard/MenuBuilder/MenuItemForm.tsx
/*
  Menu-item editor form (presentation only).
  • Works hand-in-hand with useMenuItemEditor for logic & mutation.
  • On successful save:
      – Fires a Toastify “success” message.
      – If it was *new* (not editing), clears every field inc. file-picker.
      – If it was an *edit*, leaves all fields as-is so the admin sees the
        saved state (including previously-uploaded image).
*/

"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import { toast } from "react-toastify";

import type { MenuCategory, MenuItem, MenuItemOptionGroup } from "@/utils/types";
import OptionGroupEditor from "./OptionGroupEditor";
import { useMenuItemEditor } from "./useMenuItemEditor";
import styles from "./MenuItemEditor.module.css";

interface MenuItemFormProps {
  categoryId: string | null;
  editingItem: MenuItem | null;
  onSaved: () => void;
  onPreview: (item: MenuItem) => void;
  categories: MenuCategory[];
}

export default function MenuItemForm({
  categoryId,
  editingItem,
  onSaved,
  onPreview,
  categories,
}: MenuItemFormProps) {
  /* ----------------------------------------------------------------
     Hook handles all state + mutations
  ------------------------------------------------------------------ */
  const {
    title,
    setTitle,
    description,
    setDescription,
    price,
    handlePriceChange,
    imageUrl,
    selectedFile,
    uploading,
    handleFileChange,
    selectedSubcategory,
    setSelectedSubcategory,
    stock,
    setStock,
    hasSpiceLevel,
    setHasSpiceLevel,
    hasAlcohol,
    setHasAlcohol,
    showInGolfMenu,
    setShowInGolfMenu,
    categoryIsGolf,
    optionGroups,
    addOptionGroup,
    updateOptionGroup,
    removeOptionGroup,
    errors,
    clearDraft,
    handleSubmit,
    handlePreview,
    mutation,
  } = useMenuItemEditor({ categoryId, editingItem, onSaved, onPreview });

  /* ----------------------------------------------------------------
     Toast + clear logic after a successful mutation
  ------------------------------------------------------------------ */
  useEffect(() => {
    if (mutation.isSuccess) {
      toast.success(editingItem ? "Menu item updated!" : "Menu item created!");

      // Clear only when it was a *new* item – preserve state on edits
      if (!editingItem) {
        clearDraft();           // resets all local fields incl. file input
      }
    }
  }, [mutation.isSuccess, editingItem, clearDraft]);

  /* ----------------------------------------------------------------
     Render
  ------------------------------------------------------------------ */
  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      {/* Title */}
      <div className={styles.field}>
        <label htmlFor="title">Title:</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        {errors.title && <span className={styles.error}>{errors.title}</span>}
      </div>

      {/* Description */}
      <div className={styles.field}>
        <label htmlFor="description">Description:</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* Price */}
      <div className={styles.field}>
        <label htmlFor="price">Price:</label>
        <div className={styles.moneyInput}>
          <span className={styles.dollar}>$</span>
          <input
            id="price"
            type="number"
            step="0.01"
            min="0"
            value={price === 0 ? "" : price}
            onChange={(e) => handlePriceChange(e.target.value)}
            required
          />
        </div>
        {errors.price && <span className={styles.error}>{errors.price}</span>}
      </div>

      {/* Image Upload */}
      <div className={styles.field}>
        <label htmlFor="imageUpload">Image Upload:</label>
        <input
          id="imageUpload"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
        />
        {selectedFile && <p>Selected file: {selectedFile.name}</p>}
        {uploading && <p>Uploading image...</p>}

        {imageUrl && (
          <div style={{ marginTop: "0.5rem", maxWidth: "200px" }}>
            <Image
              src={imageUrl}
              alt="Preview"
              width={200}
              height={200}
              unoptimized
              style={{ maxWidth: "100%", height: "auto" }}
            />
          </div>
        )}
      </div>

      {/* Subcategory */}
      <div className={styles.field}>
        <label htmlFor="subcategory">Subcategory:</label>
        <select
          id="subcategory"
          value={selectedSubcategory}
          onChange={(e) => setSelectedSubcategory(e.target.value)}
          required
        >
          <option value="">-- Choose a Subcategory --</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        {errors.subcategory && (
          <span className={styles.error}>{errors.subcategory}</span>
        )}
      </div>

      {/* Stock */}
      <div className={styles.field}>
        <label htmlFor="stock">Stock:</label>
        <input
          id="stock"
          type="number"
          min="0"
          value={stock === 0 ? "" : stock}
          onChange={(e) => setStock(parseInt(e.target.value) || 0)}
          required
        />
        {errors.stock && <span className={styles.error}>{errors.stock}</span>}
      </div>

      {/* Flags */}
      {!categoryIsGolf && (
        <div className={styles.field}>
          <label>
            <input
              type="checkbox"
              checked={showInGolfMenu}
              onChange={(e) => setShowInGolfMenu(e.target.checked)}
            />
            Also show in Golf Menu
          </label>
        </div>
      )}
      <div className={styles.field}>
        <label>
          <input
            type="checkbox"
            checked={hasSpiceLevel}
            onChange={(e) => setHasSpiceLevel(e.target.checked)}
          />
          Supports Spice Level
        </label>
      </div>
      <div className={styles.field}>
        <label>
          <input
            type="checkbox"
            checked={hasAlcohol}
            onChange={(e) => setHasAlcohol(e.target.checked)}
          />
          Contains Alcohol
        </label>
      </div>

      {/* Option Groups */}
      <div className={styles.optionGroups}>
        <h3>Option Groups</h3>
        {optionGroups.map((g: MenuItemOptionGroup, idx: number) => (
          <OptionGroupEditor
            key={g.id}
            group={g}
            onChange={(ng) => updateOptionGroup(idx, ng)}
            onRemove={() => removeOptionGroup(idx)}
          />
        ))}
        <button
          type="button"
          onClick={addOptionGroup}
          className={styles.addButton}
        >
          Add Option Group
        </button>
      </div>

      {/* Buttons */}
      <div className={styles.buttonsRow}>
        <button type="submit" disabled={uploading || mutation.isPending}>
          {uploading || mutation.isPending ? "Saving…" : "Save Menu Item"}
        </button>
        <button type="button" onClick={handlePreview} disabled={uploading}>
          Preview
        </button>
      </div>

      {/* Clear draft (only when adding new) */}
      {!editingItem && (
        <div className={styles.clearDraftRow}>
          <button
            type="button"
            onClick={clearDraft}
            className={styles.clearDraftButton}
          >
            Clear Draft
          </button>
        </div>
      )}
    </form>
  );
}
