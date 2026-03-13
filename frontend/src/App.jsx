import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import MainLayout from "./components/layouts/MainLayout";
import Wardrobe from "./pages/Wardrobe";
import Avatar from "./pages/Avatar";
import Closet from "./pages/Closet";
import Gallery from "./pages/Gallery";
import About from "./pages/About";
import Auth from "./pages/Auth";
import {
  AUTH_STORAGE_KEY,
  API_BASE,
  clearScopedUserLocalData,
} from "./lib/authSession";

function App() {
  const [session, setSession] = useState(() => {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    const validateSession = async () => {
      if (!session?.token) {
        setIsCheckingSession(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/auth/me`, {
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        });

        if (!response.ok) {
          localStorage.removeItem(AUTH_STORAGE_KEY);
          setSession(null);
        }
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        setSession(null);
      } finally {
        setIsCheckingSession(false);
      }
    };

    validateSession();
  }, [session?.token]);

  const handleAuthSuccess = (nextSession) => {
    if (nextSession?.user?.role === "guest") {
      clearScopedUserLocalData(nextSession);
    }
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
  };

  const handleLogout = () => {
    if (session?.user?.role === "guest") {
      clearScopedUserLocalData(session);
    }
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setSession(null);
  };

  if (isCheckingSession) {
    return null;
  }

  if (!session?.token) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <Router>
      <MainLayout onLogout={handleLogout} authUser={session.user}>
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
