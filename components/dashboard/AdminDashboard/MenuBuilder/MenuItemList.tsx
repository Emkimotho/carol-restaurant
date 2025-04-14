"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-toastify";
import styles from "./MenuItemList.module.css";
import type { MenuItem } from "@/utils/types";

interface MenuItemsResponse {
  menuItems: MenuItem[];
}

async function fetchMenuItems(): Promise<MenuItemsResponse> {
  const res = await fetch("/api/menu/item");
  if (!res.ok) {
    throw new Error("Error fetching menu items");
  }
  return res.json();
}

interface MenuItemListProps {
  onEditItem: (item: MenuItem) => void;
  onDeleteItem: (item: MenuItem) => void;
}

const MenuItemList: React.FC<MenuItemListProps> = ({
  onEditItem,
  onDeleteItem,
}) => {
  const { data, isLoading, isError, error } = useQuery<MenuItemsResponse>({
    queryKey: ["menuItems"],
    queryFn: fetchMenuItems,
    staleTime: 10_000,
  });

  if (isLoading) return <p>Loading menu items...</p>;

  if (isError) {
    const errMsg = (error as Error)?.message || "Error loading menu items";
    toast.error(errMsg);
    return <p>{errMsg}</p>;
  }

  const items = data?.menuItems || [];
  if (items.length === 0) {
    return <p>No saved menu items.</p>;
  }

  return (
    <div className={styles.menuItemList}>
      <h3>Existing Menu Items</h3>
      {items.map((item) => (
        <div key={item.id} className={styles.menuItem}>
          <span className={styles.itemTitle}>{item.title}</span>
          <div className={styles.actions}>
            <button
              onClick={() => onEditItem(item)}
              className={styles.editButton}
            >
              Edit
            </button>
            <button
              onClick={() => onDeleteItem(item)}
              className={styles.deleteButton}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MenuItemList;
