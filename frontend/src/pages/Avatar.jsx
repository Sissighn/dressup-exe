import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";

const Avatar = () => {
  const navigate = useNavigate();

  // State für Formular-Daten inkl. GENDER
  const [formData, setFormData] = useState({
    name: "",
    gender: "FEMALE", // Standardwert
    height: "",
    weight: "",
    bodyType: "ATHLETIC",
  });

  // State für Bilder
  const [faceImage, setFaceImage] = useState(null);
  const [faceFile, setFaceFile] = useState(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const faceInputRef = useRef(null);

  useEffect(() => {
    const savedData = localStorage.getItem("userBiometrics");
    if (savedData) {
      setFormData(JSON.parse(savedData));
    }
  }, []);

  const handleInputChange = (e) => {
    const newData = { ...formData, [e.target.name]: e.target.value };
    setFormData(newData);
    localStorage.setItem("userBiometrics", JSON.stringify(newData));
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFaceImage(URL.createObjectURL(file));
      setFaceFile(file);
    }
  };

  const handleGenerate = async () => {
    if (!faceFile || !formData.name) {
      alert("PLEASE UPLOAD A FACE SCAN AND ENTER NAME.");
      return;
    }

    setIsProcessing(true);

    const payload = new FormData();
    payload.append("face_scan", faceFile);
    payload.append("display_name", formData.name);
    payload.append("gender", formData.gender); // NEU: Sendet "MALE" oder "FEMALE"
    payload.append("height", formData.height);
    payload.append("weight", formData.weight);
    payload.append("body_type", formData.bodyType);

    try {
      const response = await fetch("http://localhost:8000/generate-avatar", {
        method: "POST",
        body: payload,
      });

      if (response.ok) {
        const result = await response.json();
        if (result.data && result.data.avatar_url) {
          localStorage.setItem("userAvatar", result.data.avatar_url);
          localStorage.setItem("userName", formData.name);
          navigate("/");
        } else {
          alert("Fehler: Keine Avatar URL erhalten.");
        }
      } else {
        alert("Server Error.");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Connection Failed.");
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
        {/* Formular Section */}
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

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "20px",
              marginBottom: "15px",
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
                DISPLAY NAME
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="ENTER NAME"
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid black",
                }}
              />
            </div>

            {/* NEU: GENDER SELECTION */}
            <div className="input-group">
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "bold",
                  marginBottom: "5px",
                }}
              >
                GENDER
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid black",
                  borderRadius: 0,
                  height: "41px",
                }}
              >
                <option value="FEMALE">FEMALE</option>
                <option value="MALE">MALE</option>
              </select>
            </div>
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
                name="height"
                value={formData.height}
                onChange={handleInputChange}
                placeholder="175"
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid black",
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
                name="weight"
                value={formData.weight}
                onChange={handleInputChange}
                placeholder="65"
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid black",
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
              name="bodyType"
              value={formData.bodyType}
              onChange={handleInputChange}
              style={{
                width: "100%",
                padding: "10px",
                border: "1px solid black",
                borderRadius: 0,
              }}
            >
              <option value="ATHLETIC">ATHLETIC</option>
              <option value="SLIM">SLIM</option>
              <option value="CURVY">CURVY</option>
              <option value="RECTANGULAR">RECTANGULAR</option>
            </select>
          </div>
        </div>

        {/* Upload Section */}
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
          <input
            type="file"
            ref={faceInputRef}
            style={{ display: "none" }}
            onChange={handleFileChange}
            accept="image/*"
          />

          <div
            className="upload-box"
            onClick={() => faceInputRef.current.click()}
            style={{
              border: "1px dashed black",
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

          <button
            onClick={handleGenerate}
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
      </div>
    </div>
  );
};

export default Avatar;
