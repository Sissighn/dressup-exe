import React, { useState, useEffect, useRef } from "react";

import ClosetHeader from "./ClosetHeader/ClosetHeader";
import CategoryRow from "./CategoryRow/CategoryRow";
import DeleteItemModal from "./DeleteItemModal/DeleteItemModal";
import UploadModal from "./UploadModal/UploadModal";
import StatusNotification from "./StatusNotification/StatusNotification";
import { authFetch } from "../../../lib/authSession";

const CATEGORIES = ["TOPS", "BOTTOMS", "SHOES", "BAGS"];

const ClosetPage = () => {
  const [items, setItems] = useState([]);
  const [uploadName] = useState("");
  const [uploadCategory, setUploadCategory] = useState("TOPS");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  const [statusMessage, setStatusMessage] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);

  const fetchCloset = async () => {
    try {
      const res = await authFetch("/closet");
      const data = await res.json();
      setItems(data);
    } catch (e) {
      console.error("FAILED_TO_LOAD_CLOSET", e);
    }
  };

  useEffect(() => {
    fetchCloset();
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewImage(URL.createObjectURL(file));
    setIsModalOpen(true);
    e.target.value = null;
  };

  const handleConfirmUpload = async (modalCategory) => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("file", selectedFile);
    const nameToUpload =
      uploadName || selectedFile.name.replace(/\.[^/.]+$/, "");
    formData.append("name", nameToUpload);
    formData.append("category", modalCategory); // ← BUG FIX, aber logisch identisch gedacht

    try {
      const response = await authFetch("/upload-item", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("UPLOAD_FAILED");

      fetchCloset();
      setIsModalOpen(false);
      setSelectedFile(null);
      setPreviewImage(null);
    } catch (error) {
      console.error("UPLOAD_ERROR:", error);
      setStatusMessage({
        type: "error",
        text: "UPLOAD FAILED. CHECK SYSTEM CONSOLE.",
      });
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      const response = await authFetch(`/delete-item/${itemToDelete}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchCloset();
        setItemToDelete(null);
      } else {
        setStatusMessage({
          type: "error",
          text: "SERVER ERROR: ACTION DENIED.",
        });
      }
    } catch (error) {
      setStatusMessage({ type: "error", text: "CONNECTION INTERRUPTED." });
    }
  };

  const fileInputRef = useRef(null);
  const getCategoryItems = (cat) => items.filter((i) => i.category === cat);
  const getDisplayedCategories = () =>
    filterCategory === "ALL" ? CATEGORIES : [filterCategory];

  return (
    <div
      className="main-content"
      style={{ display: "block", overflowY: "auto", padding: "0" }}
    >
      <StatusNotification
        message={statusMessage}
        onDismiss={() => setStatusMessage(null)}
      />

      {itemToDelete && (
        <DeleteItemModal
          onConfirm={confirmDelete}
          onCancel={() => setItemToDelete(null)}
        />
      )}

      <ClosetHeader
        uploadCategory={uploadCategory}
        onUploadCategoryChange={(e) => setUploadCategory(e.target.value)}
        filterCategory={filterCategory}
        onFilterCategoryChange={(e) => setFilterCategory(e.target.value)}
        onAddNewClick={() => fileInputRef.current.click()}
      />

      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileSelect}
        accept="image/*"
      />

      <div style={{ padding: "2rem" }}>
        {getDisplayedCategories().map((cat) => (
          <CategoryRow
            key={cat}
            category={cat}
            items={getCategoryItems(cat)}
            onDeleteClick={setItemToDelete}
          />
        ))}
      </div>

      <UploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmUpload}
        previewImage={previewImage}
        initialCategory={uploadCategory}
      />
    </div>
  );
};

export default ClosetPage;
