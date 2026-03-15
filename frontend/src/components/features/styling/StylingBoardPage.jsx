import React, { useEffect, useMemo, useRef, useState } from "react";
import "./styling-board.css";
import { authFetch } from "../../../lib/authSession";

const CATEGORIES = ["ALL", "TOPS", "BOTTOMS", "DRESSES", "SHOES", "BAGS"];

const DEFAULT_SIZE_BY_CATEGORY = {
  TOPS: 220,
  BOTTOMS: 250,
  DRESSES: 300,
  SHOES: 170,
  BAGS: 170,
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const StylingBoardPage = () => {
  const [closetItems, setClosetItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [placedItems, setPlacedItems] = useState([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState(null);

  const boardRef = useRef(null);
  const dragRef = useRef(null);
  const nextZIndexRef = useRef(10);

  useEffect(() => {
    const fetchClosetItems = async () => {
      try {
        const res = await authFetch("/closet");
        const allItems = await res.json();
        setClosetItems(Array.isArray(allItems) ? allItems : []);
      } catch (error) {
        console.error("FAILED_TO_LOAD_CLOSET", error);
        setClosetItems([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchClosetItems();
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Delete" || event.key === "Backspace") {
        if (!selectedInstanceId) return;
        setPlacedItems((prev) =>
          prev.filter((item) => item.instanceId !== selectedInstanceId),
        );
        setSelectedInstanceId(null);
      }

      if (event.key === "Escape") {
        setSelectedInstanceId(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedInstanceId]);

  const filteredLibraryItems = useMemo(() => {
    if (activeCategory === "ALL") return closetItems;
    return closetItems.filter((item) => item.category === activeCategory);
  }, [activeCategory, closetItems]);

  const selectedPlacedItem = useMemo(
    () =>
      placedItems.find((item) => item.instanceId === selectedInstanceId) ||
      null,
    [placedItems, selectedInstanceId],
  );

  const bringToFront = (instanceId) => {
    const nextZ = nextZIndexRef.current++;
    setPlacedItems((prev) =>
      prev.map((item) =>
        item.instanceId === instanceId ? { ...item, zIndex: nextZ } : item,
      ),
    );
  };

  const addItemToBoard = (item) => {
    const boardRect = boardRef.current?.getBoundingClientRect();
    const size = DEFAULT_SIZE_BY_CATEGORY[item.category] || 220;

    const baseX = boardRect ? boardRect.width / 2 - size / 2 : 160;
    const baseY = boardRect ? boardRect.height / 2 - size / 2 : 120;

    const instanceId = `placed-${item.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const nextZ = nextZIndexRef.current++;

    const newPlacedItem = {
      instanceId,
      sourceId: item.id,
      name: item.name,
      category: item.category,
      imagePath: item.image_path,
      x: Math.max(20, baseX + (Math.random() * 40 - 20)),
      y: Math.max(20, baseY + (Math.random() * 40 - 20)),
      width: size,
      aspectRatio: 1,
      rotation: 0,
      zIndex: nextZ,
    };

    setPlacedItems((prev) => [...prev, newPlacedItem]);
    setSelectedInstanceId(instanceId);
  };

  const updatePlacedItem = (instanceId, patch) => {
    setPlacedItems((prev) =>
      prev.map((item) =>
        item.instanceId === instanceId ? { ...item, ...patch } : item,
      ),
    );
  };

  const handlePointerDown = (event, item) => {
    const boardRect = boardRef.current?.getBoundingClientRect();
    if (!boardRect) return;

    event.preventDefault();

    setSelectedInstanceId(item.instanceId);
    bringToFront(item.instanceId);

    dragRef.current = {
      instanceId: item.instanceId,
      offsetX: event.clientX - boardRect.left - item.x,
      offsetY: event.clientY - boardRect.top - item.y,
      width: item.width,
      height: item.width * (item.aspectRatio || 1),
    };

    const handlePointerMove = (moveEvent) => {
      const activeDrag = dragRef.current;
      if (!activeDrag || activeDrag.instanceId !== item.instanceId) return;

      const currentBoardRect = boardRef.current?.getBoundingClientRect();
      if (!currentBoardRect) return;

      const itemWidth = activeDrag.width || item.width;
      const itemHeight = activeDrag.height || itemWidth;
      const minX = -itemWidth * 0.8;
      const maxX = currentBoardRect.width - itemWidth * 0.2;
      const minY = -itemHeight * 0.8;
      const maxY = currentBoardRect.height - itemHeight * 0.2;

      const nextX = clamp(
        moveEvent.clientX - currentBoardRect.left - activeDrag.offsetX,
        minX,
        maxX,
      );
      const nextY = clamp(
        moveEvent.clientY - currentBoardRect.top - activeDrag.offsetY,
        minY,
        maxY,
      );

      updatePlacedItem(activeDrag.instanceId, { x: nextX, y: nextY });
    };

    const handlePointerUp = () => {
      dragRef.current = null;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const rotateSelected = (delta) => {
    if (!selectedPlacedItem) return;
    updatePlacedItem(selectedPlacedItem.instanceId, {
      rotation: selectedPlacedItem.rotation + delta,
    });
  };

  const scaleSelected = (factor) => {
    if (!selectedPlacedItem) return;
    const nextWidth = clamp(selectedPlacedItem.width * factor, 90, 580);
    updatePlacedItem(selectedPlacedItem.instanceId, { width: nextWidth });
  };

  const duplicateSelected = () => {
    if (!selectedPlacedItem) return;

    const instanceId = `placed-${selectedPlacedItem.sourceId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const nextZ = nextZIndexRef.current++;

    const duplicate = {
      ...selectedPlacedItem,
      instanceId,
      x: selectedPlacedItem.x + 24,
      y: selectedPlacedItem.y + 24,
      zIndex: nextZ,
    };

    setPlacedItems((prev) => [...prev, duplicate]);
    setSelectedInstanceId(instanceId);
  };

  const removeSelected = () => {
    if (!selectedPlacedItem) return;
    setPlacedItems((prev) =>
      prev.filter((item) => item.instanceId !== selectedPlacedItem.instanceId),
    );
    setSelectedInstanceId(null);
  };

  const clearBoard = () => {
    setPlacedItems([]);
    setSelectedInstanceId(null);
  };

  const saveBoardAsPng = async () => {
    if (!boardRef.current || !placedItems.length || isSaving) return;

    setIsSaving(true);

    try {
      const boardRect = boardRef.current.getBoundingClientRect();
      const payload = {
        board_width: Math.max(1, Math.round(boardRect.width)),
        board_height: Math.max(1, Math.round(boardRect.height)),
        export_scale: 4,
        items: placedItems.map((item) => ({
          image_path: item.imagePath,
          x: item.x,
          y: item.y,
          width: item.width,
          aspect_ratio: item.aspectRatio || 1,
          rotation: item.rotation || 0,
          z_index: item.zIndex || 0,
        })),
      };

      const exportResponse = await authFetch("/export-styling-board", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!exportResponse.ok) {
        const errorPayload = await exportResponse.json().catch(() => ({}));
        throw new Error(errorPayload.detail || "EXPORT_REQUEST_FAILED");
      }

      const exportData = await exportResponse.json();
      if (!exportData?.image_url) {
        throw new Error("EXPORT_IMAGE_URL_MISSING");
      }

      const imageResponse = await fetch(exportData.image_url, {
        cache: "no-cache",
      });
      if (!imageResponse.ok) {
        throw new Error("EXPORT_IMAGE_DOWNLOAD_FAILED");
      }

      const blob = await imageResponse.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `styling-board-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("BOARD_EXPORT_FAILED", error);
      alert("SAVE FAILED. PLEASE TRY AGAIN.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="main-content styling-main-content">
      <aside className="styling-library">
        <div className="styling-library-header">
          <h2>STYLE LAB</h2>
          <p>
            Select pieces from your closet and place them on the blank canvas.
          </p>
        </div>

        <div
          className="styling-category-tabs"
          role="tablist"
          aria-label="Closet categories"
        >
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              className={`styling-category-tab ${activeCategory === category ? "is-active" : ""}`}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="styling-library-list">
          {isLoading ? (
            <div className="styling-empty-state">LOADING CLOSET…</div>
          ) : filteredLibraryItems.length ? (
            filteredLibraryItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className="styling-library-item"
                onClick={() => addItemToBoard(item)}
              >
                <img src={item.image_path} alt={item.name} />
                <div className="styling-library-item-meta">
                  <strong>{item.name || "UNTITLED ITEM"}</strong>
                  <span>{item.category}</span>
                </div>
                <span className="styling-add-badge">+ PLACE</span>
              </button>
            ))
          ) : (
            <div className="styling-empty-state">
              NO ITEMS IN THIS CATEGORY.
            </div>
          )}
        </div>
      </aside>

      <section className="styling-board-panel">
        <div className="styling-board-toolbar">
          <span>{placedItems.length} PIECE(S) ON BOARD</span>
          <div className="styling-board-toolbar-actions">
            <button
              type="button"
              onClick={saveBoardAsPng}
              disabled={!placedItems.length || isSaving}
            >
              {isSaving ? "SAVING..." : "SAVE BOARD"}
            </button>
            <button
              type="button"
              onClick={clearBoard}
              disabled={!placedItems.length}
            >
              CLEAR BOARD
            </button>
          </div>
        </div>

        <div
          className="styling-board"
          ref={boardRef}
          onPointerDown={(event) => {
            if (event.target === boardRef.current) {
              setSelectedInstanceId(null);
            }
          }}
        >
          {placedItems.map((item) => (
            <button
              key={item.instanceId}
              type="button"
              className={`styling-placed-item ${selectedInstanceId === item.instanceId ? "is-selected" : ""}`}
              style={{
                left: `${item.x}px`,
                top: `${item.y}px`,
                width: `${item.width}px`,
                transform: `rotate(${item.rotation}deg)`,
                zIndex: item.zIndex,
              }}
              onPointerDown={(event) => handlePointerDown(event, item)}
            >
              <img
                src={item.imagePath}
                alt={item.name}
                draggable={false}
                onLoad={(event) => {
                  const { naturalWidth, naturalHeight } = event.currentTarget;
                  if (!naturalWidth || !naturalHeight) return;
                  const nextRatio = naturalHeight / naturalWidth;
                  if (Math.abs((item.aspectRatio || 1) - nextRatio) < 0.001) {
                    return;
                  }

                  updatePlacedItem(item.instanceId, { aspectRatio: nextRatio });
                }}
              />
            </button>
          ))}

          {!placedItems.length && (
            <div className="styling-board-watermark">
              DROP YOUR CLOTHES HERE AND BUILD COMBINATIONS
            </div>
          )}
        </div>

        <div className="styling-controls">
          <h3>ITEM CONTROLS</h3>
          {selectedPlacedItem ? (
            <>
              <p>
                <strong>{selectedPlacedItem.name || "UNTITLED ITEM"}</strong>
                <br />
                <span>{selectedPlacedItem.category}</span>
              </p>

              <div className="styling-controls-grid">
                <button type="button" onClick={() => rotateSelected(-10)}>
                  ROTATE -
                </button>
                <button type="button" onClick={() => rotateSelected(10)}>
                  ROTATE +
                </button>
                <button type="button" onClick={() => scaleSelected(0.9)}>
                  SCALE -
                </button>
                <button type="button" onClick={() => scaleSelected(1.1)}>
                  SCALE +
                </button>
                <button type="button" onClick={duplicateSelected}>
                  DUPLICATE
                </button>
                <button
                  type="button"
                  onClick={() => bringToFront(selectedPlacedItem.instanceId)}
                >
                  BRING FRONT
                </button>
                <button
                  type="button"
                  onClick={removeSelected}
                  className="is-danger"
                >
                  DELETE ITEM
                </button>
              </div>
            </>
          ) : (
            <p>Select one placed item to edit it.</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default StylingBoardPage;
