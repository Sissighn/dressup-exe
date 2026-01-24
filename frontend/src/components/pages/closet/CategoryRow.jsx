import React from "react";

const CategoryRow = ({ category, items, onDeleteClick }) => {
  const categoryIndex =
    ["TOPS", "BOTTOMS", "SHOES", "BAGS"].indexOf(category) + 1;

  return (
    <div style={{ marginBottom: "3rem" }}>
      <h3
        style={{
          borderBottom: "1px solid black",
          paddingBottom: "5px",
          marginBottom: "15px",
        }}
      >
        0{categoryIndex} / {category}
      </h3>
      <div
        style={{
          display: "flex",
          gap: "30px",
          overflowX: "auto",
          paddingBottom: "20px",
          whiteSpace: "nowrap",
        }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              position: "relative",
              minWidth: "160px",
              height: "160px",
              border: "2px solid black",
              padding: "10px",
              background: "white",
              boxShadow: "6px 6px 0px black",
            }}
          >
            <button
              onClick={() => onDeleteClick(item.id)}
              style={{
                position: "absolute",
                top: "6px",
                right: "5px",
                width: "15px",
                height: "23px",
                fontSize: "10px",
                background: "white",
                color: "black",
                border: "1px solid black",
                cursor: "pointer",
                fontWeight: "bold",
                zIndex: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              X
            </button>
            <img
              src={item.image_path}
              alt={item.name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryRow;
