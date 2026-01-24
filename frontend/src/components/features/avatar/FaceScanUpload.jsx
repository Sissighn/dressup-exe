import React from "react";

const FaceScanUpload = ({
  faceImage,
  isProcessing,
  onUploadClick,
  onGenerate,
}) => {
  return (
    <div className="upload-section">
      <h3
        style={{
          borderBottom: "1px solid black",
          paddingBottom: "10px",
          marginBottom: "20px",
        }}
      >
        02 / FACE SCAN
      </h3>

      <div
        className="upload-box"
        onClick={onUploadClick}
        style={{
          border: "1px dashed black",
          height: "200px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          background: "#fff",
        }}
      >
        {faceImage ? (
          <img
            src={faceImage}
            alt="Preview"
            style={{ height: "100%", width: "100%", objectFit: "cover" }}
          />
        ) : (
          <p>CLICK TO UPLOAD FACE</p>
        )}
      </div>

      <button
        onClick={onGenerate}
        className="action-button"
        style={{
          width: "100%",
          marginTop: "30px",
          background: isProcessing ? "grey" : "var(--text-main)",
          color: "white",
        }}
        disabled={isProcessing}
      >
        {isProcessing ? "GENERATING TWIN..." : "GENERATE AVATAR"}
      </button>
    </div>
  );
};

export default FaceScanUpload;
