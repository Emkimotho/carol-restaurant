"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import MenuItemEditor from "@/components/dashboard/AdminDashboard/MenuBuilder/MenuItemEditor";
import type { MenuItem, MenuCategory } from "@/utils/types";

const EditMenuItemPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const itemId = params.itemId as string;

  const [menuItem, setMenuItem] = useState<MenuItem | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const fetchMenuItem = async () => {
      try {
        const res = await fetch(`/api/menu/item/${itemId}`);
        if (!res.ok) {
          setError("Failed to load menu item");
          return;
        }
        const data = await res.json();
        setMenuItem(data.menuItem);
      } catch (err) {
        console.error("Error fetching menu item:", err);
        setError("Error fetching menu item");
      }
    };

    if (itemId) {
      fetchMenuItem();
    }
  }, [itemId]);

  if (error) {
    return <div>{error}</div>;
  }

  if (!menuItem) {
    return <div>Loading menu item...</div>;
  }

  const handleSaved = () => {
    router.push("/admin-dashboard/menu-builder");
  };

  const handlePreview = (item: MenuItem) => {
    console.log("Preview item:", item);
  };

  return (
    <div>
      <h1>Edit Menu Item</h1>
      <MenuItemEditor
        categoryId={menuItem.category.id} // using category.id instead of menuItem.categoryId
        editingItem={menuItem}
        onSaved={handleSaved}
        onPreview={handlePreview}
        // Pass categories; here we pass the current category as an array.
        categories={[menuItem.category] as MenuCategory[]}
      />
    </div>
  );
};

export default EditMenuItemPage;
