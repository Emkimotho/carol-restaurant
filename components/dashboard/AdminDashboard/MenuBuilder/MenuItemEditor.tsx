/* ------------------------------------------------------------------
   File: components/dashboard/AdminDashboard/MenuBuilder/MenuItemEditor.tsx
   ------------------------------------------------------------------
   • Adds / edits menu items and immediately syncs that single item
     to Clover by calling  POST /api/clover/sync‑items/[itemId]
   • All money fields show a “$” prefix and never display a leading
     zero (so typing “5” shows “5”, not “05”).
   • After creating (POST), the form resets to a blank draft.
   ------------------------------------------------------------------ */

"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image                   from "next/image";
import OptionGroupEditor       from "./OptionGroupEditor";
import styles                  from "./MenuItemEditor.module.css";
import type {
  MenuCategory,
  MenuItemOptionGroup,
  MenuItem,
}                              from "@/utils/types";
import { toast }               from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  useMutation,
  useQueryClient,
  UseMutationResult,
} from "@tanstack/react-query";

/* ------------------------------------------------------------------ */
/*  Helpers & constants                                               */
/* ------------------------------------------------------------------ */
const DRAFT_KEY = "menuItemDraft";
const createLocalPreviewURL = (file: File) => URL.createObjectURL(file);

interface MenuItemEditorProps {
  categoryId:  string | null;
  editingItem: MenuItem | null;
  onSaved:     () => void;
  onPreview:   (item: MenuItem) => void;
  categories:  MenuCategory[];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
const MenuItemEditor: React.FC<MenuItemEditorProps> = ({
  categoryId,
  editingItem,
  onSaved,
  onPreview,
  categories,
}) => {
  /* --------------------- base state ------------------------------ */
  const [title, setTitle]              = useState(editingItem?.title ?? "");
  const [description, setDescription]  = useState(editingItem?.description ?? "");
  const [price, setPrice]              = useState<number>(editingItem?.price ?? 0);
  const [imageUrl, setImageUrl]        = useState(editingItem?.image ?? "");
  const [hasSpiceLevel, setHasSpiceLevel] =
    useState(editingItem?.hasSpiceLevel ?? false);
  const [hasAlcohol, setHasAlcohol]    =
    useState(editingItem?.isAlcohol ?? false);
  const [optionGroups, setOptionGroups] =
    useState<MenuItemOptionGroup[]>(editingItem?.optionGroups ?? []);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading]       = useState(false);

  const [selectedSubcategory, setSelectedSubcategory] =
    useState(categoryId ?? "");

  const [stock, setStock] = useState<number>(editingItem?.stock ?? 0);

  const [errors, setErrors] = useState<{
    title?: string;
    price?: string;
    subcategory?: string;
    stock?: string;
  }>({});

  const queryClient = useQueryClient();

  /* --------------------- helpers --------------------------------- */
  const getSelectedCategory = useCallback(
    () => categories.find((c) => c.id === selectedSubcategory),
    [categories, selectedSubcategory]
  );
  const categoryIsGolf = !!getSelectedCategory()?.type?.includes("GolfMenu");

  const [showInGolfMenu, setShowInGolfMenu] = useState(
    editingItem?.showInGolfMenu ??
      !!categories.find((c) => c.id === categoryId && c.type === "GolfMenu")
  );

  /* ------------- sync state when switching to edit --------------- */
  useEffect(() => {
    if (editingItem) {
      setTitle(editingItem.title);
      setDescription(editingItem.description ?? "");
      setPrice(editingItem.price);
      setImageUrl(editingItem.image ?? "");
      setHasSpiceLevel(editingItem.hasSpiceLevel);
      setHasAlcohol(editingItem.isAlcohol ?? false);
      setOptionGroups(editingItem.optionGroups ?? []);
      setStock(editingItem.stock);
      setSelectedSubcategory(editingItem.category?.id ?? "");
      setShowInGolfMenu(
        editingItem.showInGolfMenu ||
          !!categories.find(
            (c) => c.id === editingItem.category?.id && c.type === "GolfMenu"
          )
      );
    }
  }, [editingItem, categories]);

  /* ------------- load & auto‑save local draft (new item) ---------- */
  useEffect(() => {
    if (!editingItem) {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        try {
          const d = JSON.parse(raw);
          setTitle(d.title ?? "");
          setDescription(d.description ?? "");
          setPrice(d.price ?? 0);
          setImageUrl(d.imageUrl ?? "");
          setHasSpiceLevel(d.hasSpiceLevel ?? false);
          setHasAlcohol(d.hasAlcohol ?? false);
          setShowInGolfMenu(d.showInGolfMenu ?? false);
          setOptionGroups(d.optionGroups ?? []);
          setSelectedSubcategory(d.selectedSubcategory ?? categoryId ?? "");
          setStock(d.stock ?? 0);
        } catch {
          /* ignore */
        }
      }
    }
  }, [editingItem, categoryId]);

  useEffect(() => {
    if (!editingItem) {
      const t = setTimeout(() => {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({
            title,
            description,
            price,
            imageUrl,
            hasSpiceLevel,
            hasAlcohol,
            showInGolfMenu,
            optionGroups,
            selectedSubcategory,
            stock,
          })
        );
      }, 800);
      return () => clearTimeout(t);
    }
  }, [
    title,
    description,
    price,
    imageUrl,
    hasSpiceLevel,
    hasAlcohol,
    showInGolfMenu,
    optionGroups,
    selectedSubcategory,
    stock,
    editingItem,
  ]);

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    toast.info("Draft cleared");
  };

  /* --------------------- handlers -------------------------------- */
  const handlePriceChange = (v: string) => {
    // Strip leading zeros while allowing empty string
    const cleaned = v.replace(/^0+(?=\d)/, "");
    setPrice(parseFloat(cleaned) || 0);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const f = e.target.files[0];
      setSelectedFile(f);
      setImageUrl(createLocalPreviewURL(f));
    }
  };

  const addOptionGroup = () =>
    setOptionGroups((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        title: "",
        minRequired: 0,
        maxAllowed: 0,
        optionType: "single-select",
        choices: [],
      },
    ]);

  const updateOptionGroup = (idx: number, g: MenuItemOptionGroup) =>
    setOptionGroups((prev) => {
      const cp = [...prev];
      cp[idx] = g;
      return cp;
    });

  const removeOptionGroup = (idx: number) =>
    setOptionGroups((prev) => prev.filter((_, i) => i !== idx));

  /* --------------------- validation ------------------------------ */
  const validate = () => {
    const e: typeof errors = {};
    if (!title.trim()) e.title = "Title is required.";
    if (price <= 0) e.price = "Price must be greater than zero.";
    if (!selectedSubcategory) e.subcategory = "Subcategory is required.";
    if (stock < 0) e.stock = "Stock cannot be negative.";
    setErrors(e);
    return !Object.keys(e).length;
  };

  /* --------------------- mutation ------------------------------- */
  const save = async (data: any) => {
    const url = editingItem
      ? `/api/menu/item/${editingItem.id}`
      : `/api/menu/item`;
    const method = editingItem ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j.message || "Save failed");
    return j; // j.item (POST) or j.menuItem (PUT)
  };
  const mutation: UseMutationResult<any, Error, any> = useMutation({
    mutationFn: save,
  });

  /* --------------------- submit ---------------------------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    let finalImage = imageUrl;
    if (selectedFile) {
      setUploading(true);
      finalImage = await new Promise<string>((r) =>
        setTimeout(() => r(`/images/${selectedFile.name}`), 800)
      );
      setUploading(false);
    }

    const payload = {
      title,
      description,
      price,
      image: finalImage,
      hasSpiceLevel,
      hasAlcohol,
      showInGolfMenu,
      optionGroups,
      categoryId: selectedSubcategory,
      stock,
    };

    try {
      const result = await mutation.mutateAsync(payload);

      /* ---------- push this single item to Clover ---------- */
      const savedItem =
        result.item /* POST route */ || result.menuItem /* PUT route */;
      if (savedItem?.id) {
        await fetch(`/api/clover/sync-items/${savedItem.id}`, {
          method: "POST",
        }).catch((err) =>
          console.error("Clover single‑item sync failed:", err)
        );
      }
      /* ----------------------------------------------------- */

      onSaved();

      /* reset form when creating new */
      if (!editingItem) {
        setTitle("");
        setDescription("");
        setPrice(0);
        setImageUrl("");
        setSelectedFile(null);
        setHasSpiceLevel(false);
        setHasAlcohol(false);
        setShowInGolfMenu(false);
        setOptionGroups([]);
        setSelectedSubcategory(categoryId ?? "");
        setStock(0);
        clearDraft();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save menu item");
    }
  };

  /* --------------------- preview --------------------------- */
  const handlePreview = () => {
    const cat =
      categories.find((c) => c.id === selectedSubcategory) || null;
    onPreview({
      id: editingItem?.id || "temp-id",
      title,
      description,
      price,
      image: imageUrl,
      hasSpiceLevel,
      hasAlcohol,
      isAlcohol: hasAlcohol,
      showInGolfMenu,
      category: cat,
      optionGroups,
      stock,
    } as MenuItem);
  };

  /* --------------------- JSX ------------------------------------- */
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
        {errors.title && (
          <span className={styles.error}>{errors.title}</span>
        )}
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
        {errors.price && (
          <span className={styles.error}>{errors.price}</span>
        )}
      </div>

      {/* Image upload */}
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
        {errors.stock && (
          <span className={styles.error}>{errors.stock}</span>
        )}
      </div>

      {/* Golf flag */}
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

      {/* Spice level */}
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

      {/* Alcohol flag */}
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
        {optionGroups.map((g, idx) => (
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
          {mutation.isPending ? "Saving..." : "Save Menu Item"}
        </button>
        <button
          type="button"
          onClick={handlePreview}
          disabled={uploading}
        >
          Preview
        </button>
      </div>

      {/* Clear draft */}
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
};

export default MenuItemEditor;
