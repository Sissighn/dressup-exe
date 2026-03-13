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
        <div className="clothing-selector-card">
          <img
            src={currentItem.image_path}
            alt={currentItem.name}
            className="clothing-preview-image"
          />
          <button
            onClick={() => onSelect(currentItem)}
            className="clothing-select-button"
            style={{
              background:
                selectedItem?.id === currentItem.id ? "black" : "white",
              color: selectedItem?.id === currentItem.id ? "white" : "black",
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
