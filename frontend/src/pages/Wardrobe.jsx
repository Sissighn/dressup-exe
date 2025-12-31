import { useState, useEffect } from "react";
import "../App.css";

const Wardrobe = () => {
  const [userAvatar, setUserAvatar] = useState(null);

  // State für Kleidungsauswahl
  const [tops, setTops] = useState([]);
  const [bottoms, setBottoms] = useState([]);
  const [currentTopIndex, setCurrentTopIndex] = useState(0);
  const [currentBottomIndex, setCurrentBottomIndex] = useState(0);

  // Avatar und Kleidung aus der Datenbank laden
  useEffect(() => {
    // 1. Avatar aus dem Local Storage laden
    const savedAvatar = localStorage.getItem("userAvatar");
    if (savedAvatar) {
      setUserAvatar(savedAvatar);
    }

    // 2. Kleidung vom Backend laden
    const fetchClosetItems = async () => {
      try {
        const res = await fetch("http://localhost:8000/closet");
        const allItems = await res.json();
        // Filtern nach den benötigten Kategorien
        setTops(allItems.filter((item) => item.category === "TOPS"));
        setBottoms(allItems.filter((item) => item.category === "BOTTOMS"));
      } catch (e) {
        console.error("Failed to load closet items", e);
      }
    };

    fetchClosetItems();
  }, []);

  // Navigation Funktionen
  const nextTop = () => {
    if (tops.length === 0) return;
    setCurrentTopIndex((prev) => (prev + 1) % tops.length);
  };
  const prevTop = () => {
    if (tops.length === 0) return;
    setCurrentTopIndex((prev) => (prev === 0 ? tops.length - 1 : prev - 1));
  };

  const nextBottom = () => {
    if (bottoms.length === 0) return;
    setCurrentBottomIndex((prev) => (prev + 1) % bottoms.length);
  };
  const prevBottom = () => {
    if (bottoms.length === 0) return;
    setCurrentBottomIndex((prev) =>
      prev === 0 ? bottoms.length - 1 : prev - 1
    );
  };

  const currentTop = tops.length > 0 ? tops[currentTopIndex] : null;
  const currentBottom = bottoms.length > 0 ? bottoms[currentBottomIndex] : null;

  return (
    <div className="main-content">
      {/* 1. LINKE SPALTE: INTRO */}
      <div className="left-panel">
        <h1 className="hero-text">
          Where style <br /> becomes <br /> <i>identity.</i>
        </h1>
        <p className="sub-text">
          Digital Twin Active. <br />
          Curate your digital appearance.
        </p>

        {/* Reset Button falls man neu anfangen will */}
        <button
          className="action-button"
          onClick={() => (window.location.href = "/avatar")}
          style={{ marginTop: "20px", fontSize: "12px" }}
        >
          RE-SCAN MODEL
        </button>
      </div>

      {/* 2. MITTLERE SPALTE: AVATAR STAGE */}
      <div className="center-panel">
        {userAvatar ? (
          <img
            src={userAvatar}
            alt="Digital Twin"
            style={{
              height: "95%" /* Nicht ganz 100 damit er Bodenhaftung hat */,
              width: "auto",
              objectFit: "contain",
              filter: "drop-shadow(0px 10px 20px rgba(0,0,0,0.3))", // Schatten für Realismus
            }}
          />
        ) : (
          <div style={{ opacity: 0.3, textAlign: "center" }}>
            <h2>NO MODEL FOUND</h2>
            <p>Please initialize in "My Model"</p>
          </div>
        )}
      </div>

      {/* 3. RECHTE SPALTE: KLEIDUNG (2-geteilt) */}
      <div className="right-panel">
        {/* OBERE HÄLFTE: TOPS */}
        <div className="clothing-section">
          <span className="section-label">01 / TOPS</span>

          <button onClick={prevTop} className="nav-arrow left">
            &lt;
          </button>

          {currentTop ? (
            <div style={{ textAlign: "center" }}>
              <img
                src={currentTop.image_path}
                alt={currentTop.name}
                style={{ height: "150px", objectFit: "contain" }}
              />
              <p
                style={{
                  fontSize: "10px",
                  marginTop: "10px",
                  fontWeight: "bold",
                }}
              >
                {currentTop.name}
              </p>
            </div>
          ) : (
            <p style={{ opacity: 0.5 }}>ADD TOPS TO CLOSET</p>
          )}

          <button onClick={nextTop} className="nav-arrow right">
            &gt;
          </button>
        </div>

        {/* UNTERE HÄLFTE: BOTTOMS */}
        <div className="clothing-section">
          <span className="section-label">02 / BOTTOMS</span>

          <button onClick={prevBottom} className="nav-arrow left">
            &lt;
          </button>

          {currentBottom ? (
            <div style={{ textAlign: "center" }}>
              <img
                src={currentBottom.image_path}
                alt={currentBottom.name}
                style={{ height: "150px", objectFit: "contain" }}
              />
              <p
                style={{
                  fontSize: "10px",
                  marginTop: "10px",
                  fontWeight: "bold",
                }}
              >
                {currentBottom.name}
              </p>
            </div>
          ) : (
            <p style={{ opacity: 0.5 }}>ADD BOTTOMS TO CLOSET</p>
          )}

          <button onClick={nextBottom} className="nav-arrow right">
            &gt;
          </button>
        </div>
      </div>
    </div>
  );
};

export default Wardrobe;
