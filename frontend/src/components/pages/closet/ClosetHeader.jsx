import React from "react";

const ClosetHeader = ({
  uploadName,
  onUploadNameChange,
  uploadCategory,
  onUploadCategoryChange,
  onAddNewClick,
}) => {
  return (
    <div
      style={{
        padding: "2rem",
        borderBottom: "1px solid var(--border-color)",
        background: "var(--accent-yellow)",
        display: "flex",
        gap: "2rem",
        alignItems: "center",
      }}
    >
      <div>
        <h1
          className="hero-text"
          style={{ fontSize: "2rem", marginBottom: "0" }}
        >
          DIGITAL ARCHIVE.
        </h1>
        <p style={{ fontSize: "0.8rem", opacity: 0.7 }}>
          ASSET MANAGEMENT INTERFACE
        </p>
      </div>
      <div
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "center",
          background: "white",
          padding: "10px",
          border: "1px solid black",
        }}
      >
        <input
          type="text"
          placeholder="ITEM NAME"
          value={uploadName}
          onChange={onUploadNameChange}
          style={{
            border: "none",
            borderBottom: "1px solid #ccc",
            padding: "5px",
          }}
        />
        <select
          value={uploadCategory}
          onChange={onUploadCategoryChange}
          style={{ border: "none", padding: "5px", fontWeight: "bold" }}
        >
          <option value="TOPS">TOPS</option>
          <option value="BOTTOMS">BOTTOMS</option>
          <option value="SHOES">SHOES</option>
          <option value="BAGS">BAGS</option>
        </select>
        <button
          className="action-button"
          style={{ marginTop: 0, padding: "5px 15px", fontSize: "0.8rem" }}
          onClick={onAddNewClick}
        >
          + ADD NEW
        </button>
      </div>
    </div>
  );
};

export default ClosetHeader;
