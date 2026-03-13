import React, { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import "./header.css"; // Pass den Pfad bei Bedarf an

const Header = ({ onLogout, authUser, profileImage }) => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const menuRef = useRef(null);

  const isGuest = authUser?.role === "guest";
  const isWardrobePage = location.pathname === "/";

  useEffect(() => {
    setImageLoadError(false);
  }, [profileImage]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
        {isGuest ? (
          <>
            <span className="session-user">GUEST MODE</span>
            <button className="logout-btn" onClick={onLogout} type="button">
              LOGOUT
            </button>
          </>
        ) : (
          <div className="profile-menu-wrapper" ref={menuRef}>
            <button
              className="profile-avatar-btn"
              type="button"
              onClick={() => isWardrobePage && setIsMenuOpen((prev) => !prev)}
              title={isWardrobePage ? "Open profile menu" : "Profile"}
              style={{
                width: "38px",
                height: "38px",
                minWidth: "38px",
                minHeight: "38px",
                borderRadius: "999px",
                overflow: "hidden",
              }}
            >
              {profileImage && !imageLoadError ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  className="profile-avatar-image"
                  onError={() => setImageLoadError(true)}
                  style={{
                    width: "100%",
                    height: "100%",
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "cover",
                    objectPosition: "center",
                    borderRadius: "999px",
                    display: "block",
                  }}
                />
              ) : (
                <span className="profile-avatar-fallback">U</span>
              )}
            </button>

            {isWardrobePage && isMenuOpen && (
              <div className="profile-dropdown-menu">
                <button
                  className="profile-dropdown-item"
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onLogout();
                  }}
                >
                  LOGOUT
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
