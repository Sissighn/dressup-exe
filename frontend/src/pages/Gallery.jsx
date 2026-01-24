import React, { useState, useEffect } from "react";
import "../App.css";
import GalleryHeader from "../components/pages/gallery/GalleryHeader";
import GalleryGrid from "../components/pages/gallery/GalleryGrid";

const Gallery = () => {
  const [looks, setLooks] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const handleDelete = async (filename) => {
    if (!window.confirm("PERMANENTLY DELETE THIS ASSET?")) return;
    try {
      const res = await fetch(`http://localhost:8000/delete-look/${filename}`, {
        method: "DELETE",
      });
      if (res.ok) setLooks(looks.filter((l) => l.id !== filename));
    } catch (e) {
      alert("ERROR.");
    }
  };

  return (
    <div className="gallery-page-container">
      <GalleryHeader assetCount={looks.length} />
      <GalleryGrid loading={loading} looks={looks} onDelete={handleDelete} />
    </div>
  );
};

export default Gallery;
