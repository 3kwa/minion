window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const dependency of ['chrome', 'node', 'electron']) {
    replaceText(`${dependency}-version`, process.versions[dependency])
  }
})

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // minion:
  open: (url) => ipcRenderer.send('open', url),
  // workspace:
  info: () => ipcRenderer.invoke('info'),
  save: (workspace) => ipcRenderer.send('save', workspace),
  desc: (workspace) => ipcRenderer.invoke('desc', workspace),
  load: (workspace) => ipcRenderer.send('load', workspace),
  dele: (workspace) => ipcRenderer.send('dele', workspace),
  list: () => ipcRenderer.invoke('list'),
  // dominion:
  quit: () => ipcRenderer.send('quit'),
})
