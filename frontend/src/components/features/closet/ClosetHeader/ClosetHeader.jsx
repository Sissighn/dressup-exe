import React from "react";
import styles from "./ClosetHeader.module.css";

const ClosetHeader = ({
  filterCategory,
  onFilterCategoryChange,
  onAddNewClick,
  isSelectionMode,
  selectedCount,
  onToggleSelectionMode,
  onDeleteSelected,
  onCancelSelection,
}) => {
  return (
    <div className={styles.header}>
      <div>
        <h1 className={`hero-text ${styles.title}`}>DIGITAL ARCHIVE.</h1>
        <p className={styles.subtitle}>ASSET MANAGEMENT INTERFACE</p>
      </div>

      <div className={styles.controls}>
        <select
          value={filterCategory}
          onChange={onFilterCategoryChange}
          className={styles.select}
        >
          <option value="ALL">ALL CATEGORIES</option>
          <option value="TOPS">TOPS</option>
          <option value="BOTTOMS">BOTTOMS</option>
          <option value="DRESSES">DRESSES</option>
          <option value="SHOES">SHOES</option>
          <option value="BAGS">BAGS</option>
        </select>

        {!isSelectionMode && (
          <button
            type="button"
            className={styles.iconButton}
            onClick={onToggleSelectionMode}
          >
            <svg
              className={styles.trashIcon}
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="none"
            >
              <path
                d="M3 6h18M8 6V4h8v2m-9 0 1 13a1 1 0 0 0 1 .92h6a1 1 0 0 0 1-.92L17 6M10 10v7M14 10v7"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            DELETE ITEMS
          </button>
        )}

        {isSelectionMode && (
          <>
            <button
              type="button"
              className={`${styles.iconButton} ${styles.deleteButton}`}
              onClick={onDeleteSelected}
            >
              DELETE SELECTED ({selectedCount})
            </button>
            <button
              type="button"
              className={styles.iconButton}
              onClick={onCancelSelection}
            >
              CANCEL
            </button>
          </>
        )}

        <button
          className={`action-button ${styles.compactButton}`}
          onClick={onAddNewClick}
        >
          + ADD NEW
        </button>
      </div>
    </div>
  );
};

export default ClosetHeader;
