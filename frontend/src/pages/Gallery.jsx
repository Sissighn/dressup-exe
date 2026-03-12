import React, { useState, useEffect } from "react";
import "../App.css";
import GalleryHeader from "../components/features/gallery/GalleryHeader";
import GalleryGrid from "../components/features/gallery/GalleryGrid";
import DeleteItemModal from "../components/features/closet/DeleteItemModal/DeleteItemModal";
import "../components/features/gallery/gallery.css";

const Gallery = () => {
  const [looks, setLooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const fetchGallery = async () => {
    try {
      const res = await fetch("http://localhost:8000/gallery");
      const data = await res.json();
      setLooks(data);
    } catch (e) {
      console.error("Failed to load gallery", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGallery();
  }, []);

  const handleDeleteRequest = (filename) => {
    setPendingDeleteId(filename);
  };

  const handleDeleteConfirm = async () => {
    try {
      const res = await fetch(
        `http://localhost:8000/delete-look/${pendingDeleteId}`,
        { method: "DELETE" },
      );
      if (res.ok) setLooks(looks.filter((l) => l.id !== pendingDeleteId));
    } catch (e) {
      console.error("ERROR.");
    } finally {
      setPendingDeleteId(null);
    }
  };

  const handleDeleteCancel = () => {
    setPendingDeleteId(null);
  };

  return (
    <div className="gallery-page-container">
      <GalleryHeader assetCount={looks.length} />
      <GalleryGrid
        loading={loading}
        looks={looks}
        onDelete={handleDeleteRequest}
      />
      {pendingDeleteId && (
        <DeleteItemModal
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}
    </div>
  );
};

export default Gallery;
