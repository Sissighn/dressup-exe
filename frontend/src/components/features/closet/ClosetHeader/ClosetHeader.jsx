import React from "react";
import styles from "./ClosetHeader.module.css";

const ClosetHeader = ({
  uploadCategory,
  onUploadCategoryChange,
  filterCategory,
  onFilterCategoryChange,
  onAddNewClick,
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
          <option value="SHOES">SHOES</option>
          <option value="BAGS">BAGS</option>
        </select>

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
