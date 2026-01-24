import React from "react";
import LookCard from "./LookCard";

const GalleryGrid = ({ loading, looks, onDelete }) => {
  return (
    <div className="gallery-grid-compact">
      {loading ? (
        <div className="brutalist-loader-box">INITIALIZING...</div>
      ) : looks.length > 0 ? (
        looks.map((look) => (
          <LookCard key={look.id} look={look} onDelete={onDelete} />
        ))
      ) : (
        <div className="empty-state">
          <h2>ARCHIVE_EMPTY</h2>
        </div>
      )}
    </div>
  );
};

export default GalleryGrid;
