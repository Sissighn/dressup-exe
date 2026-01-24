import React from "react";
import styles from "./CategoryRow.module.css";

const CategoryRow = ({ category, items, onDeleteClick }) => {
  const categoryIndex =
    ["TOPS", "BOTTOMS", "SHOES", "BAGS"].indexOf(category) + 1;

  return (
    <div className={styles.container}>
      <h3 className={styles.categoryHeader}>
        0{categoryIndex} / {category}
      </h3>
      <div className={styles.itemsContainer}>
        {items.map((item) => (
          <div key={item.id} className={styles.itemCard}>
            <button
              onClick={() => onDeleteClick(item.id)}
              className={styles.deleteButton}
            >
              X
            </button>
            <img
              src={item.image_path}
              alt={item.name}
              className={styles.itemImage}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryRow;
