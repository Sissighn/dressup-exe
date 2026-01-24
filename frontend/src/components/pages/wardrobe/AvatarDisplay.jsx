import React from "react";

const AvatarDisplay = ({
  isGenerating,
  displayImage,
  selectedTop,
  selectedBottom,
}) => {
  return (
    <div className="center-panel">
      {isGenerating ? (
        <div className="brutalist-loader-box">
          <div className="brutalist-loader-text">
            PROCESSING<span className="blink-block"></span>
          </div>
          <div className="loader-status-line">
            {" >"} TOP_ID: {selectedTop?.id}
          </div>
          <div className="loader-status-line">
            {" >"} BTM_ID: {selectedBottom?.id}
          </div>
          <div className="loader-status-line">{" >"} STITCHING...</div>
        </div>
      ) : displayImage ? (
        <img
          src={displayImage}
          alt="Digital Twin"
          className="avatar-image-display"
          style={{
            height: "95%",
            width: "auto",
            objectFit: "contain",
            filter: "drop-shadow(0px 10px 20px rgba(0,0,0,0.3))",
          }}
        />
      ) : (
        <div style={{ opacity: 0.3, textAlign: "center" }}>
          <h2>NO MODEL FOUND</h2>
        </div>
      )}
    </div>
  );
};

export default AvatarDisplay;
