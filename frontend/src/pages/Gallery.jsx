import React, { useState, useEffect } from "react";
import "../App.css";

const Gallery = () => {
  const [looks, setLooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    fetchGallery();
  }, []);

  return (
    <div
      className="main-content"
      style={{ display: "block", overflowY: "auto" }}
    >
      {/* HEADER BEREICH */}
      <div
        style={{
          padding: "3rem 2rem",
          background: "white",
          borderBottom: "3px solid black",
          marginBottom: "2rem",
        }}
      >
        <h1 className="hero-text" style={{ fontSize: "4rem", margin: 0 }}>
          THE LOOKBOOK.
        </h1>
        <p
          style={{
            fontWeight: "bold",
            textTransform: "uppercase",
            letterSpacing: "2px",
          }}
        >
          Captured Identities // Saved Assets
        </p>
      </div>

      {/* GRID FÜR DIE OUTFITS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "30px",
          padding: "0 2rem 4rem 2rem",
        }}
      >
        {loading ? (
          <p className="brutalist-loader-text">Loading Archive...</p>
        ) : looks.length > 0 ? (
          looks.map((look) => (
            <div
              key={look.id}
              style={{
                background: "white",
                border: "3px solid black",
                boxShadow: "10px 10px 0px black",
                padding: "15px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <img
                src={look.url}
                alt="Saved Look"
                style={{
                  width: "100%",
                  height: "400px",
                  objectFit: "cover",
                  border: "2px solid black",
                }}
              />
              <div
                style={{
                  background: "var(--accent-yellow)",
                  padding: "10px",
                  border: "2px solid black",
                  fontSize: "0.8rem",
                  fontWeight: "bold",
                  textAlign: "center",
                }}
              >
                LOOK_ID: {look.id.split("_").pop().substring(0, 8)}
              </div>
              <button
                className="action-button"
                onClick={() => window.open(look.url, "_blank")}
                style={{ marginTop: "5px", width: "100%", fontSize: "10px" }}
              >
                VIEW FULLSIZE
              </button>
            </div>
          ))
        ) : (
          <div
            style={{ gridColumn: "1/-1", textAlign: "center", padding: "4rem" }}
          >
            <h2 style={{ opacity: 0.2 }}>ARCHIVE EMPTY.</h2>
            <p>Go to Wardrobe to create your first look.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Gallery;
