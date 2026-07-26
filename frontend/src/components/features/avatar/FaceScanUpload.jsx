import React from "react";

const FaceScanUpload = ({
  faceImage,
  isProcessing,
  onUploadClick,
  onGenerate,
  showUploadError,
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
          border: showUploadError ? "2px dashed #d90429" : "1px dashed black",
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

      <div className="face-scan-guidance">
        <strong>PRIVATE FACE SCAN</strong>
        <p>
          Used only to create your digital twin and stored behind your signed-in
          session. Use a clear front-facing photo with your full face visible,
          natural light, no heavy blur, and no group photo.
        </p>
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
