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
  assetFetch,
} from "../lib/authSession";

const Wardrobe = () => {
  const navigate = useNavigate();
  const [userAvatar, setUserAvatar] = useState(null);

  // State für Kleidungsauswahl aus der Datenbank
  const [tops, setTops] = useState([]);
  const [bottoms, setBottoms] = useState([]);
  const [dresses, setDresses] = useState([]);
  const [currentTopIndex, setCurrentTopIndex] = useState(0);
  const [currentBottomIndex, setCurrentBottomIndex] = useState(0);
  const [currentDressIndex, setCurrentDressIndex] = useState(0);

  // --- PERSISTENZ-LOGIK: Initialisierung aus localStorage ---
  const [outfitMode, setOutfitMode] = useState(
    () => getScopedItem("outfitMode", getAuthSession()) || "combo",
  );
  const [selectedTop, setSelectedTop] = useState(() => {
    const saved = getScopedItem("selectedTop", getAuthSession());
    return saved ? JSON.parse(saved) : null;
  });
  const [selectedBottom, setSelectedBottom] = useState(() => {
    const saved = getScopedItem("selectedBottom", getAuthSession());
    return saved ? JSON.parse(saved) : null;
  });
  const [selectedDress, setSelectedDress] = useState(() => {
    const saved = getScopedItem("selectedDress", getAuthSession());
    return saved ? JSON.parse(saved) : null;
  });
  const [dressedAvatar, setDressedAvatar] = useState(() => {
    return getScopedItem("dressedAvatar", getAuthSession()) || null;
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState("idle");
  const [toast, setToast] = useState(null);
  const [archiveDialog, setArchiveDialog] = useState({
    open: false,
    title: "",
    message: "",
    isError: false,
  });

  // --- SYNC: Änderungen im localStorage speichern ---
  useEffect(() => {
    const session = getAuthSession();
    setScopedItem("outfitMode", outfitMode, session);
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
    if (selectedDress) {
      setScopedItem("selectedDress", JSON.stringify(selectedDress), session);
    } else {
      removeScopedItem("selectedDress", session);
    }
    if (dressedAvatar) {
      setScopedItem("dressedAvatar", dressedAvatar, session);
    } else {
      removeScopedItem("dressedAvatar", session);
    }
  }, [outfitMode, selectedTop, selectedBottom, selectedDress, dressedAvatar]);

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
        setDresses(allItems.filter((item) => item.category === "DRESSES"));
      } catch (e) {
        console.error("Failed to load closet items", e);
      }
    };

    fetchClosetItems();
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timeoutId = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    if (!isGenerating) return undefined;

    const timedSteps = [
      { delay: 1200, step: "generating" },
      { delay: 9000, step: "validating" },
      { delay: 18000, step: "finalizing" },
    ];

    const timers = timedSteps.map(({ delay, step }) =>
      window.setTimeout(() => setGenerationStep(step), delay),
    );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [isGenerating]);

  const showToast = ({ title, message, tone = "error" }) => {
    setToast({ title, message, tone });
  };

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
  const nextDress = () =>
    dresses.length && setCurrentDressIndex((p) => (p + 1) % dresses.length);
  const prevDress = () =>
    dresses.length &&
    setCurrentDressIndex((p) => (p === 0 ? dresses.length - 1 : p - 1));

  const currentTop = tops[currentTopIndex];
  const currentBottom = bottoms[currentBottomIndex];
  const currentDress = dresses[currentDressIndex];

  const isDressMode = outfitMode === "dress";
  const isOutfitReady = isDressMode
    ? Boolean(selectedDress)
    : Boolean(selectedTop && selectedBottom);

  // Beim Moduswechsel bleibt die Auswahl des anderen Modus erhalten, aber ein
  // bereits generierter Look passt nicht mehr zur sichtbaren Auswahl.
  const handleModeChange = (nextMode) => {
    if (nextMode === outfitMode) return;
    setOutfitMode(nextMode);
    setDressedAvatar(null);
  };

  // --- DIE TRY-ON LOGIK ---
  const handleTryOn = async () => {
    if (!userAvatar) {
      showToast({
        title: "MODEL REQUIRED",
        message: "Create your digital model before trying on an outfit.",
      });
      return;
    }

    if (!isOutfitReady) {
      showToast({
        title: "OUTFIT INCOMPLETE",
        message: isDressMode
          ? "Select one dress before generating."
          : "Select one top and one bottom item before generating.",
      });
      return;
    }

    setIsGenerating(true);
    setGenerationStep("uploading");
    setDressedAvatar(null);

    try {
      const fetchBlob = async (url) => {
        const response = await assetFetch(url, {
          mode: "cors",
          cache: "no-cache",
        });
        if (!response.ok) throw new Error(`Fetch failed for ${url}`);
        return response.blob();
      };

      const formData = new FormData();

      if (isDressMode) {
        const [avBlob, dressBlob] = await Promise.all([
          fetchBlob(userAvatar),
          fetchBlob(selectedDress.image_path),
        ]);
        formData.append("avatar_image", avBlob, "avatar.png");
        formData.append("dress_image", dressBlob, "dress.png");
      } else {
        const [avBlob, topBlob, btmBlob] = await Promise.all([
          fetchBlob(userAvatar),
          fetchBlob(selectedTop.image_path),
          fetchBlob(selectedBottom.image_path),
        ]);
        formData.append("avatar_image", avBlob, "avatar.png");
        formData.append("top_image", topBlob, "top.png");
        formData.append("bottom_image", btmBlob, "bottom.png");
      }

      setGenerationStep("generating");
      const response = await authFetch("/try-on-outfit", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setGenerationStep("finalizing");
        const result = await response.json();
        const newUrl = `${result.outfit_url}?t=${Date.now()}`;
        setDressedAvatar(newUrl);
        showToast({
          title: "LOOK READY",
          message: "Your generated outfit is ready to review.",
          tone: "success",
        });
      } else {
        const error = await response.json();
        showToast({
          title: "AI GENERATION FAILED",
          message: error.detail || "Failed to generate outfit.",
        });
      }
    } catch (error) {
      console.error(error);
      showToast({
        title: "CONNECTION FAILED",
        message: "Check if the backend is running and try again.",
      });
    } finally {
      setIsGenerating(false);
      setGenerationStep("idle");
    }
  };

  // --- RESET LOGIK ---
  const handleReset = () => {
    setDressedAvatar(null);
    setSelectedTop(null);
    setSelectedBottom(null);
    setSelectedDress(null);
  };

  const handleDownload = async () => {
    if (!dressedAvatar) return;
    try {
      const response = await assetFetch(dressedAvatar);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `digital_twin_look_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      showToast({
        title: "DOWNLOAD FAILED",
        message: "The look could not be downloaded. Please try again.",
      });
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
          isDressMode={isDressMode}
          isOutfitReady={isOutfitReady}
          selectedTop={selectedTop}
          selectedBottom={selectedBottom}
          hasAvatar={Boolean(userAvatar)}
          onTryOn={handleTryOn}
          onDownload={handleDownload}
          onArchive={handleArchive}
          onReset={handleReset}
          onRescan={() => navigate("/avatar")}
        />

        <AvatarDisplay
          isGenerating={isGenerating}
          generationStep={generationStep}
          displayImage={displayImage}
          isDressMode={isDressMode}
          selectedTop={selectedTop}
          selectedBottom={selectedBottom}
          selectedDress={selectedDress}
          onCreateModel={() => navigate("/avatar")}
        />

        <div className="right-panel">
          <div
            className="outfit-mode-switch"
            role="group"
            aria-label="Outfit type"
          >
            <button
              type="button"
              className={`outfit-mode-button ${isDressMode ? "" : "is-active"}`}
              aria-pressed={!isDressMode}
              onClick={() => handleModeChange("combo")}
            >
              TOP + BOTTOM
            </button>
            <button
              type="button"
              className={`outfit-mode-button ${isDressMode ? "is-active" : ""}`}
              aria-pressed={isDressMode}
              onClick={() => handleModeChange("dress")}
            >
              DRESS
            </button>
          </div>

          {isDressMode ? (
            <ClothingSelector
              label="DRESSES"
              items={dresses}
              currentItem={currentDress}
              selectedItem={selectedDress}
              onPrev={prevDress}
              onNext={nextDress}
              onSelect={setSelectedDress}
              emptyMessage="Upload first dress"
              onEmptyAction={() => navigate("/closet")}
            />
          ) : (
            <>
              <ClothingSelector
                label="TOPS"
                items={tops}
                currentItem={currentTop}
                selectedItem={selectedTop}
                onPrev={prevTop}
                onNext={nextTop}
                onSelect={setSelectedTop}
                emptyMessage="Upload first top"
                onEmptyAction={() => navigate("/closet")}
              />
              <ClothingSelector
                label="BOTTOMS"
                items={bottoms}
                currentItem={currentBottom}
                selectedItem={selectedBottom}
                onPrev={prevBottom}
                onNext={nextBottom}
                onSelect={setSelectedBottom}
                emptyMessage="Add bottom item"
                onEmptyAction={() => navigate("/closet")}
              />
            </>
          )}
        </div>
      </div>

      {toast && (
        <div className="wardrobe-toast-stack" role="status" aria-live="polite">
          <div className={`wardrobe-toast ${toast.tone}`}>
            <strong>{toast.title}</strong>
            <span>{toast.message}</span>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => setToast(null)}
            >
              x
            </button>
          </div>
        </div>
      )}

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
