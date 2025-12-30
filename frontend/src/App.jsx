import { useState } from "react";
import "./App.css";
import shirtImage from "./assets/shirt.png"; // Dein Bild

function App() {
  return (
    <div className="app-container">
      {/* 1. Header Bereich (Wie die Tabs im Bild) */}
      <div className="top-bar">
        <div className="logo-area">dressup.</div>
        <div className="nav-tabs">
          <div className="nav-item active">Wardrobe</div>
          <div className="nav-item">Shop</div>
          <div className="nav-item">About</div>
        </div>
      </div>

      {/* 2. Hauptbereich (Grid Split) */}
      <div className="main-content">
        {/* Linke Seite: Große Typografie (Gelb) */}
        <div className="left-panel">
          <h1 className="hero-text">
            Where style <br />
            becomes <br />
            <i>identity.</i>
          </h1>
          <p className="sub-text">
            Curate your digital appearance with our archival collection. Select,
            edit, and export your look.
          </p>

          <button className="action-button">Start Styling</button>
        </div>

        {/* Rechte Seite: Das Bild (Weiß mit Raster) */}
        <div className="right-panel">
          <div
            style={{
              border: "1px solid black",
              padding: "20px",
              background: "white",
            }}
          >
            <img
              src={shirtImage}
              alt="Display"
              style={{
                width: "300px",
                display: "block",
                filter: "grayscale(100%) contrast(120%)",
              }}
            />
            <div
              style={{
                borderTop: "1px solid black",
                marginTop: "10px",
                paddingTop: "5px",
                fontSize: "12px",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>FIG. 01</span>
              <span>COTTON_TSHIRT</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Leiste */}
      <div
        style={{
          borderTop: "1px solid black",
          padding: "10px 2rem",
          fontSize: "12px",
          display: "flex",
          gap: "2rem",
        }}
      >
        <span>STATUS: ONLINE</span>
        <span>VERSION: 1.0.0</span>
        <span>LOCATION: BERLIN</span>
      </div>
    </div>
  );
}

export default App;
