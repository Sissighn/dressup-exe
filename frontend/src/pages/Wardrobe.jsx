import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";

const Wardrobe = () => {
  const navigate = useNavigate();
  const [userAvatar, setUserAvatar] = useState(null);

  // State für Kleidungsauswahl aus der Datenbank
  const [tops, setTops] = useState([]);
  const [bottoms, setBottoms] = useState([]);
  const [currentTopIndex, setCurrentTopIndex] = useState(0);
  const [currentBottomIndex, setCurrentBottomIndex] = useState(0);

  // Try-On State
  const [dressedAvatar, setDressedAvatar] = useState(null); // Das generierte Outfit Bild
  const [selectedTop, setSelectedTop] = useState(null); // Das für das Outfit ausgewählte Top
  const [selectedBottom, setSelectedBottom] = useState(null); // Das für das Outfit ausgewählte Bottom
  const [isGenerating, setIsGenerating] = useState(false); // Ladezustand

  // Avatar und Kleidung beim Laden initialisieren
  useEffect(() => {
    const savedAvatar = localStorage.getItem("userAvatar");
    if (savedAvatar) {
      setUserAvatar(savedAvatar);
    }

    const fetchClosetItems = async () => {
      try {
        const res = await fetch("http://localhost:8000/closet");
        const allItems = await res.json();
        setTops(allItems.filter((item) => item.category === "TOPS"));
        setBottoms(allItems.filter((item) => item.category === "BOTTOMS"));
      } catch (e) {
        console.error("Failed to load closet items", e);
      }
    };

    fetchClosetItems();
  }, []);

  // Navigation Funktionen für das Karussell
  const nextTop = () =>
    tops.length && setCurrentTopIndex((p) => (p + 1) % tops.length);
  const prevTop = () =>
    tops.length &&
    setCurrentTopIndex((p) => (p === 0 ? tops.length - 1 : p - 1));
  const nextBottom = () =>
    bottoms.length && setCurrentBottomIndex((p) => (p + 1) % bottoms.length);
  const prevBottom = () =>
    bottoms.length &&
    setCurrentBottomIndex((p) => (p === 0 ? bottoms.length - 1 : p - 1));

  const currentTop = tops[currentTopIndex];
  const currentBottom = bottoms[currentBottomIndex];

  // --- DIE TRY-ON LOGIK ---
  const handleTryOn = async () => {
    if (!userAvatar || !selectedTop || !selectedBottom) return;

    setIsGenerating(true);
    setDressedAvatar(null);

    try {
      // Hilfsfunktion: URL in Datei (Blob) umwandeln
      const fetchBlob = async (url) => {
        const response = await fetch(url, {
          mode: "cors", // Erzwingt CORS-Modus
          cache: "no-cache",
        });
        if (!response.ok) throw new Error(`Fetch failed for ${url}`);
        return response.blob();
      };
      const [avBlob, topBlob, btmBlob] = await Promise.all([
        fetchBlob(userAvatar),
        fetchBlob(selectedTop.image_path),
        fetchBlob(selectedBottom.image_path),
      ]);

      const formData = new FormData();
      formData.append("avatar_image", avBlob, "avatar.png");
      formData.append("top_image", topBlob, "top.png");
      formData.append("bottom_image", btmBlob, "bottom.png");

      const response = await fetch("http://localhost:8000/try-on-outfit", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setDressedAvatar(result.outfit_url); // Zeige das neue Bild an
      } else {
        const error = await response.json();
        alert(`AI Error: ${error.detail || "Failed to generate outfit"}`);
      }
    } catch (error) {
      console.error(error);
      alert("Connection failed. Check if backend is running.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Welches Bild zeigen wir in der Mitte an?
  const displayImage = dressedAvatar || userAvatar;

  return (
    <div className="main-content">
      {/* 1. LINKE SPALTE: INTRO & ACTIONS */}
      <div className="left-panel">
        <h1 className="hero-text">
          Where style <br /> becomes <br /> <i>identity.</i>
        </h1>
        <p className="sub-text">
          Digital Twin Active. <br />
          Curate your digital appearance.
        </p>

        {/* ACTION BUTTONS */}
        <div
          style={{
            marginTop: "40px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <button
            className="action-button"
            onClick={handleTryOn}
            disabled={!selectedTop || !selectedBottom || isGenerating}
            style={{
              background:
                !selectedTop || !selectedBottom || isGenerating
                  ? "#ccc"
                  : "var(--text-main)",
              color: "white",
              cursor:
                !selectedTop || !selectedBottom || isGenerating
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {isGenerating ? "AI GENERATING..." : "TRY THE COMBI ON"}
          </button>

          {dressedAvatar && (
            <button
              className="action-button"
              onClick={() => setDressedAvatar(null)}
              style={{
                background: "transparent",
                color: "black",
                border: "1px solid black",
              }}
            >
              RESET TO ORIGINAL
            </button>
          )}

          <button
            className="action-button"
            onClick={() => navigate("/avatar")}
            style={{
              marginTop: "10px",
              fontSize: "12px",
              background: "transparent",
              border: "1px solid black",
            }}
          >
            RE-SCAN MODEL
          </button>
        </div>
      </div>

      {/* 2. MITTLERE SPALTE: AVATAR STAGE */}
      <div className="center-panel">
        {isGenerating ? (
          <div style={{ textAlign: "center", opacity: 0.5 }}>
            <h2>Processing Outfit...</h2>
            <p>Gemini is stitching your look together.</p>
          </div>
        ) : displayImage ? (
          <img
            src={displayImage}
            alt="Digital Twin"
            style={{
              height: "95%",
              width: "auto",
              objectFit: "contain",
              filter: "drop-shadow(0px 10px 20px rgba(0,0,0,0.3))",
            }}
          />
        ) : (
          <div style={{ opacity: 0.3, textAlign: "center" }}>
            <h2>NO MODEL FOUND</h2>
            <p>Please initialize in "My Model"</p>
          </div>
        )}
      </div>

      {/* 3. RECHTE SPALTE: SELECTION */}
      <div className="right-panel">
        {/* TOPS SECTION */}
        <div className="clothing-section">
          <span className="section-label">TOPS</span>
          <button onClick={prevTop} className="nav-arrow left">
            &lt;
          </button>
          {currentTop ? (
            <div style={{ textAlign: "center" }}>
              <img
                src={currentTop.image_path}
                alt={currentTop.name}
                style={{ height: "120px", objectFit: "contain" }}
              />
              <p
                style={{
                  fontSize: "10px",
                  fontWeight: "bold",
                  marginTop: "5px",
                }}
              >
                {currentTop.name}
              </p>
              <button
                onClick={() => setSelectedTop(currentTop)}
                style={{
                  fontSize: "10px",
                  marginTop: "5px",
                  padding: "5px 12px",
                  cursor: "pointer",
                  background:
                    selectedTop?.id === currentTop.id ? "black" : "white",
                  color: selectedTop?.id === currentTop.id ? "white" : "black",
                  border: "1px solid black",
                }}
              >
                {selectedTop?.id === currentTop.id ? "SELECTED" : "SELECT"}
              </button>
            </div>
          ) : (
            <p style={{ opacity: 0.4, fontSize: "10px" }}>NO TOPS IN CLOSET</p>
          )}
          <button onClick={nextTop} className="nav-arrow right">
            &gt;
          </button>
        </div>

        {/* BOTTOMS SECTION */}
        <div className="clothing-section">
          <span className="section-label">BOTTOMS</span>
          <button onClick={prevBottom} className="nav-arrow left">
            &lt;
          </button>
          {currentBottom ? (
            <div style={{ textAlign: "center" }}>
              <img
                src={currentBottom.image_path}
                alt={currentBottom.name}
                style={{ height: "120px", objectFit: "contain" }}
              />
              <p
                style={{
                  fontSize: "10px",
                  fontWeight: "bold",
                  marginTop: "5px",
                }}
              >
                {currentBottom.name}
              </p>
              <button
                onClick={() => setSelectedBottom(currentBottom)}
                style={{
                  fontSize: "10px",
                  marginTop: "5px",
                  padding: "5px 12px",
                  cursor: "pointer",
                  background:
                    selectedBottom?.id === currentBottom.id ? "black" : "white",
                  color:
                    selectedBottom?.id === currentBottom.id ? "white" : "black",
                  border: "1px solid black",
                }}
              >
                {selectedBottom?.id === currentBottom.id
                  ? "SELECTED"
                  : "SELECT"}
              </button>
            </div>
          ) : (
            <p style={{ opacity: 0.4, fontSize: "10px" }}>
              NO BOTTOMS IN CLOSET
            </p>
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
