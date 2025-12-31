import React from "react";
import "../App.css";

const Avatar = () => {
  return (
    <div
      className="main-content"
      style={{ display: "block", overflow: "auto", padding: "4rem" }}
    >
      <h1
        className="hero-text"
        style={{ fontSize: "3rem", marginBottom: "2rem" }}
      >
        Initialise <br /> <i>Digital Twin.</i>
      </h1>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4rem" }}
      >
        {/* Spalte 1: Biometrische Daten */}
        <div className="form-section">
          <h3
            style={{
              borderBottom: "1px solid black",
              paddingBottom: "10px",
              marginBottom: "20px",
            }}
          >
            01 / BIOMETRICS
          </h3>

          <div className="input-group" style={{ marginBottom: "15px" }}>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "bold",
                marginBottom: "5px",
              }}
            >
              DISPLAY NAME
            </label>
            <input
              type="text"
              placeholder="ENTER NAME"
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid black",
                background: "#fff",
              }}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px",
            }}
          >
            <div className="input-group">
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "bold",
                  marginBottom: "5px",
                }}
              >
                HEIGHT (CM)
              </label>
              <input
                type="number"
                placeholder="175"
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid black",
                  background: "#fff",
                }}
              />
            </div>
            <div className="input-group">
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "bold",
                  marginBottom: "5px",
                }}
              >
                WEIGHT (KG)
              </label>
              <input
                type="number"
                placeholder="65"
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid black",
                  background: "#fff",
                }}
              />
            </div>
          </div>

          <div className="input-group" style={{ marginTop: "15px" }}>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: "bold",
                marginBottom: "5px",
              }}
            >
              BODY TYPE
            </label>
            <select
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid black",
                background: "#fff",
                borderRadius: 0,
              }}
            >
              <option>ATHLETIC</option>
              <option>SLIM</option>
              <option>CURVY</option>
              <option>RECTANGULAR</option>
            </select>
          </div>
        </div>

        {/* Spalte 2: Upload Zone */}
        <div className="upload-section">
          <h3
            style={{
              borderBottom: "1px solid black",
              paddingBottom: "10px",
              marginBottom: "20px",
            }}
          >
            02 / DATA UPLOAD
          </h3>

          <div
            className="upload-box"
            style={{
              border: "1px dashed black",
              padding: "40px",
              textAlign: "center",
              marginBottom: "20px",
              cursor: "pointer",
              background: "#fff",
            }}
          >
            <p style={{ fontWeight: "bold" }}>FACE SCAN</p>
            <p style={{ fontSize: "12px", opacity: 0.6 }}>
              Drag & Drop or Click to Upload <br />
              (Front facing, neutral expression)
            </p>
          </div>

          <div
            className="upload-box"
            style={{
              border: "1px dashed black",
              padding: "40px",
              textAlign: "center",
              cursor: "pointer",
              background: "#fff",
            }}
          >
            <p style={{ fontWeight: "bold" }}>FULL BODY SCAN</p>
            <p style={{ fontSize: "12px", opacity: 0.6 }}>
              Drag & Drop or Click to Upload <br />
              (Tight clothing preferred for AI)
            </p>
          </div>

          <button
            className="action-button"
            style={{
              width: "100%",
              marginTop: "30px",
              background: "var(--text-main)",
              color: "white",
            }}
          >
            GENERATE AVATAR
          </button>
        </div>
      </div>
    </div>
  );
};

export default Avatar;
