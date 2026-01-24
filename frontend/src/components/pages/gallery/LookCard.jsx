import React from "react";

const LookCard = ({ look, onDelete }) => {
  return (
    <div className="neo-album-card">
      <button className="delete-btn-top" onClick={() => onDelete(look.id)}>
        ✕
      </button>

      <div className="neo-img-frame">
        <img src={look.url} alt="Look" />
      </div>

      <div className="neo-card-footer-mustard">
        <span className="asset-id-text">
          ID_{look.id.split("_").pop().substring(0, 6)}
        </span>
        <button
          className="expand-link-btn"
          onClick={() => window.open(look.url, "_blank")}
        >
          VIEW
        </button>
      </div>
    </div>
  );
};

export default LookCard;
