import React, { useState, useEffect } from "react";

const UploadModal = ({
  isOpen,
  onClose,
  onConfirm,
  previewImage,
  initialCategory,
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
    <div
      onClick={onClose}
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
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          padding: "2rem",
          border: "4px solid black",
          width: "400px",
          textAlign: "center",
          boxShadow: "12px 12px 0px black",
        }}
      >
        <h3
          style={{
            marginTop: 0,
            borderBottom: "2px solid black",
            paddingBottom: "10px",
            textAlign: "left",
          }}
        >
          CONFIRM ASSET
        </h3>
        {previewImage && (
          <img
            src={previewImage}
            alt="Preview"
            style={{
              maxWidth: "100%",
              height: "220px",
              objectFit: "contain",
              margin: "20px 0",
              background: "#f0f0f0",
              border: "1px solid black",
            }}
          />
        )}
        <div style={{ margin: "20px 0", textAlign: "left" }}>
          <label
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: "bold",
              marginBottom: "5px",
            }}
          >
            CATEGORY
          </label>
          <select
            value={modalUploadCategory}
            onChange={(e) => setModalUploadCategory(e.target.value)}
            style={{
              width: "100%",
              padding: "10px",
              border: "2px solid black",
              fontWeight: "bold",
            }}
          >
            <option value="TOPS">TOPS</option>
            <option value="BOTTOMS">BOTTOMS</option>
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
        <button
          onClick={onClose}
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            marginTop: "15px",
            cursor: "pointer",
            textDecoration: "underline",
            fontWeight: "bold",
          }}
        >
          CANCEL
        </button>
      </div>
    </div>
  );
};

export default UploadModal;
