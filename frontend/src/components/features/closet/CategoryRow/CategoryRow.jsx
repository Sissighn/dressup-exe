import React from "react";
import styles from "./CategoryRow.module.css";

const CategoryRow = ({
  category,
  items,
  isSelectionMode,
  selectedItemIds,
  onToggleSelect,
}) => {
  const categoryIndex =
    ["TOPS", "BOTTOMS", "DRESSES", "SHOES", "BAGS"].indexOf(category) + 1;

  return (
    <div className={styles.container}>
      <h3 className={styles.categoryHeader}>
        0{categoryIndex} / {category}
      </h3>
      <div className={styles.itemsContainer}>
        {items.map((item) => {
          const isSelected = selectedItemIds.includes(item.id);

          return (
            <button
              key={item.id}
              type="button"
              className={`${styles.itemCard} ${
                isSelectionMode ? styles.selectionMode : ""
              } ${isSelected ? styles.selected : ""}`}
              onClick={() => onToggleSelect(item.id)}
              aria-pressed={isSelected}
              disabled={!isSelectionMode}
            >
              {isSelectionMode && (
                <span className={styles.selectionBadge}>
                  {isSelected ? "SELECTED" : "SELECT"}
                </span>
              )}
              <img
                src={item.image_path}
                alt={item.name}
                className={styles.itemImage}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryRow;
