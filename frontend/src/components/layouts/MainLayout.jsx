import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Header from "../common/Header";

const PAGE_NAMES = {
  "/": "WARDROBE",
  "/closet": "CLOSET",
  "/styling": "STYLING LAB",
  "/gallery": "LOOKBOOK",
  "/avatar": "MY MODEL",
  "/about": "ABOUT",
};

const MainLayout = ({ children, onLogout, authUser, profileImage }) => {
  const location = useLocation();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = time.toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const formattedDate = time.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const currentPage = PAGE_NAMES[location.pathname] || "—";

  return (
    <div className="app-container">
      <Header
        onLogout={onLogout}
        authUser={authUser}
        profileImage={profileImage}
      />
      {children}
      <div className="footer-bar">
        <span>PAGE: {currentPage}</span>
        <span>DATE: {formattedDate}</span>
        <span>TIME: {formattedTime}</span>
      </div>
    </div>
  );
};

export default MainLayout;
