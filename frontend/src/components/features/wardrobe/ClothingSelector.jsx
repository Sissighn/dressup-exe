import React from "react";

const ClothingSelector = ({
  label,
  currentItem,
  selectedItem,
  onPrev,
  onNext,
  onSelect,
  emptyMessage,
  onEmptyAction,
}) => {
  const hasItems = Boolean(currentItem);

  return (
    <div className="clothing-section">
      <span className="section-label">{label}</span>
      <button onClick={onPrev} className="nav-arrow left" disabled={!hasItems}>
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
        <div className="clothing-empty-state">
          <p>NO {label.toUpperCase()} IN CLOSET</p>
          <button type="button" onClick={onEmptyAction}>
            {emptyMessage || `ADD ${label}`}
          </button>
        </div>
      )}
      <button onClick={onNext} className="nav-arrow right" disabled={!hasItems}>
        &gt;
      </button>
    </div>
  );
};

export default ClothingSelector;
