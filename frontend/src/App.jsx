import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import MainLayout from "./components/layouts/MainLayout";
import Wardrobe from "./pages/Wardrobe";
import Avatar from "./pages/Avatar";
import Closet from "./pages/Closet";
import Gallery from "./pages/Gallery";
import About from "./pages/About";

function App() {
  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Wardrobe />} />
          <Route path="/avatar" element={<Avatar />} />
          <Route path="/closet" element={<Closet />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App;
