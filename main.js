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
    dominion.loadFile('renderer.html')
}

app.whenReady().then(() => {
    // minion:
    ipcMain.on('open', (event, url) => {
        open(url)
     })
    // workspace:
    ipcMain.handle('info', info)
    ipcMain.on('save', (event, workspace) => {
        save(workspace)
    })
    ipcMain.handle('desc', desc)
    ipcMain.on('load', (event, workspace) => {
        load(workspace)
    })
    ipcMain.on('dele', (event, workspace) => {
        dele(workspace)
    })
    ipcMain.handle('list', list)
    // dominion:
    ipcMain.on('quit', (event) => {
        app.quit()
     })
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
    return minion
}

const info = () => {
    var list = []
    const minions = BrowserWindow.getAllWindows();
    minions.forEach((minion, index) => {
        var url = minion.webContents.getURL();
        if (!url.endsWith("minion/renderer.html")) { list.push(url) }
    })
    return list
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
        if (!data.url.endsWith("minion/renderer.html")) { list.push(data) }
    })
    fs.writeFileSync(filePath, JSON.stringify(list));
}

// not a .on but a .handle, first argument is event
const desc = (event, workspace) => {
    const data = app.getPath('userData')
    const filePath = path.join(data, 'workspaces', `${workspace}.json`)
    var list = []
    if (fs.existsSync(filePath)){
        var json = JSON.parse(fs.readFileSync(filePath));
        json.forEach((data) => {
            list.push(data.url)
        })
    }
    return list
}

const load = (workspace) => {
    const data = app.getPath('userData')
    const filePath = path.join(data, 'workspaces', `${workspace}.json`)
    if (fs.existsSync(filePath)){
        var json = JSON.parse(fs.readFileSync(filePath));
        json.forEach((data) => {
            var minion = open(data.url)
            minion.setPosition(data.x, data.y, true)
            minion.setSize(data.width, data.height, true)
        })
    }
}

const dele = (workspace) => {
    const data = app.getPath('userData')
    const filePath = path.join(data, 'workspaces', `${workspace}.json`)
    if (fs.existsSync(filePath)){
        fs.unlinkSync(filePath)
    }
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
