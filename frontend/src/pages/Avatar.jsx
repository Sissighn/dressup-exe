import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../components/features/avatar/avatar.css";
import BiometricsForm from "../components/features/avatar/BiometricsForm";
import FaceScanUpload from "../components/features/avatar/FaceScanUpload";

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
        <BiometricsForm formData={formData} onInputChange={handleInputChange} />

        <FaceScanUpload
          faceImage={faceImage}
          isProcessing={isProcessing}
          onUploadClick={() => faceInputRef.current.click()}
          onGenerate={handleGenerate}
        />
        <input
          type="file"
          ref={faceInputRef}
          style={{ display: "none" }}
          onChange={handleFileChange}
          accept="image/*"
        />
      </div>
    </div>
  );
};

export default Avatar;
