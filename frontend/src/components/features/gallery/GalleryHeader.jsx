import React from "react";
import styles from "./GalleryHeader.module.css";

const GalleryHeader = ({
  assetCount,
  title = "THE LOOKBOOK.",
  countLabel = "ASSETS",
}) => {
  return (
    <div className={styles.header}>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.statusPill}>
        {countLabel}: {assetCount}
      </div>
    </div>
  );
};

export default GalleryHeader;
