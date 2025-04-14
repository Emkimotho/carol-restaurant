"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import OptionGroupEditor from "./OptionGroupEditor";
import CloverItemSelect from "components/dashboard/AdminDashboard/MenuBuilder/CloverItemSelect";
import styles from "./MenuItemEditor.module.css";
import type { MenuCategory, MenuItemOptionGroup, MenuItem } from "@/utils/types";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  useMutation,
  useQueryClient,
  UseMutationResult,
} from "@tanstack/react-query";

// Helper: Generate a local preview URL for a File.
function createLocalPreviewURL(file: File) {
  return URL.createObjectURL(file);
}

// Key used for storing drafts in localStorage.
const DRAFT_KEY = "menuItemDraft";

interface MenuItemEditorProps {
  categoryId: string | null;
  editingItem: MenuItem | null;
  onSaved: () => void;
  onPreview: (item: MenuItem) => void;
  categories: MenuCategory[];
}

const MenuItemEditor: React.FC<MenuItemEditorProps> = ({
  categoryId,
  editingItem,
  onSaved,
  onPreview,
  categories,
}) => {
  // Base form state
  const [title, setTitle] = useState(editingItem?.title || "");
  const [description, setDescription] = useState(editingItem?.description || "");
  const [price, setPrice] = useState(editingItem?.price || 0);
  const [imageUrl, setImageUrl] = useState(editingItem?.image || "");
  const [hasSpiceLevel, setHasSpiceLevel] = useState(editingItem?.hasSpiceLevel || false);
  const [showInGolfMenu, setShowInGolfMenu] = useState((editingItem as any)?.showInGolfMenu || false);
  const [optionGroups, setOptionGroups] = useState<MenuItemOptionGroup[]>(editingItem?.optionGroups || []);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedSubcategory, setSelectedSubcategory] = useState(categoryId || "");

  // NEW: State for Clover Item ID (populated via the dropdown) – now required.
  const [cloverItemId, setCloverItemId] = useState(editingItem?.cloverItemId || "");
  // NEW: State for stock (inventory) – should be auto-populated from Clover.
  const [stock, setStock] = useState<number>(editingItem?.stock ?? 0);

  // Inline validation errors (added cloverItemId)
  const [errors, setErrors] = useState<{
    title?: string;
    price?: string;
    subcategory?: string;
    stock?: string;
    cloverItemId?: string;
  }>({});

  const queryClient = useQueryClient();

  // Debug: log editingItem to check if category is populated
  useEffect(() => {
    console.log("editingItem:", editingItem);
  }, [editingItem]);

  // When editingItem changes, update the form fields so that the editor is pre-populated.
  useEffect(() => {
    if (editingItem) {
      setTitle(editingItem.title);
      setDescription(editingItem.description || "");
      setPrice(editingItem.price);
      setImageUrl(editingItem.image || "");
      setHasSpiceLevel(editingItem.hasSpiceLevel);
      setOptionGroups(editingItem.optionGroups || []);
      setCloverItemId(editingItem.cloverItemId || "");
      setStock(editingItem.stock);
      if (editingItem.category && editingItem.category.id) {
        setSelectedSubcategory(editingItem.category.id);
      } else {
        console.warn("Editing item has no category relation loaded.");
        setSelectedSubcategory("");
      }
    }
  }, [editingItem]);

  // If not editing an existing item, load a draft from localStorage.
  useEffect(() => {
    if (!editingItem) {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft) {
        const parsed = JSON.parse(draft);
        setTitle(parsed.title || "");
        setDescription(parsed.description || "");
        setPrice(parsed.price || 0);
        setImageUrl(parsed.imageUrl || "");
        setHasSpiceLevel(parsed.hasSpiceLevel || false);
        setShowInGolfMenu(parsed.showInGolfMenu || false);
        setOptionGroups(parsed.optionGroups || []);
        setSelectedSubcategory(parsed.selectedSubcategory || categoryId || "");
        setCloverItemId(parsed.cloverItemId || "");
        setStock(parsed.stock ?? 0);
      }
    }
  }, [editingItem, categoryId]);

  // Auto-save a draft to localStorage (only if not editing).
  useEffect(() => {
    if (!editingItem) {
      const timeout = setTimeout(() => {
        const draft = {
          title,
          description,
          price,
          imageUrl,
          hasSpiceLevel,
          showInGolfMenu,
          optionGroups,
          selectedSubcategory,
          cloverItemId,
          stock,
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [
    title,
    description,
    price,
    imageUrl,
    hasSpiceLevel,
    showInGolfMenu,
    optionGroups,
    selectedSubcategory,
    cloverItemId,
    stock,
    editingItem,
    categoryId,
  ]);

  function clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
    toast.info("Draft cleared");
  }

  function handlePriceChange(val: string) {
    const parsed = parseFloat(val);
    if (isNaN(parsed)) setPrice(0);
    else setPrice(parsed);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const localURL = createLocalPreviewURL(file);
      setImageUrl(localURL);
    }
  }

  // Simulate a file upload (returns a URL string).
  async function uploadFile(file: File): Promise<string> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(`/images/${file.name}`);
      }, 1000);
    });
  }

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

  function validateForm() {
    const newErrors: {
      title?: string;
      price?: string;
      subcategory?: string;
      stock?: string;
      cloverItemId?: string;
    } = {};
    if (!title.trim()) newErrors.title = "Title is required.";
    if (price <= 0) newErrors.price = "Price must be greater than zero.";
    if (!selectedSubcategory) newErrors.subcategory = "Subcategory is required.";
    if (stock < 0) newErrors.stock = "Stock cannot be negative.";
    // Ensure the Clover Item ID is filled.
    if (!cloverItemId.trim()) newErrors.cloverItemId = "Clover ID is required.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // Determine endpoint and method: if editing, use PUT; if new, use POST.
  async function saveMenuItem(payload: any) {
    const endpoint = editingItem ? `/api/menu/item/${editingItem.id}` : `/api/menu/item`;
    const method = editingItem ? "PUT" : "POST";

    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Error saving menu item");
    }
    return data;
  }

  const mutation: UseMutationResult<any, Error, any> = useMutation({
    mutationFn: (payload: any) => saveMenuItem(payload),
    onSuccess: () => {
      toast.success("Menu item saved successfully!");
      queryClient.invalidateQueries({ queryKey: ["menuItems"] });
      // Reset form fields.
      setTitle("");
      setDescription("");
      setPrice(0);
      setImageUrl("");
      setSelectedFile(null);
      setHasSpiceLevel(false);
      setShowInGolfMenu(false);
      setOptionGroups([]);
      setSelectedSubcategory("");
      setCloverItemId("");
      setStock(0);
      clearDraft();
      onSaved();
    },
    onError: (err: Error) => {
      toast.error("Error: " + err.message);
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) return;

    let finalImage = imageUrl;
    if (selectedFile) {
      setUploading(true);
      try {
        finalImage = await uploadFile(selectedFile);
      } catch (err) {
        console.error("File upload error", err);
        toast.error("Error uploading image");
        return;
      } finally {
        setUploading(false);
      }
    }

    const payload = {
      title,
      description,
      price,
      image: finalImage,
      hasSpiceLevel,
      optionGroups,
      categoryId: selectedSubcategory,
      showInGolfMenu,
      cloverItemId,
      stock,
    };

    mutation.mutate(payload);
  }

  function handlePreview() {
    const itemToPreview: MenuItem = {
      id: editingItem?.id || "temp-id",
      title,
      description,
      price,
      image: imageUrl,
      hasSpiceLevel,
      category: {
        id: selectedSubcategory,
        name: categories.find((c) => c.id === selectedSubcategory)?.name || "Unnamed",
        type: "MainMenu",
        order: 1,
      },
      optionGroups,
      cloverItemId,
      stock,
    };
    onPreview(itemToPreview);
  }

  const isSaving = mutation.status === "pending";

  return (
    <form onSubmit={handleSubmit} className={styles.form} noValidate>
      <div className={styles.field}>
        <label htmlFor="title">Title:</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-required="true"
          required
        />
        {errors.title && <span className={styles.error}>{errors.title}</span>}
      </div>

      <div className={styles.field}>
        <label htmlFor="description">Description:</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="price">Price:</label>
        <input
          id="price"
          type="number"
          value={price}
          onChange={(e) => handlePriceChange(e.target.value)}
          aria-required="true"
          required
        />
        {errors.price && <span className={styles.error}>{errors.price}</span>}
      </div>

      <div className={styles.field}>
        <label htmlFor="imageUpload">Image Upload:</label>
        <input id="imageUpload" type="file" accept="image/*" onChange={handleFileChange} />
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

      <div className={styles.field}>
        <label htmlFor="subcategory">Subcategory:</label>
        <select
          id="subcategory"
          value={selectedSubcategory}
          onChange={(e) => setSelectedSubcategory(e.target.value)}
          aria-required="true"
          required
        >
          <option value="">-- Choose a Subcategory --</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        {errors.subcategory && <span className={styles.error}>{errors.subcategory}</span>}
      </div>

      <div className={styles.field}>
        <label htmlFor="stock">Stock:</label>
        {process.env.NODE_ENV === "development" ? (
          <input id="stock" type="number" value={stock} readOnly />
        ) : (
          <input
            id="stock"
            type="number"
            value={stock}
            onChange={(e) => setStock(parseInt(e.target.value) || 0)}
            aria-required="true"
            required
          />
        )}
        {errors.stock && <span className={styles.error}>{errors.stock}</span>}
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

      {/* Clover Item Select is now required */}
      <div className={styles.field}>
        <CloverItemSelect value={cloverItemId} onChange={setCloverItemId} />
        {errors.cloverItemId && <span className={styles.error}>{errors.cloverItemId}</span>}
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

      <div className={styles.buttonsRow}>
        <button type="submit" className={styles.submitButton} disabled={uploading || isSaving}>
          {isSaving ? "Saving menu item..." : "Save Menu Item"}
        </button>
        <button type="button" onClick={handlePreview} className={styles.previewButton} disabled={uploading || isSaving}>
          Preview
        </button>
      </div>

      {!editingItem && (
        <div className={styles.clearDraftRow}>
          <button type="button" onClick={clearDraft} className={styles.clearDraftButton}>
            Clear Draft
          </button>
        </div>
      )}
    </form>
  );
};

export default MenuItemEditor;
