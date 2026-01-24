import React from "react";
import Header from "../common/Header";

const MainLayout = ({ children }) => {
  return (
    <div className="app-container">
      <Header />
      {/* 'children' ist hier die jeweilige Seite (z.B. Wardrobe, Closet), 
          die von React Router gerendert wird. */}
      {children}
      <div className="footer-bar">
        <span>STATUS: ONLINE</span>
        <span>SYSTEM: REACT v18</span>
        <span>LOCATION: BERLIN</span>
      </div>
    </div>
  );
};

export default MainLayout;
