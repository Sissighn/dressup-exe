import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import MainLayout from "./components/layouts/MainLayout";
import Wardrobe from "./pages/Wardrobe";
import Avatar from "./pages/Avatar";
import Closet from "./pages/Closet";
import Gallery from "./pages/Gallery";
import Boards from "./pages/Boards";
import StylingBoard from "./pages/StylingBoard";
import About from "./pages/About";
import Auth from "./pages/Auth";
import {
  AUTH_STORAGE_KEY,
  API_BASE,
  clearScopedUserLocalData,
  setScopedItem,
  removeScopedItem,
  getScopedItem,
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
  const [profileImage, setProfileImage] = useState(() =>
    getScopedItem("userProfileImage", session),
  );

  useEffect(() => {
    const syncProfileImage = () => {
      if (!session) return;
      setProfileImage(getScopedItem("userProfileImage", session) || "");
    };

    window.addEventListener("profile-image-updated", syncProfileImage);
    return () =>
      window.removeEventListener("profile-image-updated", syncProfileImage);
  }, [session]);

  useEffect(() => {
    const validateSession = async () => {
      try {
        const response = await fetch(`${API_BASE}/auth/me`, {
          credentials: "include",
        });

        if (!response.ok) {
          localStorage.removeItem(AUTH_STORAGE_KEY);
          setSession(null);
          setProfileImage("");
        } else {
          const authUser = await response.json();
          const nextSession = { user: authUser };
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession));
          setSession(nextSession);

          if (authUser?.role === "user") {
          const profileResponse = await fetch(`${API_BASE}/profile`, {
            credentials: "include",
          });

          if (profileResponse.ok) {
            const profile = await profileResponse.json();

            if (profile.avatar_url) {
              setScopedItem("userAvatar", profile.avatar_url, nextSession);
            } else {
              removeScopedItem("userAvatar", nextSession);
            }

            const nextProfileImage =
              profile.face_scan_url || profile.avatar_url || "";
            if (nextProfileImage) {
              setScopedItem("userProfileImage", nextProfileImage, nextSession);
            } else {
              removeScopedItem("userProfileImage", nextSession);
            }
            setProfileImage(nextProfileImage);

            if (profile.display_name) {
              setScopedItem("userName", profile.display_name, nextSession);
            }

            const biometrics = {
              name: profile.display_name || "",
              gender: profile.gender || "FEMALE",
              height: profile.height || "",
              weight: profile.weight || "",
              bodyType: profile.body_type || "ATHLETIC",
            };
            setScopedItem(
              "userBiometrics",
              JSON.stringify(biometrics),
              nextSession,
            );
          }
        } else {
          setProfileImage("");
        }
        }
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        setSession(null);
        setProfileImage("");
      } finally {
        setIsCheckingSession(false);
      }
    };

    validateSession();
  }, []);

  const handleAuthSuccess = (nextSession) => {
    if (nextSession?.user?.role === "guest") {
      clearScopedUserLocalData(nextSession);
      setProfileImage("");
    } else {
      setProfileImage(getScopedItem("userProfileImage", nextSession) || "");
    }
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
  };

  const handleLogout = async () => {
    if (session?.user?.role === "guest") {
      clearScopedUserLocalData(session);
    }
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Local logout should still complete if the network is unavailable.
    }
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setSession(null);
    setProfileImage("");
  };

  if (isCheckingSession) {
    return null;
  }

  if (!session?.user) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <Router>
      <MainLayout
        onLogout={handleLogout}
        authUser={session.user}
        profileImage={profileImage}
      >
        <Routes>
          <Route path="/" element={<Wardrobe />} />
          <Route path="/avatar" element={<Avatar />} />
          <Route path="/closet" element={<Closet />} />
          <Route path="/styling" element={<StylingBoard />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/boards" element={<Boards />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App;
