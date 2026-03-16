import React, { useEffect, useState } from "react";
import "../App.css";
import DeleteItemModal from "../components/features/closet/DeleteItemModal/DeleteItemModal";
import "../components/features/boards/boards.css";
import { authFetch } from "../lib/authSession";

const formatBoardDate = (value) => {
  if (!value) return "JUST SAVED";

  const parsedDate = new Date(value * 1000);
  if (Number.isNaN(parsedDate.getTime())) return "JUST SAVED";

  return parsedDate.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const Boards = () => {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  const fetchBoards = async () => {
    try {
      const res = await authFetch("/boards");
      const data = await res.json();
      setBoards(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load boards", error);
      setBoards([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoards();
  }, []);

  const handleDeleteRequest = (filename) => {
    setPendingDeleteId(filename);
  };

  const handleDeleteConfirm = async () => {
    try {
      const res = await authFetch(`/delete-board/${pendingDeleteId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setBoards((prev) =>
          prev.filter((board) => board.id !== pendingDeleteId),
        );
      }
    } catch (error) {
      console.error("Failed to delete board", error);
    } finally {
      setPendingDeleteId(null);
    }
  };

  return (
    <div className="boards-page">
      <section className="boards-hero">
        <div className="boards-hero-copy">
          <div className="boards-editorial-meta">
            <span className="boards-kicker">CURATED COMPOSITIONS</span>
            <span className="boards-meta-line">EDITION 01 / DIGITAL ARCHIVE</span>
          </div>
          <h1>STYLE BOARDS.</h1>
          <p>
            A quieter, more editorial view of your saved compositions. Review
            silhouettes, compare balance, and reopen each board in full focus.
          </p>
        </div>

        <div className="boards-hero-stats">
          <div className="boards-stat-card">
            <span className="boards-stat-label">ARCHIVED</span>
            <strong>{boards.length}</strong>
          </div>
          <div className="boards-stat-card boards-stat-card-secondary">
            <span className="boards-stat-label">FORMAT</span>
            <strong>1:1 BOARD</strong>
          </div>
        </div>
      </section>

      <section className="boards-grid-section">
        <div className="boards-section-heading">
          <span>PRIVATE SELECTION</span>
          <span>{boards.length} BOARD(S)</span>
        </div>

        {loading ? (
          <div className="boards-empty-state">LOADING BOARDS…</div>
        ) : boards.length ? (
          <div className="boards-grid">
            {boards.map((board, index) => (
              <article key={board.id} className="board-card">
                <button
                  type="button"
                  className="board-delete-button"
                  onClick={() => handleDeleteRequest(board.id)}
                  aria-label="Delete board"
                >
                  ✕
                </button>

                <button
                  type="button"
                  className="board-preview"
                  onClick={() => window.open(board.url, "_blank")}
                >
                  <img src={board.url} alt={`Board ${index + 1}`} />
                  <div className="board-preview-overlay">
                    <span>OPEN BOARD</span>
                  </div>
                </button>

                <div className="board-card-footer">
                  <div>
                    <span className="board-card-label">BOARD {index + 1}</span>
                    <strong>{formatBoardDate(board.date)}</strong>
                    <p className="board-card-caption">
                      Square styling composition archived from the lab.
                    </p>
                  </div>
                  <span className="board-card-format">SQUARE</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="boards-empty-state boards-empty-state-large">
            <span className="boards-empty-kicker">BOARD ARCHIVE EMPTY</span>
            <h2>NO STYLE BOARDS SAVED YET.</h2>
            <p>
              Archive a composition from the Styling Lab and it will appear here
              as a square board tile.
            </p>
          </div>
        )}
      </section>

      {pendingDeleteId && (
        <DeleteItemModal
          onConfirm={handleDeleteConfirm}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
    </div>
  );
};

export default Boards;
