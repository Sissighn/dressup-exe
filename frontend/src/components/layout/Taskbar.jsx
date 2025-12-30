import React, { useState, useEffect } from "react";
import "98.css";

const Taskbar = () => {
  // Kleines Feature: Eine echte Uhrzeit unten rechts
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="window"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        backgroundColor: "#c0c0c0" /* Das klassische Grau */,
        borderTop: "2px solid #fff",
        boxShadow: "inset 0 1px 0 #fff",
      }}
    >
      <div
        className="title-bar"
        style={{
          padding: "3px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "none" /* Wir überschreiben das Blau der Titlebar */,
        }}
      >
        {/* Der Start Button */}
        <div style={{ display: "flex", gap: "5px" }}>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              fontWeight: "bold",
            }}
          >
            <img
              src="https://win98icons.alexmeub.com/icons/png/windows-0.png"
              alt="logo"
              style={{ height: "15px" }}
            />
            Start
          </button>

          {/* Hier kommen später die Tabs für offene Fenster hin */}
          <button className="active" style={{ fontWeight: "bold" }}>
            DressUp.exe
          </button>
        </div>

        {/* Die Uhr rechts unten (Tray) */}
        <div
          className="status-bar-field"
          style={{
            padding: "2px 10px",
            display: "flex",
            alignItems: "center",
            boxShadow:
              "inset -1px -1px #fff, inset 1px 1px #808080, inset -2px -2px #dfdfdf, inset 2px 2px #0a0a0a", // Sunken effect
          }}
        >
          {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
};

export default Taskbar;
