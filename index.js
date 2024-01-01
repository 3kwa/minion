const { app, BrowserWindow, ipcMain} = require('electron')
const path = require('path')
const fs = require('fs')

const doMinion = () => {
  const dominion = new BrowserWindow({
    width: 800,
    height: 600,
    resizable: false,
    movable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    },
  })
  dominion.loadFile('index.html')
}

app.whenReady().then(() => {
  ipcMain.on('quit', (event) => {
    app.quit()
  })
  ipcMain.on('open', (event, url) => {
    open(url)
  })
  ipcMain.on('save', (event, workspace) => {
    save(workspace)
  })
  ipcMain.handle('list', list)
  doMinion()

  app.on('activate', () => {
    // macOS ...
    if (BrowserWindow.getAllWindows().length === 0) doMinion()
  })
})

app.on('window-all-closed', () => {
  // macOS ...
  if (process.platform !== 'darwin') app.quit()
})

const open = (url) => {
  const minion = new BrowserWindow({
    width: 400,
    height: 300,
  })
  minion.loadURL(url)
}

const save = (workspace) => {
    const data = app.getPath('userData')
    const workspaces = path.join(data, 'workspaces')
    if (!fs.existsSync(workspaces)){
        fs.mkdirSync(workspaces);
    }
    const filePath = path.join(data, 'workspaces', `${workspace}.json`)
    console.log(filePath)
    var list = []
    const minions = BrowserWindow.getAllWindows();
    minions.forEach((minion, index) => {
        var data = {
            id: minion.id,
            url: minion.webContents.getURL(),
            x: minion.getPosition()[0],
            y: minion.getPosition()[1],
            width: minion.getSize()[0],
            height: minion.getSize()[1],
            zoomFactor: minion.webContents.getZoomFactor(),
        }
        list.push(data)
    })
    fs.writeFileSync(filePath, JSON.stringify(list));
}

const list = () => {
    const data = app.getPath('userData')
    const workspaces = path.join(data, 'workspaces')
    if (!fs.existsSync(workspaces)){
        return []
    }
    var list = []
    fs.readdirSync(workspaces).forEach(file => {
        list.push(path.parse(file).name)
    })
    return list
}
