import React, { useState, useEffect, useRef } from "react";
import "../App.css";

const Closet = () => {
  const [items, setItems] = useState([]);
  const [uploadName, setUploadName] = useState("");
  const [uploadCategory, setUploadCategory] = useState("TOPS");
  const fileInputRef = useRef(null);

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

  // Upload Funktion
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", uploadName || file.name); // Fallback Name
    formData.append("category", uploadCategory);

    try {
      await fetch("http://localhost:8000/upload-item", {
        method: "POST",
        body: formData,
      });
      alert("ITEM ADDED TO DATABASE");
      fetchCloset(); // Liste neu laden
      setUploadName(""); // Reset
    } catch (error) {
      alert("UPLOAD FAILED");
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

          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleUpload}
          />
          <button
            className="action-button"
            style={{ marginTop: 0, padding: "5px 15px", fontSize: "0.8rem" }}
            onClick={() => fileInputRef.current.click()}
          >
            + UPLOAD FILE
          </button>
        </div>
      </div>

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
              {/* Add Item Placeholder */}
              <div
                style={{
                  minWidth: "150px",
                  height: "150px",
                  border: "1px dashed #ccc",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ccc",
                }}
              >
                EMPTY SLOT
              </div>

              {/* Echte Items */}
              {getCategoryItems(cat).map((item) => (
                <div
                  key={item.id}
                  style={{
                    minWidth: "150px",
                    border: "1px solid #eee",
                    padding: "10px",
                    background: "white",
                  }}
                >
                  <img
                    src={item.image_path}
                    style={{
                      width: "100%",
                      height: "120px",
                      objectFit: "contain",
                    }}
                  />
                  <p
                    style={{
                      fontSize: "10px",
                      textAlign: "center",
                      marginTop: "5px",
                      fontWeight: "bold",
                    }}
                  >
                    {item.name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Closet;
