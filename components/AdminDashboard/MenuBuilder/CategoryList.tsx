"use client";

import React from "react";
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
  onSelectCategory: (id: string) => void;
  onReorder: (newOrder: MenuCategory[]) => void;
}

interface SortableItemProps {
  id: string;
  name: string;
  onSelectCategory: (id: string) => void;
}

const SortableItem: React.FC<SortableItemProps> = ({
  id,
  name,
  onSelectCategory,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: "grab",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={styles.categoryItem}
      onClick={() => onSelectCategory(id)}
    >
      {name}
    </div>
  );
};

const CategoryList: React.FC<CategoryListProps> = ({
  categories,
  onSelectCategory,
  onReorder,
}) => {
  // Sort by the order property
  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

  // DND-Kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    if (active.id !== over.id) {
      const oldIndex = sortedCategories.findIndex((c) => c.id === active.id);
      const newIndex = sortedCategories.findIndex((c) => c.id === over.id);

      const reordered = arrayMove(sortedCategories, oldIndex, newIndex).map(
        (cat, idx) => ({ ...cat, order: idx + 1 })
      );
      onReorder(reordered);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={sortedCategories.map((cat) => cat.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className={styles.categoryList}>
          {sortedCategories.map((cat) => (
            <SortableItem
              key={cat.id}
              id={cat.id}
              name={cat.name}
              onSelectCategory={onSelectCategory}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default CategoryList;
