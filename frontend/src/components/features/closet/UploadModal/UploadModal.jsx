import React, { useState, useEffect } from "react";
import styles from "./UploadModal.module.css";

const UploadModal = ({
  isOpen,
  onClose,
  onConfirm,
  previewImage,
  initialCategory,
  currentFileName,
  currentStep,
  totalSteps,
}) => {
  const [modalUploadCategory, setModalUploadCategory] =
    useState(initialCategory);

  useEffect(() => {
    if (isOpen) {
      setModalUploadCategory(initialCategory);
    }
  }, [isOpen, initialCategory]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(modalUploadCategory);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>CONFIRM ASSET</h3>

        <p className={styles.progress}>
          ITEM {currentStep} / {totalSteps}
        </p>
        {currentFileName && (
          <p className={styles.fileName}>{currentFileName}</p>
        )}

        {previewImage && (
          <img src={previewImage} alt="Preview" className={styles.preview} />
        )}

        <div className={styles.field}>
          <label className={styles.label}>CATEGORY</label>
          <select
            value={modalUploadCategory}
            onChange={(e) => setModalUploadCategory(e.target.value)}
            className={styles.select}
          >
            <option value="TOPS">TOPS</option>
            <option value="BOTTOMS">BOTTOMS</option>
            <option value="DRESSES">DRESSES</option>
            <option value="SHOES">SHOES</option>
            <option value="BAGS">BAGS</option>
          </select>
        </div>

        <button
          className="action-button"
          style={{
            width: "100%",
            background: "black",
            color: "white",
            padding: "15px",
          }}
          onClick={handleConfirm}
        >
          UPLOAD TO CLOSET
        </button>

        <button onClick={onClose} className={styles.cancel}>
          CANCEL
        </button>
      </div>
    </div>
  );
};

export default UploadModal;
