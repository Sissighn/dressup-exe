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
  const [dressedAvatar, setDressedAvatar] = useState(null);
  const [selectedTop, setSelectedTop] = useState(null);
  const [selectedBottom, setSelectedBottom] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

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
      const fetchBlob = async (url) => {
        const response = await fetch(url, {
          mode: "cors",
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
        // CACHE BUSTING: Zwingt den Browser das Bild neu zu laden
        setDressedAvatar(`${result.outfit_url}?t=${Date.now()}`);
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

  const handleDownload = async () => {
    if (!dressedAvatar) return;
    try {
      const response = await fetch(dressedAvatar);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `digital_twin_look_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert("DOWNLOAD FAILED.");
    }
  };

  const displayImage = dressedAvatar || userAvatar;

  return (
    <div className="main-content">
      {/* 1. LINKE SPALTE: SCROLLABLE & KLEINERE ABSTÄNDE */}
      <div
        className="left-panel"
        style={{ maxHeight: "100vh", overflowY: "auto", paddingBottom: "20px" }}
      >
        <h1 className="hero-text" style={{ fontSize: "2.8rem" }}>
          Where style <br /> becomes <br /> <i>identity.</i>
        </h1>
        <p className="sub-text">
          Digital Twin Active. <br />
          Curate your digital appearance.
        </p>

        <div
          style={{
            marginTop: "30px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
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
                  : "black",
              color: "white",
              padding: "10px",
              fontSize: "12px",
              cursor: isGenerating ? "not-allowed" : "pointer",
            }}
          >
            {isGenerating ? "AI GENERATING..." : "TRY THE COMBI ON"}
          </button>

          {dressedAvatar && (
            <>
              <button
                className="action-button"
                onClick={handleDownload}
                style={{
                  background: "var(--accent-yellow)",
                  color: "black",
                  border: "2px solid black",
                  fontWeight: "bold",
                  padding: "10px",
                  fontSize: "12px",
                }}
              >
                💾 SAVE LOOK (.PNG)
              </button>

              <button
                className="action-button"
                onClick={() => setDressedAvatar(null)}
                style={{
                  background: "transparent",
                  color: "black",
                  border: "1px solid black",
                  padding: "10px",
                  fontSize: "12px",
                }}
              >
                RESET TO ORIGINAL
              </button>
            </>
          )}

          <button
            className="action-button"
            onClick={() => navigate("/avatar")}
            style={{
              marginTop: "5px",
              fontSize: "11px",
              background: "transparent",
              border: "1px solid black",
              padding: "8px",
            }}
          >
            RE-SCAN MODEL
          </button>
        </div>
      </div>

      {/* 2. MITTLERE SPALTE: AVATAR STAGE */}
      <div className="center-panel">
        {isGenerating ? (
          <div className="brutalist-loader-box">
            <div className="brutalist-loader-text">
              PROCESSING
              <span className="blink-block"></span>
            </div>
            <div className="loader-status-line">
              {">"} TOP_ID: {selectedTop?.id}
            </div>
            <div className="loader-status-line">
              {">"} BTM_ID: {selectedBottom?.id}
            </div>
            <div className="loader-status-line">{">"} STITCHING...</div>
          </div>
        ) : displayImage ? (
          <img
            src={displayImage}
            alt="Digital Twin"
            className="avatar-image-display"
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
          </div>
        )}
      </div>

      {/* 3. RECHTE SPALTE: ORIGINAL LAYOUT (UNBERÜHRT) */}
      <div className="right-panel">
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
