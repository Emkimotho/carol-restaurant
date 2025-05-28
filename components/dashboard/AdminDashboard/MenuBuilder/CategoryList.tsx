// File: components/dashboard/AdminDashboard/MenuBuilder/CategoryList.tsx
"use client";

import React, { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import styles from "./CategoryList.module.css";
import type { MenuCategory } from "@/utils/types";

interface CategoryListProps {
  categories: MenuCategory[];
  selected: string | null;                  // ← newly added
  onSelectCategory: (id: string) => void;
  onReorder: (newOrder: MenuCategory[]) => void;
  onEditCategory: (id: string) => void;
  onDeleteCategory: (id: string) => void;
  onAddCategory?: () => void;
}

interface SortableItemProps {
  id: string;
  name: string;
  selected: boolean;                        // ← newly added
  onSelectCategory: (id: string) => void;
  onEditCategory: (id: string) => void;
  onDeleteCategory: (id: string) => void;
}

const SortableItem: React.FC<SortableItemProps> = ({
  id,
  name,
  selected,
  onSelectCategory,
  onEditCategory,
  onDeleteCategory,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: "grab",
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEditCategory(id);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteCategory(id);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`${styles.categoryItem} ${selected ? styles.selected : ""}`}
      onClick={() => onSelectCategory(id)}
    >
      <span className={styles.itemName}>{name}</span>
      <div className={styles.actions}>
        <button
          className={`${styles.actionButton} ${styles.editButton}`}
          onClick={handleEditClick}
        >
          Edit
        </button>
        <button
          className={`${styles.actionButton} ${styles.deleteButton}`}
          onClick={handleDeleteClick}
        >
          Delete
        </button>
      </div>
    </div>
  );
};

const CategoryList: React.FC<CategoryListProps> = ({
  categories,
  selected,
  onSelectCategory,
  onReorder,
  onEditCategory,
  onDeleteCategory,
  onAddCategory,
}) => {
  const [showList, setShowList] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortedCategories.findIndex(c => c.id === active.id);
    const newIndex = sortedCategories.findIndex(c => c.id === over.id);
    const reordered = arrayMove(sortedCategories, oldIndex, newIndex).map(
      (cat, idx) => ({ ...cat, order: idx + 1 })
    );
    onReorder(reordered);
    setIsDirty(true);
  };

  const handleSaveOrder = async () => {
    try {
      const res = await fetch("/api/menu/category/order", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: sortedCategories.map(c => c.id) }),
      });
      if (!res.ok) throw new Error("Failed to save category order");
      setIsDirty(false);
      alert("Category order saved successfully!");
    } catch (err: any) {
      alert("Error saving category order: " + err.message);
    }
  };

  return (
    <div className={styles.wrapper}>
      {/* Controls Row */}
      <div className={styles.controls}>
        {onAddCategory && (
          <button className={styles.addButton} onClick={onAddCategory}>
            Add Subcategory
          </button>
        )}
        <button
          className={styles.toggleButton}
          onClick={() => setShowList(prev => !prev)}
        >
          {showList ? "Hide Categories" : "Show Categories"}
        </button>
      </div>

      {showList && (
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedCategories.map(cat => cat.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className={styles.categoryList}>
                {sortedCategories.map(cat => (
                  <SortableItem
                    key={cat.id}
                    id={cat.id}
                    name={cat.name}
                    selected={cat.id === selected}
                    onSelectCategory={onSelectCategory}
                    onEditCategory={onEditCategory}
                    onDeleteCategory={onDeleteCategory}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          {isDirty && (
            <button className={styles.saveButton} onClick={handleSaveOrder}>
              Save Order
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default CategoryList;
