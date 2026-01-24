import React from "react";
import styles from "./GalleryHeader.module.css";

const GalleryHeader = ({ assetCount }) => {
  return (
    <div className={styles.header}>
      <h1 className={styles.title}>THE LOOKBOOK.</h1>
      <div className={styles.statusPill}>ASSETS: {assetCount}</div>
    </div>
  );
};

export default GalleryHeader;
