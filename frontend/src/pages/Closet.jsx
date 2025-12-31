import React, { useState, useEffect, useRef } from "react";
import "../App.css";

const Closet = () => {
  const [items, setItems] = useState([]);
  const [uploadName, setUploadName] = useState("");
  const [uploadCategory, setUploadCategory] = useState("TOPS");
  const fileInputRef = useRef(null);

  // State für das Pop-up-Fenster (Modal)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [modalUploadCategory, setModalUploadCategory] = useState("TOPS");

  // Daten vom Backend laden
  const fetchCloset = async () => {
    try {
      const res = await fetch("http://localhost:8000/closet");
      const data = await res.json();
      setItems(data);
    } catch (e) {
      console.error("Failed to load closet", e);
    }
  };

  useEffect(() => {
    fetchCloset();
  }, []);

  // 1. Öffnet das Modal nach der Dateiauswahl
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setPreviewImage(URL.createObjectURL(file));

    // Modal-Felder mit Werten aus dem Header oder Dateinamen vorbefüllen
    setModalUploadCategory(uploadCategory);

    setIsModalOpen(true);

    // Wichtig: Input zurücksetzen, damit dieselbe Datei erneut gewählt werden kann
    e.target.value = null;
  };

  // 2. Führt den eigentlichen Upload aus dem Modal heraus aus
  const handleConfirmUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("file", selectedFile);
    const nameToUpload =
      uploadName || selectedFile.name.replace(/\.[^/.]+$/, "");
    formData.append("name", nameToUpload);
    formData.append("category", modalUploadCategory);

    try {
      await fetch("http://localhost:8000/upload-item", {
        method: "POST",
        body: formData,
      });
      alert("ITEM ADDED TO DATABASE");
      fetchCloset(); // Liste neu laden

      // Modal schließen und alle relevanten States zurücksetzen
      setIsModalOpen(false);
      setSelectedFile(null);
      setPreviewImage(null);
      setUploadName(""); // Auch den Header-Input zurücksetzen
      setModalUploadCategory("TOPS");
    } catch (error) {
      alert("UPLOAD FAILED");
    }
  };

  // 3. Löscht ein Item
  const handleDeleteItem = async (itemId) => {
    if (!window.confirm("Möchten Sie dieses Item wirklich löschen?")) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8000/delete-item/${itemId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        alert("ITEM GELÖSCHT");
        fetchCloset(); // Liste neu laden
      } else {
        // Gib mehr Details aus, um das Debugging zu erleichtern
        const errorText = await response.text();
        console.error(
          "Fehler vom Server beim Löschen:",
          response.status,
          errorText
        );
        alert(
          `LÖSCHEN FEHLGESCHLAGEN. Server-Antwort: ${response.status}. Siehe Konsole für Details.`
        );
      }
    } catch (error) {
      console.error("Netzwerkfehler beim Löschen:", error);
      alert(
        "LÖSCHEN FEHLGESCHLAGEN. Verbindung zum Server fehlgeschlagen. Siehe Konsole für Details."
      );
    }
  };

  // Hilfsfunktion um Items nach Kategorie zu filtern
  const getCategoryItems = (cat) => items.filter((i) => i.category === cat);

  return (
    <div
      className="main-content"
      style={{ display: "block", overflowY: "auto", padding: "0" }}
    >
      {/* 1. UPLOAD AREA (Oben fixiert) */}
      <div
        style={{
          padding: "2rem",
          borderBottom: "1px solid var(--border-color)",
          background: "var(--accent-yellow)",
          display: "flex",
          gap: "2rem",
          alignItems: "center",
        }}
      >
        <div>
          <h1
            className="hero-text"
            style={{ fontSize: "2rem", marginBottom: "0" }}
          >
            DIGITAL ARCHIVE.
          </h1>
          <p style={{ fontSize: "0.8rem", opacity: 0.7 }}>
            UPLOAD NEW ASSETS TO DATABASE
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
            background: "white",
            padding: "10px",
            border: "1px solid black",
          }}
        >
          <input
            type="text"
            placeholder="ITEM NAME"
            value={uploadName}
            onChange={(e) => setUploadName(e.target.value)}
            style={{
              border: "none",
              borderBottom: "1px solid #ccc",
              padding: "5px",
            }}
          />
          <select
            value={uploadCategory}
            onChange={(e) => setUploadCategory(e.target.value)}
            style={{ border: "none", padding: "5px", fontWeight: "bold" }}
          >
            <option value="TOPS">TOPS</option>
            <option value="BOTTOMS">BOTTOMS</option>
            <option value="SHOES">SHOES</option>
            <option value="BAGS">BAGS</option>
          </select>

          <button
            className="action-button"
            style={{ marginTop: 0, padding: "5px 15px", fontSize: "0.8rem" }}
            onClick={() => fileInputRef.current.click()}
          >
            + UPLOAD FILE
          </button>
        </div>
      </div>

      {/* Verstecktes File-Input-Element */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileSelect}
        accept="image/*"
      />

      {/* 2. DIE 4 REIHEN (Horizontal Scrolling) */}
      <div style={{ padding: "2rem" }}>
        {["TOPS", "BOTTOMS", "SHOES", "BAGS"].map((cat) => (
          <div key={cat} style={{ marginBottom: "3rem" }}>
            <h3
              style={{
                borderBottom: "1px solid black",
                paddingBottom: "5px",
                marginBottom: "15px",
              }}
            >
              0{["TOPS", "BOTTOMS", "SHOES", "BAGS"].indexOf(cat) + 1} / {cat}
            </h3>

            {/* Horizontal Scroll Container */}
            <div
              style={{
                display: "flex",
                gap: "20px",
                overflowX: "auto",
                paddingBottom: "10px",
                whiteSpace: "nowrap",
              }}
            >
              {/* Echte Items */}
              {getCategoryItems(cat).map((item) => (
                <div
                  key={item.id}
                  style={{
                    position: "relative", // Für die Positionierung des Löschen-Buttons
                    minWidth: "150px",
                    height: "150px",
                    border: "1px solid #eee",
                    padding: "10px",
                    background: "white",
                  }}
                >
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    title="Item löschen"
                    style={{
                      position: "absolute",
                      top: "5px",
                      right: "5px",
                      background: "rgba(255, 255, 255, 0.9)",
                      border: "1px solid black",
                      borderRadius: "50%",
                      width: "24px",
                      height: "24px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "bold",
                      zIndex: 10,
                      padding: 0,
                      fontSize: "14px",
                    }}
                  >
                    &times;
                  </button>
                  <img
                    src={item.image_path}
                    alt={item.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 3. UPLOAD MODAL (Pop-up Fenster) */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "white",
              padding: "2rem",
              border: "1px solid black",
              width: "400px",
              textAlign: "center",
            }}
          >
            <h3
              style={{
                marginTop: 0,
                borderBottom: "1px solid #eee",
                paddingBottom: "10px",
                textAlign: "left",
              }}
            >
              CONFIRM ITEM
            </h3>

            {previewImage && (
              <img
                src={previewImage}
                alt="Preview"
                style={{
                  maxWidth: "100%",
                  height: "200px",
                  objectFit: "contain",
                  margin: "20px 0",
                  background: "#f9f9f9",
                  border: "1px solid #eee",
                }}
              />
            )}

            <div style={{ margin: "20px 0", textAlign: "left" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "bold",
                  marginBottom: "5px",
                }}
              >
                CATEGORY
              </label>
              <select
                value={modalUploadCategory}
                onChange={(e) => setModalUploadCategory(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid black",
                }}
              >
                <option value="TOPS">TOPS</option>
                <option value="BOTTOMS">BOTTOMS</option>
                <option value="SHOES">SHOES</option>
                <option value="BAGS">BAGS</option>
              </select>
            </div>

            <button
              className="action-button"
              style={{ width: "100%", background: "black", color: "white" }}
              onClick={handleConfirmUpload}
            >
              CONFIRM & UPLOAD
            </button>
            <button
              onClick={() => setIsModalOpen(false)}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                marginTop: "10px",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Closet;
