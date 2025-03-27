"use client";

import React, { useState } from "react";
import OptionGroupEditor from "./OptionGroupEditor";
import styles from "./MenuItemEditor.module.css";
import type { MenuCategory, MenuItemOptionGroup, MenuItem } from "@/utils/types";

interface MenuItemEditorProps {
  categoryId: string | null;
  editingItem: MenuItem | null;
  onSaved: () => void;
  onPreview: (item: MenuItem) => void;
  categories: MenuCategory[];
}

/**
 * For a quick local preview (blob URL), we use URL.createObjectURL if needed.
 */
function createLocalPreviewURL(file: File) {
  return URL.createObjectURL(file);
}

const MenuItemEditor: React.FC<MenuItemEditorProps> = ({
  categoryId,
  editingItem,
  onSaved,
  onPreview,
  categories,
}) => {
  const [title, setTitle] = useState<string>(editingItem?.title || "");
  const [description, setDescription] = useState<string>(editingItem?.description || "");
  const [price, setPrice] = useState<number>(editingItem?.price || 0);
  const [imageUrl, setImageUrl] = useState<string>(editingItem?.image || "");
  const [hasSpiceLevel, setHasSpiceLevel] = useState<boolean>(editingItem?.hasSpiceLevel || false);
  const [showInGolfMenu, setShowInGolfMenu] = useState<boolean>((editingItem as any)?.showInGolfMenu || false);

  // Option groups
  const [optionGroups, setOptionGroups] = useState<MenuItemOptionGroup[]>(
    editingItem?.optionGroups || []
  );

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  // Subcategory dropdown
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>(categoryId || "");

  // Price numeric safety
  function handlePriceChange(val: string) {
    const parsed = parseFloat(val);
    if (isNaN(parsed)) setPrice(0);
    else setPrice(parsed);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);

      // Show local preview right away
      const localURL = createLocalPreviewURL(file);
      setImageUrl(localURL);
    }
  }

  // Mock upload
  async function uploadFile(file: File): Promise<string> {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Return a pretend final URL
        resolve(`/uploads/${file.name}`);
      }, 1000);
    });
  }

  // Add an option group
  function addOptionGroup() {
    const newGroup: MenuItemOptionGroup = {
      id: Date.now().toString(),
      title: "",
      minRequired: 0,
      maxAllowed: 0,
      optionType: "single-select",
      choices: [],
    };
    setOptionGroups([...optionGroups, newGroup]);
  }
  function updateOptionGroup(index: number, newGroup: MenuItemOptionGroup) {
    const updated = [...optionGroups];
    updated[index] = newGroup;
    setOptionGroups(updated);
  }
  function removeOptionGroup(index: number) {
    const updated = [...optionGroups];
    updated.splice(index, 1);
    setOptionGroups(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let finalImage = imageUrl;

    if (selectedFile) {
      setUploading(true);
      try {
        // Actually upload to get final URL
        finalImage = await uploadFile(selectedFile);
      } catch (err) {
        console.error("File upload error", err);
        alert("Error uploading image");
      } finally {
        setUploading(false);
      }
    }

    const payload: any = {
      title,
      description,
      price,
      image: finalImage,
      hasSpiceLevel,
      optionGroups,
      categoryId: selectedSubcategory,
      showInGolfMenu,
    };

    try {
      const res = await fetch("/api/menu/item", {
        method: editingItem ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        onSaved();
      } else {
        alert("Error: " + data.message);
      }
    } catch (error) {
      console.error("Menu item save error", error);
      alert("An error occurred while saving the menu item.");
    }
  }

  // Show a local or final preview (in a modal via <ItemDetailPage isPreview />)
  function handlePreview() {
    const itemToPreview: MenuItem = {
      id: editingItem?.id || "temp-id",
      title,
      description,
      price,
      image: imageUrl, // could be local blob or final
      hasSpiceLevel,
      category: {
        id: selectedSubcategory,
        name: categories.find((c) => c.id === selectedSubcategory)?.name || "Unnamed",
        type: "MainMenu",
        order: 1,
      },
      optionGroups,
    };
    onPreview(itemToPreview);
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.field}>
        <label>Title:</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className={styles.field}>
        <label>Description:</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className={styles.field}>
        <label>Price:</label>
        <input
          type="number"
          value={price}
          onChange={(e) => handlePriceChange(e.target.value)}
          required
        />
      </div>

      <div className={styles.field}>
        <label>Image Upload:</label>
        <input type="file" accept="image/*" onChange={handleFileChange} />
        {selectedFile && <p>Selected file: {selectedFile.name}</p>}
        {uploading && <p>Uploading image...</p>}
        {imageUrl && (
          <img src={imageUrl} alt="Preview" style={{ maxWidth: "200px", marginTop: "0.5rem" }} />
        )}
      </div>

      <div className={styles.field}>
        <label>Subcategory:</label>
        <select
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
      </div>

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

      <div className={styles.optionGroups}>
        <h3>Option Groups</h3>
        {optionGroups.map((group, index) => (
          <OptionGroupEditor
            key={group.id}
            group={group}
            onChange={(newGroup) => updateOptionGroup(index, newGroup)}
            onRemove={() => removeOptionGroup(index)}
          />
        ))}
        <button type="button" onClick={addOptionGroup} className={styles.addButton}>
          Add Option Group
        </button>
      </div>

      {/* Buttons Row: Save + Preview */}
      <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
        <button type="submit" className={styles.submitButton} disabled={uploading}>
          Save Menu Item
        </button>
        <button
          type="button"
          onClick={handlePreview}
          className={styles.previewButton}
          disabled={uploading}
        >
          Preview
        </button>
      </div>
    </form>
  );
};

export default MenuItemEditor;
