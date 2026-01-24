import React from "react";
import styles from "./DeleteItemModal.module.css";

const DeleteItemModal = ({ onConfirm, onCancel }) => {
  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginTop: 0 }}>CONFIRM REMOVAL</h2>

        <p style={{ margin: "20px 0", fontWeight: "bold" }}>
          Are you sure you want to delete this item?
        </p>

        <div className={styles.actions}>
          <button onClick={onConfirm} className={styles.confirm}>
            Yes, delete
          </button>
          <button onClick={onCancel} className={styles.cancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteItemModal;
