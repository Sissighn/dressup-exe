import React from "react";

const DeleteItemModal = ({ onConfirm, onCancel }) => {
  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          padding: "2.5rem",
          border: "4px solid black",
          boxShadow: "12px 12px 0px #ff4d4d",
          textAlign: "center",
          maxWidth: "400px",
        }}
      >
        <h2 style={{ marginTop: 0 }}>CONFIRM REMOVAL</h2>
        <p style={{ margin: "20px 0", fontWeight: "bold" }}>
          Are you sure you want to delete this item?
        </p>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              background: "black",
              color: "white",
              padding: "12px",
              border: "none",
              fontWeight: "900",
              cursor: "pointer",
            }}
          >
            Yes, delete
          </button>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              background: "white",
              color: "black",
              padding: "12px",
              border: "2px solid black",
              fontWeight: "900",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteItemModal;
