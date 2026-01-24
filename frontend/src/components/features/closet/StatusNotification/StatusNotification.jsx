import React from "react";
import styles from "./StatusNotification.module.css";

const StatusNotification = ({ message, onDismiss }) => {
  if (!message || message.type !== "error") return null;

  return (
    <div className={styles.wrapper}>
      <span className={styles.text}>ERROR: {message.text}</span>
      <button onClick={onDismiss} className={styles.button}>
        DISMISS
      </button>
    </div>
  );
};

export default StatusNotification;
