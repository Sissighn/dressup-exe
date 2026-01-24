import React from "react";

const StatusNotification = ({ message, onDismiss }) => {
  if (!message || message.type !== "error") return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "100px",
        right: "40px",
        zIndex: 9999,
        background: "#ff4d4d",
        border: "4px solid black",
        padding: "20px",
        boxShadow: "8px 8px 0px black",
        display: "flex",
        alignItems: "center",
        gap: "20px",
      }}
    >
      <span style={{ fontWeight: "900", fontSize: "14px" }}>
        ERROR: {message.text}
      </span>
      <button
        onClick={onDismiss}
        style={{
          background: "black",
          color: "white",
          border: "none",
          padding: "8px 12px",
          cursor: "pointer",
          fontWeight: "bold",
        }}
      >
        DISMISS
      </button>
    </div>
  );
};

export default StatusNotification;
