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
import Closet from "./pages/Closet";
import Gallery from "./pages/Gallery";
import About from "./pages/About";

const NavBar = () => {
  const location = useLocation();

  return (
    <div className="top-bar">
      <div className="logo-area">dressup.</div>
      <div className="nav-tabs">
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
        <Link
          to="/closet"
          className={`nav-item ${
            location.pathname === "/closet" ? "active" : ""
          }`}
        >
          CLOSET
        </Link>

        <Link
          to="/gallery"
          className={`nav-item ${
            location.pathname === "/gallery" ? "active" : ""
          }`}
        >
          LOOKBOOK
        </Link>

        {/* JETZT ALS LINK DEFINIERT */}
        <Link
          to="/about"
          className={`nav-item ${
            location.pathname === "/about" ? "active" : ""
          }`}
        >
          ABOUT
        </Link>
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <div className="app-container">
        <NavBar />

        <Routes>
          <Route path="/" element={<Wardrobe />} />
          <Route path="/avatar" element={<Avatar />} />
          <Route path="/closet" element={<Closet />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/about" element={<About />} />
        </Routes>

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
