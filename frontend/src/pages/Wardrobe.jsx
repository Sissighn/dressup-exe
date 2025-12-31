import { useState, useEffect } from "react";
import "../App.css";

// Importiere Beispielbilder (Du kannst hier später deine echten Kleidungsstücke reinladen)
import item1Img from "../assets/item1.png"; // Dein T-Shirt Bild

// DUMMY DATEN: Später kommen die aus der Datenbank
const TOPS_DATA = [
  { id: 101, name: "COTTON_TEE_WHT", image: item1Img },
  { id: 102, name: "SILK_BLOUSE_BLK", image: item1Img }, // Hier bräuchtest du eigentlich andere Bilder
  { id: 103, name: "CROP_TOP_GRY", image: item1Img },
];

const BOTTOMS_DATA = [
  { id: 201, name: "CARGO_PANT_01", image: item1Img }, // Hier Hosen-Bild nutzen
  { id: 202, name: "DENIM_JEAN_BLU", image: item1Img },
  { id: 203, name: "SKIRT_PLEATED", image: item1Img },
];

const Wardrobe = () => {
  const [userAvatar, setUserAvatar] = useState(null);

  // State für Kleidungsauswahl
  const [currentTopIndex, setCurrentTopIndex] = useState(0);
  const [currentBottomIndex, setCurrentBottomIndex] = useState(0);

  // Avatar laden
  useEffect(() => {
    const savedAvatar = localStorage.getItem("userAvatar");
    if (savedAvatar) {
      setUserAvatar(savedAvatar);
    }
  }, []);

  // Navigation Funktionen
  const nextTop = () =>
    setCurrentTopIndex((prev) => (prev + 1) % TOPS_DATA.length);
  const prevTop = () =>
    setCurrentTopIndex((prev) =>
      prev === 0 ? TOPS_DATA.length - 1 : prev - 1
    );

  const nextBottom = () =>
    setCurrentBottomIndex((prev) => (prev + 1) % BOTTOMS_DATA.length);
  const prevBottom = () =>
    setCurrentBottomIndex((prev) =>
      prev === 0 ? BOTTOMS_DATA.length - 1 : prev - 1
    );

  const currentTop = TOPS_DATA[currentTopIndex];
  const currentBottom = BOTTOMS_DATA[currentBottomIndex];

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

          <div style={{ textAlign: "center" }}>
            <img
              src={currentTop.image}
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

          <div style={{ textAlign: "center" }}>
            <img
              src={currentBottom.image}
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

          <button onClick={nextBottom} className="nav-arrow right">
            &gt;
          </button>
        </div>
      </div>
    </div>
  );
};

export default Wardrobe;
