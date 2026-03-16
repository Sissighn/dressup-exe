import React from "react";

const LookCard = ({ look, onDelete, itemLabel = "Look" }) => {
  return (
    <div className="neo-album-card">
      <button
        className="delete-btn-top"
        onClick={() => onDelete(look.id)}
        aria-label={`Delete ${itemLabel}`}
      >
        ✕
      </button>

      <div
        className="neo-img-frame neo-img-clickable"
        onClick={() => window.open(look.url, "_blank")}
      >
        <img src={look.url} alt={itemLabel} />
        <div className="neo-img-overlay">
          <span className="neo-expand-icon">↗</span>
        </div>
      </div>
    </div>
  );
};

export default LookCard;
