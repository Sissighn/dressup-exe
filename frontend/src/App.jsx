import { useState } from "react";
import "./App.css";
// Hier importieren wir das Bild aus dem assets Ordner
// ACHTUNG: Wenn dein Bild anders heißt (z.B. .jpg), ändere den Namen hier!
import shirtImage from "./assets/shirt.png";

function App() {
  return (
    <div className="app-container">
      {/* Das ist die Überschrift */}
      <h1>DressUp Exe</h1>
      <p>Wähle dein Outfit für heute!</p>

      {/* Hier ist der Bereich für das Bild */}
      <div className="card">
        <img
          src={shirtImage}
          alt="Ein cooles T-Shirt"
          style={{ width: "200px", borderRadius: "10px" }}
        />
        <p>Mein erstes Item: Rotes T-Shirt</p>
      </div>

      <button onClick={() => alert("Angezogen!")}>Dieses Teil anziehen</button>
    </div>
  );
}

export default App;
