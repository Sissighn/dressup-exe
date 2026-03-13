import React from "react";

const ActionLabel = ({ icon, children }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
    }}
  >
    <span
      aria-hidden="true"
      style={{ display: "inline-flex", alignItems: "center", lineHeight: 0 }}
    >
      {icon}
    </span>
    <span>{children}</span>
  </span>
);

const iconProps = {
  width: 14,
  height: 14,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

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
  const baseButtonStyle = {
    width: "100%",
    minHeight: "44px",
    padding: "10px 12px",
    fontSize: "12px",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  };

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
          className="action-button wardrobe-action-button"
          onClick={onTryOn}
          disabled={!selectedTop || !selectedBottom || isGenerating}
          style={{
            ...baseButtonStyle,
            background:
              !selectedTop || !selectedBottom || isGenerating
                ? "#ccc"
                : "black",
            color: "white",
            cursor: isGenerating ? "not-allowed" : "pointer",
          }}
        >
          {isGenerating ? (
            <ActionLabel
              icon={
                <svg {...iconProps}>
                  <path d="M12 2v4" />
                  <path d="M12 18v4" />
                  <path d="m4.93 4.93 2.83 2.83" />
                  <path d="m16.24 16.24 2.83 2.83" />
                  <path d="M2 12h4" />
                  <path d="M18 12h4" />
                  <path d="m4.93 19.07 2.83-2.83" />
                  <path d="m16.24 7.76 2.83-2.83" />
                </svg>
              }
            >
              AI GENERATING...
            </ActionLabel>
          ) : (
            <ActionLabel
              icon={
                <svg {...iconProps}>
                  <path d="M9 3h6l1 3 3 2-2 4-2-1v10h-6V11l-2 1-2-4 3-2 1-3Z" />
                  <path d="M10 7h4" />
                </svg>
              }
            >
              TRY THE COMBI ON
            </ActionLabel>
          )}
        </button>

        {dressedAvatar && (
          <>
            <button
              className="action-button wardrobe-action-button"
              onClick={onArchive}
              style={{
                ...baseButtonStyle,
                background: "white",
                color: "black",
                border: "2px solid black",
                fontWeight: "bold",
              }}
            >
              <ActionLabel
                icon={
                  <svg {...iconProps}>
                    <rect x="3" y="4" width="18" height="4" rx="1" />
                    <path d="M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" />
                    <path d="M10 12h4" />
                  </svg>
                }
              >
                ARCHIVE LOOK
              </ActionLabel>
            </button>

            <button
              className="action-button wardrobe-action-button"
              onClick={onDownload}
              style={{
                ...baseButtonStyle,
                background: "var(--accent-yellow)",
                color: "black",
                border: "2px solid black",
                fontWeight: "bold",
              }}
            >
              <ActionLabel
                icon={
                  <svg {...iconProps}>
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
                    <path d="M17 21v-8H7v8" />
                    <path d="M7 3v5h8" />
                  </svg>
                }
              >
                SAVE LOOK (.PNG)
              </ActionLabel>
            </button>

            <button
              className="action-button wardrobe-action-button"
              onClick={onReset}
              style={{
                ...baseButtonStyle,
                background: "transparent",
                color: "black",
                border: "1px solid black",
              }}
            >
              <ActionLabel
                icon={
                  <svg {...iconProps}>
                    <path d="M3 12a9 9 0 1 0 3-6.7" />
                    <path d="M3 3v6h6" />
                  </svg>
                }
              >
                RESET TO ORIGINAL
              </ActionLabel>
            </button>
          </>
        )}

        <button
          className="action-button wardrobe-action-button"
          onClick={onRescan}
          style={{
            ...baseButtonStyle,
            marginTop: "5px",
            background: "transparent",
            border: "1px solid black",
            fontSize: "11px",
          }}
        >
          <ActionLabel
            icon={
              <svg {...iconProps}>
                <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                <path d="M8 12h8" />
                <path d="M12 8v8" />
              </svg>
            }
          >
            RE-SCAN MODEL
          </ActionLabel>
        </button>
      </div>
    </div>
  );
};

export default WardrobeActions;
