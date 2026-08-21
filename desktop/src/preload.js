const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("dressupSetup", {
  getCurrentKey: () => ipcRenderer.invoke("setup:current-key"),
  submit: (apiKey) => ipcRenderer.invoke("setup:submit", apiKey),
});
