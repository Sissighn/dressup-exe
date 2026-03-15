import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import MainLayout from "./components/layouts/MainLayout";
import Wardrobe from "./pages/Wardrobe";
import Avatar from "./pages/Avatar";
import Closet from "./pages/Closet";
import Gallery from "./pages/Gallery";
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
          setProfileImage("");
        } else if (session?.user?.role === "user") {
          const profileResponse = await fetch(`${API_BASE}/profile`, {
            headers: {
              Authorization: `Bearer ${session.token}`,
            },
          });

          if (profileResponse.ok) {
            const profile = await profileResponse.json();

            if (profile.avatar_url) {
              setScopedItem("userAvatar", profile.avatar_url, session);
            } else {
              removeScopedItem("userAvatar", session);
            }

            const nextProfileImage =
              profile.face_scan_url || profile.avatar_url || "";
            if (nextProfileImage) {
              setScopedItem("userProfileImage", nextProfileImage, session);
            } else {
              removeScopedItem("userProfileImage", session);
            }
            setProfileImage(nextProfileImage);

            if (profile.display_name) {
              setScopedItem("userName", profile.display_name, session);
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
              session,
            );
          }
        } else {
          setProfileImage("");
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
  }, [session?.token]);

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

  const handleLogout = () => {
    if (session?.user?.role === "guest") {
      clearScopedUserLocalData(session);
    }
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setSession(null);
    setProfileImage("");
  };

  if (isCheckingSession) {
    return null;
  }

  if (!session?.token) {
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
          <Route path="/about" element={<About />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App;
