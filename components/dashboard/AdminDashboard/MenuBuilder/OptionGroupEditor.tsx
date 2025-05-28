// File: components/dashboard/AdminDashboard/MenuBuilder/OptionGroupEditor.tsx
"use client";

import React, { useState } from "react";
import styles from "./OptionGroupEditor.module.css";

/**
 * If you need nested customizations (like "Add Nested Group" etc.),
 * define these extra types.
 */
export interface NestedOptionChoice {
  id: string;
  label: string;
  priceAdjustment?: number;
}

export interface NestedOptionGroup {
  id: string;
  title: string;
  minRequired: number;
  maxAllowed?: number;
  choices: NestedOptionChoice[];
}

export interface OptionChoice {
  id: string;
  label: string;
  priceAdjustment?: number;
  nestedOptionGroup?: NestedOptionGroup; // for deeper nesting
}

export interface OptionGroup {
  id: string;
  title: string;
  minRequired: number;
  maxAllowed?: number;
  optionType: "single-select" | "multi-select" | "dropdown";
  choices: OptionChoice[];
}

interface OptionGroupEditorProps {
  group: OptionGroup;
  onChange: (group: OptionGroup) => void;
  onRemove: () => void;
}

/**
 * A helper that ensures numeric fields (like priceAdjustment, minRequired) don't become NaN.
 */
const parseSafeNumber = (value: string, defaultVal = 0) => {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultVal : parsed;
};

const OptionGroupEditor: React.FC<OptionGroupEditorProps> = ({
  group,
  onChange,
  onRemove,
}) => {
  const [localGroup, setLocalGroup] = useState<OptionGroup>(group);

  /**
   * Update the localGroup in state and call onChange so the parent knows about the update.
   */
  const handleGroupChange = (field: keyof OptionGroup, value: any) => {
    const updated = { ...localGroup, [field]: value };
    setLocalGroup(updated);
    onChange(updated);
  };

  /**
   * Add a new blank choice to this group.
   */
  const addChoice = () => {
    const newChoice: OptionChoice = {
      id: Date.now().toString(),
      label: "",
      priceAdjustment: 0,
    };
    handleGroupChange("choices", [...localGroup.choices, newChoice]);
  };

  /**
   * Update a specific choice by index.
   */
  const updateChoice = (index: number, changes: Partial<OptionChoice>) => {
    const updatedChoices = localGroup.choices.map((choice, i) =>
      i === index ? { ...choice, ...changes } : choice
    );
    handleGroupChange("choices", updatedChoices);
  };

  /**
   * Remove a specific choice by index.
   */
  const removeChoice = (index: number) => {
    const updatedChoices = localGroup.choices.filter((_, i) => i !== index);
    handleGroupChange("choices", updatedChoices);
  };

  /**
   * Add a nested option group to a choice for deeper customization.
   */
  const addNestedOptionGroup = (choiceIndex: number) => {
    const nestedGroup: NestedOptionGroup = {
      id: Date.now().toString(),
      title: "",
      minRequired: 1,
      maxAllowed: 1,
      choices: [],
    };
    updateChoice(choiceIndex, { nestedOptionGroup: nestedGroup });
  };

  /**
   * Update a nested option group on a choice.
   */
  const updateNestedOptionGroup = (
    choiceIndex: number,
    changes: Partial<NestedOptionGroup>
  ) => {
    const existing = localGroup.choices[choiceIndex].nestedOptionGroup;
    if (!existing) return;
    const updatedGroup: NestedOptionGroup = { ...existing, ...changes };
    updateChoice(choiceIndex, { nestedOptionGroup: updatedGroup });
  };

  /**
   * Remove a nested option group from a choice.
   */
  const removeNestedOptionGroup = (choiceIndex: number) => {
    updateChoice(choiceIndex, { nestedOptionGroup: undefined });
  };

  return (
    <div className={styles.groupEditor}>
      {/* Group Header: Title input + Remove button */}
      <div className={styles.groupHeader}>
        <input
          type="text"
          value={localGroup.title}
          onChange={(e) => handleGroupChange("title", e.target.value)}
          placeholder="Option Group Title (e.g., 'Choose Protein')"
          required
        />
        <button
          type="button"
          onClick={onRemove}
          className={styles.removeButton}
        >
          Remove Group
        </button>
      </div>

      {/* Group Settings: minRequired, maxAllowed, optionType */}
      <div className={styles.groupSettings}>
        <label>
          Min:
          <input
            type="number"
            value={localGroup.minRequired}
            onChange={(e) =>
              handleGroupChange(
                "minRequired",
                parseSafeNumber(e.target.value, 0)
              )
            }
            required
          />
        </label>
        <label>
          Max:
          <input
            type="number"
            value={localGroup.maxAllowed ?? ""}
            onChange={(e) => {
              const val = e.target.value
                ? parseSafeNumber(e.target.value, 0)
                : undefined;
              handleGroupChange("maxAllowed", val);
            }}
          />
        </label>
        <label>
          Type:
          <select
            value={localGroup.optionType}
            onChange={(e) => handleGroupChange("optionType", e.target.value)}
          >
            <option value="single-select">Single Select</option>
            <option value="multi-select">Multi Select</option>
            <option value="dropdown">Dropdown</option>
          </select>
        </label>
      </div>

      {/* Choices */}
      <div className={styles.choices}>
        <h4>Choices</h4>
        {localGroup.choices.map((choice, index) => (
          <div key={choice.id} className={styles.choiceRow}>
            {/* label */}
            <input
              type="text"
              value={choice.label}
              onChange={(e) => updateChoice(index, { label: e.target.value })}
              placeholder="Choice label (e.g., 'Beef')"
              required
            />
            {/* priceAdjustment */}
            <input
              type="number"
              value={choice.priceAdjustment ?? 0}
              onChange={(e) =>
                updateChoice(index, {
                  priceAdjustment: parseSafeNumber(e.target.value, 0),
                })
              }
              placeholder="Price Adjustment"
            />

            {/* Nested Option Group if present */}
            {choice.nestedOptionGroup ? (
              <div className={styles.nestedOptionGroup}>
                <h5>Nested Option Group</h5>
                <input
                  type="text"
                  value={choice.nestedOptionGroup.title}
                  onChange={(e) =>
                    updateNestedOptionGroup(index, {
                      title: e.target.value,
                    })
                  }
                  placeholder="Nested Group Title (e.g., 'Choose Sauce')"
                  required
                />
                <label>
                  Min:
                  <input
                    type="number"
                    value={choice.nestedOptionGroup.minRequired}
                    onChange={(e) =>
                      updateNestedOptionGroup(index, {
                        minRequired: parseSafeNumber(e.target.value, 0),
                      })
                    }
                  />
                </label>
                <label>
                  Max:
                  <input
                    type="number"
                    value={choice.nestedOptionGroup.maxAllowed ?? ""}
                    onChange={(e) =>
                      updateNestedOptionGroup(index, {
                        maxAllowed: e.target.value
                          ? parseSafeNumber(e.target.value, 0)
                          : undefined,
                      })
                    }
                  />
                </label>

                {/* Nested Choices */}
                <div className={styles.nestedChoices}>
                  <h6>Nested Choices</h6>
                  {choice.nestedOptionGroup.choices.map((nChoice, nIdx) => (
                    <div key={nChoice.id} className={styles.nestedChoiceRow}>
                      <input
                        type="text"
                        value={nChoice.label}
                        placeholder="Nested label (e.g. 'Fried')"
                        onChange={(e) => {
                          const updated = {
                            choices: choice.nestedOptionGroup!.choices.map(
                              (nc, i) =>
                                i === nIdx
                                  ? { ...nc, label: e.target.value }
                                  : nc
                            ),
                          };
                          updateNestedOptionGroup(index, updated);
                        }}
                      />
                      <input
                        type="number"
                        value={nChoice.priceAdjustment ?? 0}
                        onChange={(e) => {
                          const updated = {
                            choices: choice.nestedOptionGroup!.choices.map(
                              (nc, i) =>
                                i === nIdx
                                  ? {
                                      ...nc,
                                      priceAdjustment: parseSafeNumber(
                                        e.target.value,
                                        0
                                      ),
                                    }
                                  : nc
                            ),
                          };
                          updateNestedOptionGroup(index, updated);
                        }}
                        placeholder="Nested Price (+$)"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const filtered = choice.nestedOptionGroup!.choices.filter(
                            (_, i) => i !== nIdx
                          );
                          updateNestedOptionGroup(index, {
                            choices: filtered,
                          });
                        }}
                        className={styles.removeChoice}
                      >
                        Remove Nested
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const updated = {
                        choices: [
                          ...choice.nestedOptionGroup!.choices,
                          {
                            id: Date.now().toString(),
                            label: "",
                            priceAdjustment: 0,
                          },
                        ],
                      };
                      updateNestedOptionGroup(index, updated);
                    }}
                    className={styles.addChoice}
                  >
                    Add Nested Choice
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeNestedOptionGroup(index)}
                  className={styles.removeButton}
                >
                  Remove Nested Group
                </button>
              </div>
            ) : (
              // If no nested group, allow the user to add one
              <button
                type="button"
                onClick={() => addNestedOptionGroup(index)}
                className={styles.addNestedButton}
              >
                Add Nested Option Group
              </button>
            )}
            {/* Remove this Choice altogether */}
            <button
              type="button"
              onClick={() => removeChoice(index)}
              className={styles.removeChoice}
            >
              Remove Choice
            </button>
          </div>
        ))}
        {/* Add a new top-level choice */}
        <button type="button" onClick={addChoice} className={styles.addChoice}>
          Add Choice
        </button>
      </div>
    </div>
  );
};

export default OptionGroupEditor;
