import { useState } from "react";
import "./App.css";

// 1. Bilder importieren
import item1Img from "./assets/item1.png";
import item2Img from "./assets/item2.png"; // <-- Kommentiere das ein, wenn du die Bilder hast
import item3Img from "./assets/item3.png"; // <-- Kommentiere das ein, wenn du die Bilder hast

// 2. Unsere "Mock-Datenbank" (Ein Array aus Objekten)
// Wir verwenden erstmal für alle item1Img, bis du die anderen hast.
const WARDROBE_DATA = [
  {
    id: 1,
    name: "COTTON_TSHIRT_01",
    category: "TOP",
    description: "Heavyweight cotton tee, garment dyed finish.",
    image: item1Img,
  },
  {
    id: 2,
    name: "CARGO_PANT_TECH",
    category: "BOTTOM",
    description: "Nylon blend utility pant with multiple pockets.",
    image: item2Img, // Später: item2Img
  },
  {
    id: 3,
    name: "RUNNER_SNEAKER_V2",
    category: "FOOTWEAR",
    description: "Retro-future silhouette with distressed details.",
    image: item3Img, // Später: item3Img
  },
];

function App() {
  // 3. State: Wir merken uns den INDEX des aktuellen Items (Startet bei 0)
  const [currentItemIndex, setCurrentItemIndex] = useState(0);

  // Das aktuelle Item Objekt basierend auf dem Index holen
  const currentItem = WARDROBE_DATA[currentItemIndex];

  // Funktionen zum Blättern
  const nextItem = () => {
    // Wenn wir beim letzten sind, fangen wir vorne wieder an (Modulo Operator %)
    setCurrentItemIndex((prevIndex) => (prevIndex + 1) % WARDROBE_DATA.length);
  };

  const prevItem = () => {
    // Wenn wir beim ersten sind, gehen wir zum letzten
    setCurrentItemIndex((prevIndex) =>
      prevIndex === 0 ? WARDROBE_DATA.length - 1 : prevIndex - 1
    );
  };

  return (
    <div className="app-container">
      {/* Header (unverändert) */}
      <div className="top-bar">
        <div className="logo-area">dressup.</div>
        <div className="nav-tabs">
          <div className="nav-item active">Wardrobe</div>
          <div className="nav-item">Shop</div>
          <div className="nav-item">About</div>
        </div>
      </div>

      <div className="main-content">
        {/* Left Panel (unverändert) */}
        <div className="left-panel">
          <h1 className="hero-text">
            Where style <br /> becomes <br /> <i>identity.</i>
          </h1>
          <p className="sub-text">
            Curate your digital appearance with our archival collection. Select,
            edit, and export your look.
          </p>
          <button className="action-button">Start Styling</button>
        </div>

        {/* Right Panel (JETZT INTERAKTIV) */}
        <div className="right-panel">
          {/* Wir brauchen Pfeile zum Navigieren */}
          <button onClick={prevItem} className="nav-arrow left">
            &lt;
          </button>
          <button onClick={nextItem} className="nav-arrow right">
            &gt;
          </button>

          <div className="item-display-container">
            {/* Das Bild ist jetzt dynamisch! */}
            <img
              src={currentItem.image}
              alt={currentItem.name}
              className="item-image"
            />
            <div className="item-details">
              <span className="item-id">FIG. 0{currentItem.id}</span>
              <span className="item-name">{currentItem.name}</span>
            </div>
            {/* Beschreibungstext anzeigen */}
            <p className="item-description">{currentItem.description}</p>
          </div>
        </div>
      </div>

      {/* Footer (unverändert) */}
      <div className="footer-bar">
        <span>STATUS: BROWSING DATABASE</span>
        <span>ITEMS LOADED: {WARDROBE_DATA.length}</span>
        <span>LOCATION: BERLIN</span>
      </div>
    </div>
  );
}

export default App;
