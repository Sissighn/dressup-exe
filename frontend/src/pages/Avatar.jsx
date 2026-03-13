import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../components/features/avatar/avatar.css";
import BiometricsForm from "../components/features/avatar/BiometricsForm";
import FaceScanUpload from "../components/features/avatar/FaceScanUpload";
import {
  authFetch,
  getAuthSession,
  getScopedItem,
  setScopedItem,
} from "../lib/authSession";

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
  const [validationErrors, setValidationErrors] = useState({
    name: false,
    height: false,
    weight: false,
    face: false,
  });
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const faceInputRef = useRef(null);

  useEffect(() => {
    const session = getAuthSession();
    const savedData = getScopedItem("userBiometrics", session);
    if (savedData) {
      setFormData(JSON.parse(savedData));
    }
  }, []);

  const handleInputChange = (e) => {
    const newData = { ...formData, [e.target.name]: e.target.value };
    setFormData(newData);
    setScopedItem("userBiometrics", JSON.stringify(newData), getAuthSession());

    if (e.target.name === "name" && e.target.value.trim()) {
      setValidationErrors((prev) => ({ ...prev, name: false }));
    }
    if (e.target.name === "height" && e.target.value) {
      setValidationErrors((prev) => ({ ...prev, height: false }));
    }
    if (e.target.name === "weight" && e.target.value) {
      setValidationErrors((prev) => ({ ...prev, weight: false }));
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFaceImage(URL.createObjectURL(file));
      setFaceFile(file);
      setValidationErrors((prev) => ({ ...prev, face: false }));
    }
  };

  const handleGenerate = async () => {
    const nextErrors = {
      name: !formData.name.trim(),
      height: !formData.height,
      weight: !formData.weight,
      face: !faceFile,
    };

    const hasErrors = Object.values(nextErrors).some(Boolean);
    setValidationErrors(nextErrors);

    if (hasErrors) {
      setModalMessage(
        "Please fill DISPLAY NAME, HEIGHT, WEIGHT and upload a FACE SCAN before generating.",
      );
      setShowValidationModal(true);
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
      const response = await authFetch("/generate-avatar", {
        method: "POST",
        body: payload,
      });

      const result = await response.json();

      if (response.ok) {
        if (result.data && result.data.avatar_url) {
          const session = getAuthSession();
          setScopedItem("userAvatar", result.data.avatar_url, session);
          if (result.data.face_scan_url) {
            setScopedItem("userProfileImage", result.data.face_scan_url, session);
            window.dispatchEvent(new Event("profile-image-updated"));
          }
          setScopedItem("userName", formData.name, session);
          if (result.data.warning) {
            console.warn(result.data.warning);
          }
          navigate("/");
        } else {
          setModalMessage(
            result.message ||
              result.error ||
              "Avatar generation failed. Please try again.",
          );
          setShowValidationModal(true);
        }
      } else {
        setModalMessage(result.detail || result.message || "Server error.");
        setShowValidationModal(true);
      }
    } catch (error) {
      console.error("Error:", error);
      setModalMessage("Connection failed. Please check backend and try again.");
      setShowValidationModal(true);
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
        <BiometricsForm
          formData={formData}
          onInputChange={handleInputChange}
          validation={validationErrors}
        />

        <FaceScanUpload
          faceImage={faceImage}
          isProcessing={isProcessing}
          onUploadClick={() => faceInputRef.current.click()}
          onGenerate={handleGenerate}
          showUploadError={validationErrors.face}
        />
        <input
          type="file"
          ref={faceInputRef}
          style={{ display: "none" }}
          onChange={handleFileChange}
          accept="image/*"
        />
      </div>

      {showValidationModal && (
        <div
          className="avatar-validation-overlay"
          onClick={() => setShowValidationModal(false)}
        >
          <div
            className="avatar-validation-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0 }}>ACTION REQUIRED</h2>
            <p style={{ margin: "16px 0", fontWeight: "bold" }}>
              {modalMessage}
            </p>
            <button
              className="action-button"
              onClick={() => setShowValidationModal(false)}
              style={{ width: "100%", background: "black", color: "white" }}
            >
              OK, GOT IT
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Avatar;
