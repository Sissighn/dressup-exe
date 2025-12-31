import React, { useState, useEffect } from "react";
import "../App.css";

const Gallery = () => {
  const [looks, setLooks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchGallery = async () => {
    try {
      const res = await fetch("http://localhost:8000/gallery");
      const data = await res.json();
      setLooks(data);
    } catch (e) {
      console.error("Failed to load gallery", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGallery();
  }, []);

  const handleDelete = async (filename) => {
    if (!window.confirm("PERMANENTLY DELETE THIS ASSET?")) return;
    try {
      const res = await fetch(`http://localhost:8000/delete-look/${filename}`, {
        method: "DELETE",
      });
      if (res.ok) setLooks(looks.filter((l) => l.id !== filename));
    } catch (e) {
      alert("ERROR.");
    }
  };

  return (
    <div className="gallery-page-container">
      {/* HEADER: Zurück zum Original-Font, aber kompakt */}
      <div className="gallery-header-clean">
        <h1 className="hero-text" style={{ fontSize: "2rem", margin: 0 }}>
          THE LOOKBOOK.
        </h1>
        <div className="status-pill">ASSETS: {looks.length}</div>
      </div>

      <div className="gallery-grid-compact">
        {loading ? (
          <div className="brutalist-loader-box">INITIALIZING...</div>
        ) : looks.length > 0 ? (
          looks.map((look) => (
            <div key={look.id} className="neo-album-card">
              <button
                className="delete-btn-top"
                onClick={() => handleDelete(look.id)}
              >
                ✕
              </button>

              <div className="neo-img-frame">
                <img src={look.url} alt="Look" />
              </div>

              <div className="neo-card-footer-mustard">
                <span className="asset-id-text">
                  ID_{look.id.split("_").pop().substring(0, 6)}
                </span>
                <button
                  className="expand-link-btn"
                  onClick={() => window.open(look.url, "_blank")}
                >
                  VIEW
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <h2>ARCHIVE_EMPTY</h2>
          </div>
        )}
      </div>
    </div>
  );
};

export default Gallery;
