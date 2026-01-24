import React from "react";

const WardrobeActions = ({
  isGenerating,
  dressedAvatar,
  selectedTop,
  selectedBottom,
  onTryOn,
  onDownload,
  onArchive,
  onReset,
  onRescan,
}) => {
  return (
    <div
      className="left-panel"
      style={{ maxHeight: "100vh", overflowY: "auto", paddingBottom: "20px" }}
    >
      <h1 className="hero-text" style={{ fontSize: "2.8rem" }}>
        Where style <br /> becomes <br /> <i>identity.</i>
      </h1>
      <p className="sub-text">
        Digital Twin Active. <br /> Curate your digital appearance.
      </p>

      <div
        style={{
          marginTop: "30px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <button
          className="action-button"
          onClick={onTryOn}
          disabled={!selectedTop || !selectedBottom || isGenerating}
          style={{
            background:
              !selectedTop || !selectedBottom || isGenerating
                ? "#ccc"
                : "black",
            color: "white",
            padding: "10px",
            fontSize: "12px",
            cursor: isGenerating ? "not-allowed" : "pointer",
          }}
        >
          {isGenerating ? "AI GENERATING..." : "TRY THE COMBI ON"}
        </button>

        {dressedAvatar && (
          <>
            <button
              className="action-button"
              onClick={onDownload}
              style={{
                background: "var(--accent-yellow)",
                color: "black",
                border: "2px solid black",
                fontWeight: "bold",
                padding: "10px",
                fontSize: "12px",
              }}
            >
              💾 SAVE LOOK (.PNG)
            </button>

            <button
              className="action-button"
              onClick={onArchive}
              style={{
                background: "white",
                color: "black",
                border: "2px solid black",
                fontWeight: "bold",
                padding: "10px",
                fontSize: "12px",
                boxShadow: "4px 4px 0px black",
              }}
            >
              🗄️ ARCHIVE LOOK
            </button>

            <button
              className="action-button"
              onClick={onReset}
              style={{
                background: "transparent",
                color: "black",
                border: "1px solid black",
                padding: "10px",
                fontSize: "12px",
              }}
            >
              RESET TO ORIGINAL
            </button>
          </>
        )}

        <button
          className="action-button"
          onClick={onRescan}
          style={{
            marginTop: "5px",
            fontSize: "11px",
            background: "transparent",
            border: "1px solid black",
            padding: "8px",
          }}
        >
          RE-SCAN MODEL
        </button>
      </div>
    </div>
  );
};

export default WardrobeActions;
