import React, { useState, useEffect, useRef } from "react";
import "../App.css";

const Closet = () => {
  const [items, setItems] = useState([]);
  const [uploadName, setUploadName] = useState("");
  const [uploadCategory, setUploadCategory] = useState("TOPS");
  const fileInputRef = useRef(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [modalUploadCategory, setModalUploadCategory] = useState("TOPS");

  const [statusMessage, setStatusMessage] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);

  const fetchCloset = async () => {
    try {
      const res = await fetch("http://localhost:8000/closet");
      const data = await res.json();
      setItems(data);
    } catch (e) {
      console.error("FAILED_TO_LOAD_CLOSET", e);
    }
  };

  useEffect(() => {
    fetchCloset();
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewImage(URL.createObjectURL(file));
    setModalUploadCategory(uploadCategory);
    setIsModalOpen(true);
    e.target.value = null;
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("file", selectedFile);
    const nameToUpload =
      uploadName || selectedFile.name.replace(/\.[^/.]+$/, "");
    formData.append("name", nameToUpload);
    formData.append("category", modalUploadCategory);

    try {
      const response = await fetch("http://localhost:8000/upload-item", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("UPLOAD_FAILED");

      fetchCloset();
      setIsModalOpen(false);
      setSelectedFile(null);
      setPreviewImage(null);
      setUploadName("");
      setModalUploadCategory("TOPS");
    } catch (error) {
      console.error("UPLOAD_ERROR:", error);
      setStatusMessage({
        type: "error",
        text: "UPLOAD FAILED. CHECK SYSTEM CONSOLE.",
      });
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const response = await fetch(
        `http://localhost:8000/delete-item/${itemToDelete}`,
        {
          method: "DELETE",
        },
      );
      if (response.ok) {
        fetchCloset();
        setItemToDelete(null);
      } else {
        setStatusMessage({
          type: "error",
          text: "SERVER ERROR: ACTION DENIED.",
        });
      }
    } catch (error) {
      setStatusMessage({ type: "error", text: "CONNECTION INTERRUPTED." });
    }
  };

  const getCategoryItems = (cat) => items.filter((i) => i.category === cat);

  return (
    <div
      className="main-content"
      style={{ display: "block", overflowY: "auto", padding: "0" }}
    >
      {/* ERROR NOTIFICATION */}
      {statusMessage && statusMessage.type === "error" && (
        <div
          style={{
            position: "fixed",
            top: "100px",
            right: "40px",
            zIndex: 9999,
            background: "#ff4d4d",
            border: "4px solid black",
            padding: "20px",
            boxShadow: "8px 8px 0px black",
            display: "flex",
            alignItems: "center",
            gap: "20px",
          }}
        >
          <span style={{ fontWeight: "900", fontSize: "14px" }}>
            ERROR: {statusMessage.text}
          </span>
          <button
            onClick={() => setStatusMessage(null)}
            style={{
              background: "black",
              color: "white",
              border: "none",
              padding: "8px 12px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            DISMISS
          </button>
        </div>
      )}

      {/* DELETE CONFIRMATION (Backdrop Click added) */}
      {itemToDelete && (
        <div
          onClick={() => setItemToDelete(null)} // Schließt beim Klick irgendwohin
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()} // Verhindert Schließen beim Klick ins Fenster
            style={{
              background: "white",
              padding: "2.5rem",
              border: "4px solid black",
              boxShadow: "12px 12px 0px #ff4d4d",
              textAlign: "center",
              maxWidth: "400px",
            }}
          >
            <h2 style={{ marginTop: 0 }}>CONFIRM REMOVAL</h2>
            <p style={{ margin: "20px 0", fontWeight: "bold" }}>
              Are you sure you want to delete this item?
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={confirmDelete}
                style={{
                  flex: 1,
                  background: "black",
                  color: "white",
                  padding: "12px",
                  border: "none",
                  fontWeight: "900",
                  cursor: "pointer",
                }}
              >
                Yes, delete
              </button>
              <button
                onClick={() => setItemToDelete(null)}
                style={{
                  flex: 1,
                  background: "white",
                  color: "black",
                  padding: "12px",
                  border: "2px solid black",
                  fontWeight: "900",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
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
            ASSET MANAGEMENT INTERFACE
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
            + ADD NEW
          </button>
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileSelect}
        accept="image/*"
      />

      {/* CATEGORY ROWS with Fixed X placement */}
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
            <div
              style={{
                display: "flex",
                gap: "30px",
                overflowX: "auto",
                paddingBottom: "20px",
                whiteSpace: "nowrap",
              }}
            >
              {getCategoryItems(cat).map((item) => (
                <div
                  key={item.id}
                  style={{
                    position: "relative",
                    minWidth: "160px",
                    height: "160px",
                    border: "2px solid black",
                    padding: "10px",
                    background: "white",
                    boxShadow: "6px 6px 0px black",
                  }}
                >
                  {/* Korrigiertes X: Versetzt in der Ecke platziert */}
                  <button
                    onClick={() => setItemToDelete(item.id)}
                    style={{
                      position: "absolute",
                      top: "6px",
                      right: "5px",
                      width: "15px",
                      height: "23px",
                      fontSize: "10px",
                      // ---------------------
                      background: "white",
                      color: "black",
                      border: "1px solid black",
                      cursor: "pointer",
                      fontWeight: "bold",
                      zIndex: 20,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    X
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

      {/* UPLOAD MODAL */}
      {isModalOpen && (
        <div
          onClick={() => setIsModalOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              padding: "2rem",
              border: "4px solid black",
              width: "400px",
              textAlign: "center",
              boxShadow: "12px 12px 0px black",
            }}
          >
            <h3
              style={{
                marginTop: 0,
                borderBottom: "2px solid black",
                paddingBottom: "10px",
                textAlign: "left",
              }}
            >
              CONFIRM ASSET
            </h3>
            {previewImage && (
              <img
                src={previewImage}
                alt="Preview"
                style={{
                  maxWidth: "100%",
                  height: "220px",
                  objectFit: "contain",
                  margin: "20px 0",
                  background: "#f0f0f0",
                  border: "1px solid black",
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
                  border: "2px solid black",
                  fontWeight: "bold",
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
              style={{
                width: "100%",
                background: "black",
                color: "white",
                padding: "15px",
              }}
              onClick={handleConfirmUpload}
            >
              UPLOAD TO CLOSET
            </button>
            <button
              onClick={() => setIsModalOpen(false)}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                marginTop: "15px",
                cursor: "pointer",
                textDecoration: "underline",
                fontWeight: "bold",
              }}
            >
              CANCEL
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Closet;
