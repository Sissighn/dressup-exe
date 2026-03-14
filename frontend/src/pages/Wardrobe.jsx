import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";
import "../components/features/wardrobe/wardrobe.css";
import WardrobeActions from "../components/features/wardrobe/WardrobeActions";
import AvatarDisplay from "../components/features/wardrobe/AvatarDisplay";
import ClothingSelector from "../components/features/wardrobe/ClothingSelector";
import {
  authFetch,
  getAuthSession,
  getScopedItem,
  setScopedItem,
  removeScopedItem,
} from "../lib/authSession";

const Wardrobe = () => {
  const navigate = useNavigate();
  const [userAvatar, setUserAvatar] = useState(null);

  // State für Kleidungsauswahl aus der Datenbank
  const [tops, setTops] = useState([]);
  const [bottoms, setBottoms] = useState([]);
  const [currentTopIndex, setCurrentTopIndex] = useState(0);
  const [currentBottomIndex, setCurrentBottomIndex] = useState(0);

  // --- PERSISTENZ-LOGIK: Initialisierung aus localStorage ---
  const [selectedTop, setSelectedTop] = useState(() => {
    const saved = getScopedItem("selectedTop", getAuthSession());
    return saved ? JSON.parse(saved) : null;
  });
  const [selectedBottom, setSelectedBottom] = useState(() => {
    const saved = getScopedItem("selectedBottom", getAuthSession());
    return saved ? JSON.parse(saved) : null;
  });
  const [dressedAvatar, setDressedAvatar] = useState(() => {
    return getScopedItem("dressedAvatar", getAuthSession()) || null;
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [archiveDialog, setArchiveDialog] = useState({
    open: false,
    title: "",
    message: "",
    isError: false,
  });

  // --- SYNC: Änderungen im localStorage speichern ---
  useEffect(() => {
    const session = getAuthSession();
    if (selectedTop) {
      setScopedItem("selectedTop", JSON.stringify(selectedTop), session);
    } else {
      removeScopedItem("selectedTop", session);
    }
    if (selectedBottom) {
      setScopedItem("selectedBottom", JSON.stringify(selectedBottom), session);
    } else {
      removeScopedItem("selectedBottom", session);
    }
    if (dressedAvatar) {
      setScopedItem("dressedAvatar", dressedAvatar, session);
    } else {
      removeScopedItem("dressedAvatar", session);
    }
  }, [selectedTop, selectedBottom, dressedAvatar]);

  // Avatar und Kleidung beim Laden initialisieren
  useEffect(() => {
    const savedAvatar = getScopedItem("userAvatar", getAuthSession());
    if (savedAvatar) {
      // Wir hängen einen Zeitstempel an, um den Cache zu umgehen
      const cacheBusterUrl = savedAvatar.includes("?")
        ? `${savedAvatar.split("?")[0]}?t=${Date.now()}`
        : `${savedAvatar}?t=${Date.now()}`;
      setUserAvatar(cacheBusterUrl);
    }

    const fetchClosetItems = async () => {
      try {
        const res = await authFetch("/closet");
        const allItems = await res.json();
        setTops(allItems.filter((item) => item.category === "TOPS"));
        setBottoms(allItems.filter((item) => item.category === "BOTTOMS"));
      } catch (e) {
        console.error("Failed to load closet items", e);
      }
    };

    fetchClosetItems();
  }, []);

  const nextTop = () =>
    tops.length && setCurrentTopIndex((p) => (p + 1) % tops.length);
  const prevTop = () =>
    tops.length &&
    setCurrentTopIndex((p) => (p === 0 ? tops.length - 1 : p - 1));
  const nextBottom = () =>
    bottoms.length && setCurrentBottomIndex((p) => (p + 1) % bottoms.length);
  const prevBottom = () =>
    bottoms.length &&
    setCurrentBottomIndex((p) => (p === 0 ? bottoms.length - 1 : p - 1));

  const currentTop = tops[currentTopIndex];
  const currentBottom = bottoms[currentBottomIndex];

  // --- DIE TRY-ON LOGIK ---
  const handleTryOn = async () => {
    if (!userAvatar || !selectedTop || !selectedBottom) return;

    setIsGenerating(true);
    setDressedAvatar(null);

    try {
      const fetchBlob = async (url) => {
        const response = await fetch(url, { mode: "cors", cache: "no-cache" });
        if (!response.ok) throw new Error(`Fetch failed for ${url}`);
        return response.blob();
      };
      const [avBlob, topBlob, btmBlob] = await Promise.all([
        fetchBlob(userAvatar),
        fetchBlob(selectedTop.image_path),
        fetchBlob(selectedBottom.image_path),
      ]);

      const formData = new FormData();
      formData.append("avatar_image", avBlob, "avatar.png");
      formData.append("top_image", topBlob, "top.png");
      formData.append("bottom_image", btmBlob, "bottom.png");

      const response = await authFetch("/try-on-outfit", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        const newUrl = `${result.outfit_url}?t=${Date.now()}`;
        setDressedAvatar(newUrl);
      } else {
        const error = await response.json();
        alert(`AI Error: ${error.detail || "Failed to generate outfit"}`);
      }
    } catch (error) {
      console.error(error);
      alert("Connection failed. Check if backend is running.");
    } finally {
      setIsGenerating(false);
    }
  };

  // --- RESET LOGIK ---
  const handleReset = () => {
    setDressedAvatar(null);
    setSelectedTop(null);
    setSelectedBottom(null);
  };

  const handleDownload = async () => {
    if (!dressedAvatar) return;
    try {
      const response = await fetch(dressedAvatar);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `digital_twin_look_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert("DOWNLOAD FAILED.");
    }
  };

  const handleArchive = async () => {
    if (!dressedAvatar) return;
    try {
      const response = await authFetch("/archive-look", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outfit_url: dressedAvatar }),
      });
      if (response.ok) {
        setArchiveDialog({
          open: true,
          title: "ARCHIVE CONFIRMED",
          message: "LOOK SAVED TO DIGITAL ARCHIVE.",
          isError: false,
        });
      } else {
        setArchiveDialog({
          open: true,
          title: "ARCHIVE FAILED",
          message: "FAILED TO ARCHIVE LOOK.",
          isError: true,
        });
      }
    } catch (error) {
      console.error("Archive error:", error);
      setArchiveDialog({
        open: true,
        title: "ARCHIVE FAILED",
        message: "CONNECTION ERROR. PLEASE TRY AGAIN.",
        isError: true,
      });
    }
  };

  const displayImage = dressedAvatar || userAvatar;

  return (
    <>
      <div className="main-content">
        <WardrobeActions
          isGenerating={isGenerating}
          dressedAvatar={dressedAvatar}
          selectedTop={selectedTop}
          selectedBottom={selectedBottom}
          onTryOn={handleTryOn}
          onDownload={handleDownload}
          onArchive={handleArchive}
          onReset={handleReset}
          onRescan={() => navigate("/avatar")}
        />

        <AvatarDisplay
          isGenerating={isGenerating}
          displayImage={displayImage}
          selectedTop={selectedTop}
          selectedBottom={selectedBottom}
        />

        <div className="right-panel">
          <ClothingSelector
            label="TOPS"
            items={tops}
            currentItem={currentTop}
            selectedItem={selectedTop}
            onPrev={prevTop}
            onNext={nextTop}
            onSelect={setSelectedTop}
          />
          <ClothingSelector
            label="BOTTOMS"
            items={bottoms}
            currentItem={currentBottom}
            selectedItem={selectedBottom}
            onPrev={prevBottom}
            onNext={nextBottom}
            onSelect={setSelectedBottom}
          />
        </div>
      </div>

      {archiveDialog.open && (
        <div
          className="wardrobe-dialog-backdrop"
          role="presentation"
          onClick={() =>
            setArchiveDialog({
              open: false,
              title: "",
              message: "",
              isError: false,
            })
          }
        >
          <div
            className="wardrobe-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="archive-dialog-title"
          >
            <h3
              id="archive-dialog-title"
              className={`wardrobe-dialog-title ${archiveDialog.isError ? "is-error" : ""}`}
            >
              {archiveDialog.title}
            </h3>
            <p className="wardrobe-dialog-text">{archiveDialog.message}</p>
            <div className="wardrobe-dialog-actions">
              <button
                type="button"
                className="wardrobe-dialog-button"
                onClick={() =>
                  setArchiveDialog({
                    open: false,
                    title: "",
                    message: "",
                    isError: false,
                  })
                }
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Wardrobe;
