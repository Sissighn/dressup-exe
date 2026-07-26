import React from "react";

const AvatarDisplay = ({
  isGenerating,
  generationStep,
  displayImage,
  selectedTop,
  selectedBottom,
  onCreateModel,
}) => {
  const progressSteps = [
    { key: "uploading", label: "Uploading outfit assets" },
    { key: "generating", label: "Generating fashion render" },
    { key: "validating", label: "Validating full body framing" },
    { key: "finalizing", label: "Finalizing image" },
  ];
  const activeIndex = Math.max(
    0,
    progressSteps.findIndex((step) => step.key === generationStep),
  );

  return (
    <div className="center-panel">
      {isGenerating ? (
        <div className="brutalist-loader-box">
          <div className="brutalist-loader-text">
            PROCESSING<span className="blink-block"></span>
          </div>
          <div className="loader-status-line">{" >"} TOP_ID: {selectedTop?.id}</div>
          <div className="loader-status-line">{" >"} BTM_ID: {selectedBottom?.id}</div>
          <div className="generation-steps">
            {progressSteps.map((step, index) => (
              <div
                key={step.key}
                className={`generation-step ${index <= activeIndex ? "is-active" : ""}`}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{step.label}</p>
              </div>
            ))}
          </div>
        </div>
      ) : displayImage ? (
        <img
          src={displayImage}
          alt="Digital Twin"
          className="avatar-image-display"
        />
      ) : (
        <div className="wardrobe-empty-model">
          <h2>NO MODEL FOUND</h2>
          <p>Create model to start styling looks.</p>
          <button type="button" onClick={onCreateModel}>
            CREATE MODEL
          </button>
        </div>
      )}
    </div>
  );
};

export default AvatarDisplay;
