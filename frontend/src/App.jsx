import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import "./App.css";
import Wardrobe from "./pages/Wardrobe";
import Avatar from "./pages/Avatar";

// Wir lagern die Navigation aus, damit wir "active" States nutzen können
const NavBar = () => {
  const location = useLocation();

  return (
    <div className="top-bar">
      <div className="logo-area">dressup.</div>
      <div className="nav-tabs">
        {/* Der Link IST jetzt das Item. Keine Verschachtelung mehr. */}
        <Link
          to="/"
          className={`nav-item ${location.pathname === "/" ? "active" : ""}`}
        >
          WARDROBE
        </Link>

        <Link
          to="/avatar"
          className={`nav-item ${
            location.pathname === "/avatar" ? "active" : ""
          }`}
        >
          MY MODEL
        </Link>

        {/* About ist (noch) kein Link, sieht aber so aus */}
        <div className="nav-item">ABOUT</div>
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <div className="app-container">
        {/* Die Navigation ist immer sichtbar */}
        <NavBar />

        {/* Hier wechseln die Seiten je nach URL */}
        <Routes>
          <Route path="/" element={<Wardrobe />} />
          <Route path="/avatar" element={<Avatar />} />
        </Routes>

        {/* Footer ist auch immer sichtbar */}
        <div className="footer-bar">
          <span>STATUS: ONLINE</span>
          <span>SYSTEM: REACT v18</span>
          <span>LOCATION: BERLIN</span>
        </div>
      </div>
    </Router>
  );
}

export default App;
