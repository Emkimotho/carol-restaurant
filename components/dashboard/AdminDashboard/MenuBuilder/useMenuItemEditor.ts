// File: components/dashboard/AdminDashboard/MenuBuilder/useMenuItemEditor.ts
/*
  Custom React hook to manage the state and operations for the MenuItemEditor component:
  • Loads draft data from localStorage and syncs with editingItem
  • Manages form fields: title, description, price, image upload, options, stock, etc.
  • Validates inputs and collects errors
  • Handles image upload via /api/upload and Cloudinary IDs
  • Creates or updates menu items via React Query mutation
  • Syncs saved item to Clover
  • Supports preview and onSaved callbacks
*/

import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { useMutation, UseMutationResult } from "@tanstack/react-query";
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
  // seed imageUrl state from editingItem.imageUrl or fallback to legacy editingItem.image
  const [title, setTitle] = useState(editingItem?.title ?? "");
  const [description, setDescription] = useState(editingItem?.description ?? "");
  const [price, setPrice] = useState<number>(editingItem?.price ?? 0);
  const [imageUrl, setImageUrl] = useState(
    editingItem?.imageUrl ?? editingItem?.image ?? ""
  );
  const [publicId, setPublicId] = useState<string | null>(
    editingItem?.cloudinaryPublicId ?? null
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedSubcategory, setSelectedSubcategory] = useState(categoryId ?? "");
  const [stock, setStock] = useState<number>(editingItem?.stock ?? 0);
  const [hasSpiceLevel, setHasSpiceLevel] = useState(editingItem?.hasSpiceLevel ?? false);
  const [hasAlcohol, setHasAlcohol] = useState(editingItem?.isAlcohol ?? false);
  const [showInGolfMenu, setShowInGolfMenu] = useState(editingItem?.showInGolfMenu ?? false);
  const [optionGroups, setOptionGroups] = useState<MenuItemOptionGroup[]>(editingItem?.optionGroups ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // this flag can be overridden by the consuming component if needed
  const categoryIsGolf = false;

  /* Sync form fields when editingItem changes */
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

  /* Load draft from localStorage when not editing an existing item */
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
          // ignore parse errors
        }
      }
    }
  }, [editingItem, categoryId]);

  /* Auto-save draft to localStorage */
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

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    toast.info("Draft cleared");
  };

  /* Handlers */
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

  const updateOptionGroup = (idx: number, group: MenuItemOptionGroup) =>
    setOptionGroups((prev) => prev.map((g, i) => (i === idx ? group : g)));

  const removeOptionGroup = (idx: number) =>
    setOptionGroups((prev) => prev.filter((_, i) => i !== idx));

  /* Validation */
  const validate = () => {
    const validationErrors: Record<string, string> = {};
    if (!title.trim()) validationErrors.title = "Title is required.";
    if (price <= 0) validationErrors.price = "Price must be greater than zero.";
    if (!selectedSubcategory) validationErrors.subcategory = "Subcategory is required.";
    if (stock < 0) validationErrors.stock = "Stock cannot be negative.";
    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  /* Mutation to save/update item */
  const mutation = useMutation<any, Error, any>({
    mutationFn: async (data) => {
      const url = editingItem ? `/api/menu/item/${editingItem.id}` : "/api/menu/item";
      const response = await fetch(url, {
        method: editingItem ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.message || "Save failed");
      return json;
    },
  });

  /* Form submit */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    let finalPublicId = publicId;
    let finalUrl = imageUrl;

    if (selectedFile) {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", selectedFile);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      const uploadJson = await uploadRes.json();
      finalPublicId = uploadJson.public_id;
      finalUrl = uploadJson.secure_url;
      setUploading(false);
    }

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
      const result = await mutation.mutateAsync(payload);
      const savedItem: any = result.item ?? result.menuItem;
      if (savedItem?.id) {
        await fetch(`/api/clover/sync-items/${savedItem.id}`, { method: "POST" });
      }
      onSaved();

      if (!editingItem) {
        // reset form
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
    } catch (error: any) {
      toast.error(error.message || "Failed to save menu item");
    }
  };

  /* Preview draft */
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
