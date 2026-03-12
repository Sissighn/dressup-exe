import React from "react";

const LookCard = ({ look, onDelete }) => {
  return (
    <div className="neo-album-card">
      <button className="delete-btn-top" onClick={() => onDelete(look.id)}>
        ✕
      </button>

      <div
        className="neo-img-frame neo-img-clickable"
        onClick={() => window.open(look.url, "_blank")}
      >
        <img src={look.url} alt="Look" />
        <div className="neo-img-overlay">
          <span className="neo-expand-icon">↗</span>
        </div>
      </div>
    </div>
  );
};

export default LookCard;
