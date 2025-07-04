// File: components/dashboard/AdminDashboard/MenuBuilder/useMenuItemEditor.ts
/*
  Custom React hook to manage state & operations for MenuItemForm
  ──────────────────────────────────────────────────────────────────
  • Loads draft data from localStorage and syncs with editingItem
  • Manages form fields: title, description, price, image, options…
  • Validates inputs and gathers errors
  • Handles image upload (POST /api/upload → Cloudinary)
  • Creates / updates menu items via React-Query mutation
  • After save → triggers Clover sync, fires Toast, clears form
    (clears only when adding a NEW item; edits keep current state)
  • Exposes helpers + mutation object to the presentation component
*/

import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import type { MenuItem, MenuItemOptionGroup } from "@/utils/types";

const DRAFT_KEY = "menuItemDraft";
const createLocalPreviewURL = (file: File) => URL.createObjectURL(file);

interface UseMenuItemEditorParams {
  categoryId: string | null;
  editingItem: MenuItem | null;
  onSaved: () => void;
  onPreview: (item: MenuItem) => void;
}

interface UseMenuItemEditorReturn {
  /* form fields */
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  price: number;
  handlePriceChange: (v: string) => void;
  imageUrl: string;
  publicId: string | null;
  selectedFile: File | null;
  uploading: boolean;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  selectedSubcategory: string;
  setSelectedSubcategory: (v: string) => void;
  stock: number;
  setStock: (v: number) => void;
  hasSpiceLevel: boolean;
  setHasSpiceLevel: (v: boolean) => void;
  hasAlcohol: boolean;
  setHasAlcohol: (v: boolean) => void;
  showInGolfMenu: boolean;
  setShowInGolfMenu: (v: boolean) => void;
  categoryIsGolf: boolean;
  optionGroups: MenuItemOptionGroup[];
  addOptionGroup: () => void;
  updateOptionGroup: (idx: number, g: MenuItemOptionGroup) => void;
  removeOptionGroup: (idx: number) => void;
  /* utils */
  errors: Record<string, string>;
  clearDraft: () => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handlePreview: () => void;
  mutation: UseMutationResult<any, Error, any>;
}

export function useMenuItemEditor({
  categoryId,
  editingItem,
  onSaved,
  onPreview,
}: UseMenuItemEditorParams): UseMenuItemEditorReturn {
  /* ───────── state ───────── */
  const [title, setTitle]                   = useState(editingItem?.title ?? "");
  const [description, setDescription]       = useState(editingItem?.description ?? "");
  const [price, setPrice]                   = useState<number>(editingItem?.price ?? 0);
  const [imageUrl, setImageUrl]             = useState(editingItem?.imageUrl ?? editingItem?.image ?? "");
  const [publicId, setPublicId]             = useState<string | null>(editingItem?.cloudinaryPublicId ?? null);
  const [selectedFile, setSelectedFile]     = useState<File | null>(null);
  const [uploading, setUploading]           = useState(false);
  const [selectedSubcategory, setSelectedSubcategory] = useState(categoryId ?? "");
  const [stock, setStock]                   = useState<number>(editingItem?.stock ?? 0);
  const [hasSpiceLevel, setHasSpiceLevel]   = useState(editingItem?.hasSpiceLevel ?? false);
  const [hasAlcohol, setHasAlcohol]         = useState(editingItem?.isAlcohol ?? false);
  const [showInGolfMenu, setShowInGolfMenu] = useState(editingItem?.showInGolfMenu ?? false);
  const [optionGroups, setOptionGroups]     = useState<MenuItemOptionGroup[]>(editingItem?.optionGroups ?? []);
  const [errors, setErrors]                 = useState<Record<string, string>>({});

  /* override if the category being edited is specifically the Golf menu */
  const categoryIsGolf = false;

  /* ───────── sync incoming editingItem → form fields ───────── */
  useEffect(() => {
    if (editingItem) {
      setTitle(editingItem.title);
      setDescription(editingItem.description ?? "");
      setPrice(editingItem.price);
      setImageUrl(editingItem.imageUrl ?? editingItem.image ?? "");
      setPublicId(editingItem.cloudinaryPublicId ?? null);
      setHasSpiceLevel(editingItem.hasSpiceLevel);
      setHasAlcohol(editingItem.isAlcohol ?? false);
      setShowInGolfMenu(editingItem.showInGolfMenu ?? false);
      setOptionGroups(editingItem.optionGroups ?? []);
      setSelectedSubcategory(editingItem.category?.id ?? categoryId ?? "");
      setStock(editingItem.stock);
    }
  }, [editingItem, categoryId]);

  /* ───────── load draft when creating new item ───────── */
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
          /* ignore draft parse errors */
        }
      }
    }
  }, [editingItem, categoryId]);

  /* ───────── draft autosave ───────── */
  useEffect(() => {
    if (!editingItem) {
      const timer = setTimeout(() => {
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
      return () => clearTimeout(timer);
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

  /* ───────── helpers ───────── */
  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    toast.info("Draft cleared");
  };

  const handlePriceChange = (value: string) => {
    const cleaned = value.replace(/^0+(?=\d)/, "");
    setPrice(parseFloat(cleaned) || 0);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (file) {
      setImageUrl(createLocalPreviewURL(file));
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
    setOptionGroups((prev) => prev.map((og, i) => (i === idx ? g : og)));

  const removeOptionGroup = (idx: number) =>
    setOptionGroups((prev) => prev.filter((_, i) => i !== idx));

  /* ───────── validation ───────── */
  const validate = () => {
    const v: Record<string, string> = {};
    if (!title.trim()) v.title = "Title is required.";
    if (price <= 0) v.price = "Price must be greater than zero.";
    if (!selectedSubcategory) v.subcategory = "Subcategory is required.";
    if (stock < 0) v.stock = "Stock cannot be negative.";
    setErrors(v);
    return Object.keys(v).length === 0;
  };

  /* ───────── mutation (save) ───────── */
  const mutation = useMutation<any, Error, any>({
    mutationFn: async (data) => {
      const url = editingItem ? `/api/menu/item/${editingItem.id}` : "/api/menu/item";
      const res = await fetch(url, {
        method: editingItem ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Save failed");
      return json;
    },
  });

  /* ───────── form submit ───────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    let finalPublicId = publicId;
    let finalUrl      = imageUrl;

    /* optional upload */
    if (selectedFile) {
      setUploading(true);
      const fd = new FormData();
      fd.append("file", selectedFile);
      const upRes  = await fetch("/api/upload", { method: "POST", body: fd });
      const upJson = await upRes.json();
      finalPublicId = upJson.public_id;
      finalUrl      = upJson.secure_url;
      setUploading(false);
    }

    /* payload */
    const payload = {
      title,
      description,
      price,
      cloudinaryPublicId: finalPublicId,
      imageUrl: finalUrl,
      hasSpiceLevel,
      hasAlcohol,
      showInGolfMenu,
      optionGroups,
      categoryId: selectedSubcategory,
      stock,
    };

    try {
      const result   = await mutation.mutateAsync(payload);
      const saved    = result.item ?? result.menuItem;
      if (saved?.id) {
        await fetch(`/api/clover/sync-items/${saved.id}`, { method: "POST" });
      }

      toast.success(editingItem ? "Menu item updated!" : "Menu item created!");

      onSaved();

      /* reset when *adding new* */
      if (!editingItem) {
        setTitle("");
        setDescription("");
        setPrice(0);
        setImageUrl("");
        setPublicId(null);
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

  /* ───────── preview draft ───────── */
  const handlePreview = () => {
    onPreview({
      id: editingItem?.id ?? "temp-id",
      title,
      description,
      price,
      imageUrl,
      cloudinaryPublicId: publicId ?? undefined,
      hasSpiceLevel,
      isAlcohol: hasAlcohol,
      showInGolfMenu,
      category: null as any,
      optionGroups,
      stock,
    } as MenuItem);
  };

  /* ───────── return API ───────── */
  return {
    title,
    setTitle,
    description,
    setDescription,
    price,
    handlePriceChange,
    imageUrl,
    publicId,
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
  };
}
