import React from "react";
import shirtImage from "../../assets/shirt.png"; // Pfad angepasst!

const DressUpWindow = () => {
  return (
    <div
      className="window"
      style={{
        width: "350px",
        position: "absolute", // Wichtig: Damit es auf dem Desktop schwebt
        top: "10%",
        left: "20%",
        zIndex: 10,
      }}
    >
      <div className="title-bar">
        <div className="title-bar-text">DressUp.exe</div>
        <div className="title-bar-controls">
          <button aria-label="Minimize" />
          <button aria-label="Maximize" />
          <button aria-label="Close" />
        </div>
      </div>

      <div className="window-body">
        <p style={{ textAlign: "center", marginBottom: "15px" }}>
          Welcome to the digital wardrobe.
        </p>

        <div style={{ textAlign: "center", marginBottom: "15px" }}>
          <div
            className="sunken-panel"
            style={{
              display: "inline-block",
              padding: "10px",
              background: "white",
            }}
          >
            <img
              src={shirtImage}
              alt="Selected Item"
              style={{ width: "150px", display: "block" }}
            />
          </div>
          <p>Item: Red T-Shirt</p>
        </div>

        <div className="field-row" style={{ justifyContent: "center" }}>
          <button onClick={() => alert("Equipped!")}>Equip Item</button>
          <button>Next Item</button>
        </div>
      </div>
    </div>
  );
};

export default DressUpWindow;
