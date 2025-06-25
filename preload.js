// collect version info for footer
window.addEventListener("DOMContentLoaded", () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };
  for (const dependency of ["chrome", "node", "electron"]) {
    replaceText(`${dependency}-version`, process.versions[dependency]);
  }
});

// IPC renderer <-> main
const { contextBridge, ipcRenderer } = require("electron");

// .on for one way renderer -> main
// .invoke for two ways renderer <-> main
contextBridge.exposeInMainWorld("electronAPI", {
  // minion:
  open: (url) => ipcRenderer.send("open", url),
  opin: (url, id) => ipcRenderer.send("opin", url, id),
  shut: (workspace) => ipcRenderer.send("shut", workspace),
  // workspace:
  info: () => ipcRenderer.invoke("info"),
  save: (workspace) => ipcRenderer.send("save", workspace),
  desc: (workspace) => ipcRenderer.invoke("desc", workspace),
  load: (workspace) => ipcRenderer.send("load", workspace),
  less: (workspace) => ipcRenderer.send("less", workspace),
  dele: (workspace) => ipcRenderer.send("dele", workspace),
  list: () => ipcRenderer.invoke("list"),
  // dominion:
  quit: () => ipcRenderer.send("quit"),
});
