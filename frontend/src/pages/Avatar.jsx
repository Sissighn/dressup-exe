import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom"; // Brauchen wir später für den Redirect
import "../App.css";

const Avatar = () => {
  const navigate = useNavigate();

  // State für die Bilder
  const [faceImage, setFaceImage] = useState(null);
  const [bodyImage, setBodyImage] = useState(null);

  // State für den "AI Prozess" (Ladebalken)
  const [isProcessing, setIsProcessing] = useState(false);

  // Referenzen für die versteckten File-Inputs
  const faceInputRef = useRef(null);
  const bodyInputRef = useRef(null);

  // Funktion zum Behandeln des Datei-Uploads
  const handleFileChange = (event, type) => {
    const file = event.target.files[0];
    if (file) {
      // Erstelle eine URL für die Vorschau
      const previewUrl = URL.createObjectURL(file);
      if (type === "face") setFaceImage(previewUrl);
      if (type === "body") setBodyImage(previewUrl);
    }
  };

  // Diese Funktion startet später die "AI"
  const handleGenerate = () => {
    if (!faceImage || !bodyImage) {
      alert("PLEASE UPLOAD BOTH SCANS TO PROCEED.");
      return;
    }

    setIsProcessing(true);

    // Hier simulieren wir die AI-Berechnung (warten 3 Sekunden)
    setTimeout(() => {
      setIsProcessing(false);
      alert("DIGITAL TWIN GENERATED!");
      // Später: navigate('/') um zurück zur Wardrobe zu gehen
    }, 3000);
  };

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
        {/* Spalte 1: Biometrische Daten (Unverändert) */}
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
          {/* ... Inputs bleiben gleich ... */}
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

        {/* Spalte 2: Upload Zone (Jetzt funktional!) */}
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

          {/* Hidden Inputs */}
          <input
            type="file"
            ref={faceInputRef}
            style={{ display: "none" }}
            onChange={(e) => handleFileChange(e, "face")}
            accept="image/*"
          />
          <input
            type="file"
            ref={bodyInputRef}
            style={{ display: "none" }}
            onChange={(e) => handleFileChange(e, "body")}
            accept="image/*"
          />

          {/* Upload Box 1: Face */}
          <div
            className="upload-box"
            onClick={() => faceInputRef.current.click()}
            style={{
              border: "1px dashed black",
              padding: faceImage ? "10px" : "40px",
              textAlign: "center",
              marginBottom: "20px",
              cursor: "pointer",
              background: "#fff",
              height: "150px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {faceImage ? (
              <img
                src={faceImage}
                alt="Face Preview"
                style={{ height: "100%", width: "100%", objectFit: "cover" }}
              />
            ) : (
              <div>
                <p style={{ fontWeight: "bold" }}>FACE SCAN</p>
                <p style={{ fontSize: "12px", opacity: 0.6 }}>
                  Click to Upload
                </p>
              </div>
            )}
          </div>

          {/* Upload Box 2: Body */}
          <div
            className="upload-box"
            onClick={() => bodyInputRef.current.click()}
            style={{
              border: "1px dashed black",
              padding: bodyImage ? "10px" : "40px",
              textAlign: "center",
              cursor: "pointer",
              background: "#fff",
              height: "250px", // Etwas höher für Body
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {bodyImage ? (
              <img
                src={bodyImage}
                alt="Body Preview"
                style={{ height: "100%", width: "100%", objectFit: "cover" }}
              />
            ) : (
              <div>
                <p style={{ fontWeight: "bold" }}>FULL BODY SCAN</p>
                <p style={{ fontSize: "12px", opacity: 0.6 }}>
                  Click to Upload
                </p>
              </div>
            )}
          </div>

          {/* Generate Button mit Lade-Zustand */}
          <button
            onClick={handleGenerate}
            className="action-button"
            style={{
              width: "100%",
              marginTop: "30px",
              background: isProcessing ? "grey" : "var(--text-main)",
              color: "white",
              cursor: isProcessing ? "wait" : "pointer",
            }}
            disabled={isProcessing}
          >
            {isProcessing ? "PROCESSING BIOMETRICS..." : "GENERATE AVATAR"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Avatar;
