import React from "react";
import "../components/features/about/about.css";

const About = () => {
  return (
    /* overflowY: "auto" ermöglicht das Scrollen */
    <div
      className="main-content about-page"
      style={{ overflowY: "auto", height: "calc(100vh - 80px)" }}
    >
      <div className="about-header-section">
        <h1
          className="hero-text"
          style={{ fontSize: "4.5rem", lineHeight: "0.9" }}
        >
          BEYOND THE <br /> <i>MIRROR.</i>
        </h1>
        <div className="brutalist-badge">EDITION_2026</div>
      </div>

      <div className="about-grid">
        <div className="about-card main-card">
          <h3>01 / THE PHILOSOPHY</h3>
          <p>
            In the digital age, your style is your first language.{" "}
            <b>dressup.exe</b> is not just an app; it is a high-definition
            laboratory for your aesthetic evolution. We bridge the gap between
            the physical closet and digital potential, allowing you to curate
            your presence with uncompromising precision.
          </p>
        </div>

        <div className="about-card highlight-card">
          <h3>02 / THE DIGITAL TWIN</h3>
          <p>
            Your Digital Twin is a masterpiece of biometric curation. By
            synchronizing high-end editorial aesthetics with your unique
            physical profile, we create a playground for fearless
            experimentation. Wear what you want, when you want, before it even
            exists in the physical world.
          </p>
        </div>

        <div className="about-card highlight-card">
          <h3>03 / RADICAL CURATION</h3>
          <p>
            We believe in mindful consumption through digital exploration. Every
            look archived is a step toward a more intentional wardrobe. Reduce
            the noise, find your signal, and define your signature style without
            the limitations of traditional retail.
          </p>
        </div>
      </div>
    </div>
  );
};

export default About;
