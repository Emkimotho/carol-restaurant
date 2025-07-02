// File: components/dashboard/AdminDashboard/MenuBuilder/OptionGroupsSection.tsx
/*
  Renders and manages the list of option groups within the MenuItemEditor form:
  • Displays each OptionGroupEditor for existing groups
  • Provides callbacks to add, update, and remove groups
  • Keeps all logic in the parent hook; this is purely presentational
*/

"use client";

import React from "react";
import OptionGroupEditor from "./OptionGroupEditor";
import styles from "./MenuItemEditor.module.css";
import type { MenuItemOptionGroup } from "@/utils/types";

interface OptionGroupsSectionProps {
  optionGroups: MenuItemOptionGroup[];
  addOptionGroup: () => void;
  updateOptionGroup: (idx: number, group: MenuItemOptionGroup) => void;
  removeOptionGroup: (idx: number) => void;
}

export default function OptionGroupsSection({
  optionGroups,
  addOptionGroup,
  updateOptionGroup,
  removeOptionGroup,
}: OptionGroupsSectionProps) {
  return (
    <div className={styles.optionGroups}>
      <h3>Option Groups</h3>
      {optionGroups.map((group, idx) => (
        <OptionGroupEditor
          key={group.id}
          group={group}
          onChange={(updated) => updateOptionGroup(idx, updated)}
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
  );
}
