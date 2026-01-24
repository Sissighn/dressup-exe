import React from "react";

const GalleryHeader = ({ assetCount }) => {
  return (
    <div className="gallery-header-clean">
      <h1 className="hero-text" style={{ fontSize: "2rem", margin: 0 }}>
        THE LOOKBOOK.
      </h1>
      <div className="status-pill">ASSETS: {assetCount}</div>
    </div>
  );
};

export default GalleryHeader;
