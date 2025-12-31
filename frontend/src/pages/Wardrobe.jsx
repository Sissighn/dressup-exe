import { useState } from "react";
import "../App.css";
import shirtImage from "../assets/item1.png";

// Die Daten (Später kommen die aus der Datenbank)
const WARDROBE_DATA = [
  {
    id: 1,
    name: "COTTON_TSHIRT_01",
    category: "TOP",
    description: "Heavyweight cotton tee.",
    image: shirtImage,
  },
  {
    id: 2,
    name: "CARGO_PANT_TECH",
    category: "BOTTOM",
    description: "Nylon blend utility pant.",
    image: shirtImage,
  },
  {
    id: 3,
    name: "RUNNER_SNEAKER_V2",
    category: "FOOTWEAR",
    description: "Retro-future silhouette.",
    image: shirtImage,
  },
];

const Wardrobe = () => {
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const currentItem = WARDROBE_DATA[currentItemIndex];

  const nextItem = () =>
    setCurrentItemIndex((prev) => (prev + 1) % WARDROBE_DATA.length);
  const prevItem = () =>
    setCurrentItemIndex((prev) =>
      prev === 0 ? WARDROBE_DATA.length - 1 : prev - 1
    );

  return (
    <div className="main-content">
      {/* Left Panel: Hier kommt später dein Avatar hin! */}
      <div className="left-panel">
        <h1 className="hero-text">
          Where style <br /> becomes <br /> <i>identity.</i>
        </h1>
        <p className="sub-text">
          Digital Twin Active. <br />
          Select items to visualize on your avatar.
        </p>
        <button className="action-button">Visualize Fit</button>
      </div>

      {/* Right Panel: Item Viewer */}
      <div className="right-panel">
        <div className="item-display-container">
          <button onClick={prevItem} className="nav-arrow left">
            &lt;
          </button>
          <button onClick={nextItem} className="nav-arrow right">
            &gt;
          </button>

          <img
            src={currentItem.image}
            alt={currentItem.name}
            className="item-image"
          />

          <div className="item-details">
            <span className="item-id">FIG. 0{currentItem.id}</span>
            <span className="item-name">{currentItem.name}</span>
          </div>
          <p className="item-description">{currentItem.description}</p>
        </div>
      </div>
    </div>
  );
};

export default Wardrobe;
