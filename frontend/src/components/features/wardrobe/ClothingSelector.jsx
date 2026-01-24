import React from "react";

const ClothingSelector = ({
  label,
  items,
  currentItem,
  selectedItem,
  onPrev,
  onNext,
  onSelect,
}) => {
  return (
    <div className="clothing-section">
      <span className="section-label">{label}</span>
      <button onClick={onPrev} className="nav-arrow left">
        &lt;
      </button>
      {currentItem ? (
        <div style={{ textAlign: "center" }}>
          <img
            src={currentItem.image_path}
            alt={currentItem.name}
            style={{ height: "120px", objectFit: "contain" }}
          />
          <p
            style={{
              fontSize: "10px",
              fontWeight: "bold",
              marginTop: "5px",
            }}
          >
            {currentItem.name}
          </p>
          <button
            onClick={() => onSelect(currentItem)}
            style={{
              fontSize: "10px",
              marginTop: "5px",
              padding: "5px 12px",
              cursor: "pointer",
              background:
                selectedItem?.id === currentItem.id ? "black" : "white",
              color: selectedItem?.id === currentItem.id ? "white" : "black",
              border: "1px solid black",
            }}
          >
            {selectedItem?.id === currentItem.id ? "SELECTED" : "SELECT"}
          </button>
        </div>
      ) : (
        <p style={{ opacity: 0.4, fontSize: "10px" }}>
          NO {label.toUpperCase()} IN CLOSET
        </p>
      )}
      <button onClick={onNext} className="nav-arrow right">
        &gt;
      </button>
    </div>
  );
};

export default ClothingSelector;
