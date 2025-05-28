// File: components/dashboard/AdminDashboard/MenuBuilder/MenuItemList.tsx
"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-toastify";
import styles from "./MenuItemList.module.css";
import type { MenuItem } from "@/utils/types";

export interface MenuItemListProps {
  filterCategory: string | null;               // ← newly added
  onEditItem: (item: MenuItem) => void;
  onDeleteItem: (item: MenuItem) => void;
}

export default function MenuItemList({
  filterCategory,
  onEditItem,
  onDeleteItem,
}: MenuItemListProps) {
  const { data, error, isLoading } = useQuery<MenuItem[]>({
    queryKey: ["menuItems"],
    queryFn: async () => {
      const res = await fetch("/api/menu/item");
      if (!res.ok) throw new Error("Failed to fetch menu items");
      const json = await res.json();
      return json.menuItems as MenuItem[];
    },
  });

  if (isLoading) return <p>Loading items…</p>;
  if (error) {
    const msg = (error as Error).message;
    toast.error(`Error loading items: ${msg}`);
    return <p className={styles.error}>Error loading items.</p>;
  }

  // Filter by the selected category (if any)
  const items = (data ?? []).filter((item) => {
    if (!filterCategory) return true;
    return item.category?.id === filterCategory;
  });

  if (items.length === 0) {
    return <p>No items in this category.</p>;
  }

  return (
    <div className={styles.list}>
      {items.map((item) => (
        <div key={item.id} className={styles.listItem}>
          <span className={styles.title}>{item.title}</span>
          <div className={styles.actions}>
            <button
              className={styles.editBtn}
              onClick={() => onEditItem(item)}
            >
              Edit
            </button>
            <button
              className={styles.deleteBtn}
              onClick={() => onDeleteItem(item)}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
