import React from "react";
import { NavLink } from "react-router-dom";
import "./header.css"; // Pass den Pfad bei Bedarf an

const Header = ({ onLogout, authUser }) => {
  // Die Funktion für className sorgt dafür, dass React Router v6 die 'active' Klasse korrekt setzt
  const getNavLinkClass = ({ isActive }) =>
    "nav-item" + (isActive ? " active" : "");

  return (
    <header className="top-bar">
      <div className="logo-area">dressup.</div>
      <nav className="nav-tabs">
        <NavLink to="/" className={getNavLinkClass}>
          WARDROBE
        </NavLink>
        <NavLink to="/closet" className={getNavLinkClass}>
          CLOSET
        </NavLink>
        <NavLink to="/gallery" className={getNavLinkClass}>
          LOOKBOOK
        </NavLink>
        <NavLink to="/avatar" className={getNavLinkClass}>
          MY MODEL
        </NavLink>
        <NavLink to="/about" className={getNavLinkClass}>
          ABOUT
        </NavLink>
      </nav>
      <div className="session-area">
        <span className="session-user">
          {authUser?.role === "guest"
            ? "GUEST MODE"
            : (authUser?.email || "USER").toUpperCase()}
        </span>
        <button className="logout-btn" onClick={onLogout} type="button">
          LOGOUT
        </button>
      </div>
    </header>
  );
};

export default Header;
