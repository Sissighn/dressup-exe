import React, { useState, useEffect, useRef } from "react";
import "../components/features/closet/closet.css";
import ClosetHeader from "../components/features/closet/ClosetHeader/ClosetHeader";
import CategoryRow from "../components/features/closet/CategoryRow/CategoryRow";
import DeleteItemModal from "../components/features/closet/DeleteItemModal/DeleteItemModal";
import UploadModal from "../components/features/closet/UploadModal/UploadModal";
import StatusNotification from "../components/features/closet/StatusNotification/StatusNotification";

const CATEGORIES = ["TOPS", "BOTTOMS", "SHOES", "BAGS"];

const Closet = () => {
  const [items, setItems] = useState([]);
  const [uploadName, setUploadName] = useState("");
  const [uploadCategory, setUploadCategory] = useState("TOPS");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  const [statusMessage, setStatusMessage] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);

  const fetchCloset = async () => {
    try {
      const res = await fetch("http://localhost:8000/closet");
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
    formData.append("category", modalCategory);

    try {
      const response = await fetch("http://localhost:8000/upload-item", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("UPLOAD_FAILED");

      fetchCloset();
      setIsModalOpen(false);
      setSelectedFile(null);
      setPreviewImage(null);
      setUploadName("");
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
      const response = await fetch(
        `http://localhost:8000/delete-item/${itemToDelete}`,
        {
          method: "DELETE",
        },
      );
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

  return (
    <div
      className="main-content"
      style={{ display: "block", overflowY: "auto", padding: "0" }} // Behält das Layout bei
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
        uploadName={uploadName}
        onUploadNameChange={(e) => setUploadName(e.target.value)}
        uploadCategory={uploadCategory}
        onUploadCategoryChange={(e) => setUploadCategory(e.target.value)}
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
        {CATEGORIES.map((cat) => (
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

export default Closet;
