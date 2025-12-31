import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";

const Avatar = () => {
  const navigate = useNavigate();

  // State für die Formular-Daten (Text)
  const [formData, setFormData] = useState({
    name: "",
    height: "",
    weight: "",
    bodyType: "ATHLETIC",
  });

  // State für die Bilder-VORSCHAU (für die Anzeige im Browser)
  const [faceImage, setFaceImage] = useState(null);
  const [bodyImage, setBodyImage] = useState(null);

  // State für die ECHTEN Dateien (für das Python Backend)
  const [faceFile, setFaceFile] = useState(null);
  const [bodyFile, setBodyFile] = useState(null);

  // State für den Ladebalken
  const [isProcessing, setIsProcessing] = useState(false);

  // Referenzen für die versteckten File-Inputs
  const faceInputRef = useRef(null);
  const bodyInputRef = useRef(null);

  // Helper: Text-Inputs speichern
  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Helper: Datei-Upload behandeln
  const handleFileChange = (event, type) => {
    const file = event.target.files[0];
    if (file) {
      // 1. Vorschau URL erstellen
      const previewUrl = URL.createObjectURL(file);

      // 2. Beides speichern: Vorschau und echte Datei
      if (type === "face") {
        setFaceImage(previewUrl);
        setFaceFile(file);
      }
      if (type === "body") {
        setBodyImage(previewUrl);
        setBodyFile(file);
      }
    }
  };

  // Diese Funktion sendet die Daten an das Python Backend
  const handleGenerate = async () => {
    // Validierung: Haben wir alles?
    if (!faceFile || !bodyFile || !formData.name) {
      alert("PLEASE COMPLETE ALL FIELDS AND UPLOADS.");
      return;
    }

    setIsProcessing(true);

    // 1. Das Daten-Paket für das Backend schnüren (FormData)
    const payload = new FormData();
    payload.append("face_scan", faceFile);
    payload.append("body_scan", bodyFile);
    payload.append("display_name", formData.name);
    payload.append("height", formData.height);
    payload.append("weight", formData.weight);
    payload.append("body_type", formData.bodyType);

    try {
      // 2. An dein Python Backend senden
      const response = await fetch("http://localhost:8000/generate-avatar", {
        method: "POST",
        body: payload,
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Server Antwort:", result);

        // 3. Erfolg!
        // Wir speichern die URL (hier nehmen wir lokal die Preview, in echt käme sie vom Server)
        // damit die Wardrobe Seite das Bild anzeigen kann.
        localStorage.setItem("userAvatar", bodyImage);
        localStorage.setItem("userName", formData.name);

        alert("DIGITAL TWIN GENERATED SUCCESSFULLY!");
        navigate("/"); // Zurück zur Startseite
      } else {
        alert("SERVER ERROR. IS BACKEND RUNNING?");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("CONNECTION FAILED. CHECK TERMINAL IF BACKEND IS RUNNING.");
    } finally {
      setIsProcessing(false);
    }
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
              name="name" // WICHTIG für handleInputChange
              onChange={handleInputChange}
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
                name="height" // WICHTIG
                onChange={handleInputChange}
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
                name="weight" // WICHTIG
                onChange={handleInputChange}
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
              name="bodyType" // WICHTIG
              onChange={handleInputChange}
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
              height: "250px",
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

          {/* Generate Button mit Backend-Logik */}
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
            {isProcessing ? "SENDING TO SERVER..." : "GENERATE AVATAR"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Avatar;
