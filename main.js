const log = require('electron-log/main')
// to get __electronLog in renderer
log.initialize()
log.info("minion starting")

const { app, BrowserWindow, ipcMain, Menu } = require('electron')
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
    return dominion
}

const isMac = process.platform === 'darwin'

const template = [
    // app menu
    ...(isMac
        ? [{
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' }
            ]
          }]
        : []),
    // view
    {
        label: 'view',
        submenu: [
            { role: 'reload' },
            { role: 'forceReload' },
            { role: 'toggleDevTools' },
            { type: 'separator' },
            { role: 'resetZoom' },
            { role: 'zoomIn' },
            { role: 'zoomOut'}
        ]
    },
    // window
    {
        label: 'window',
        submenu: [
            { role: 'minimize' },
            { role: 'close' },
            { type: 'separator' },
            {
                label: 'dominion',
                click: () => {
                    BrowserWindow.fromId(parseInt(process.env.DOMINION_ID)).show()
                },
                accelerator: 'CommandOrControl+D',
            }
        ]
    }
]

const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)

app.whenReady().then(() => {
    // minion:
    ipcMain.on('open', (event, url) => {
        open(url)
     })
    ipcMain.on('shut', (event) => {
        shut()
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
    ipcMain.on('less', (event, workspace) => {
        less(workspace)
    })
    ipcMain.on('dele', (event, workspace) => {
        dele(workspace)
    })
    ipcMain.handle('list', list)
    // dominion:
    ipcMain.on('quit', (event) => {
        quit()
     })
    var dominion = doMinion()
    // saving the id so we don't save the dominion window
    process.env.DOMINION_ID = dominion.id
    // closing the dominion window => quit
    dominion.on('close', () => {
        log.info("dominion stopping")
        quit()
    })
})

app.on('quit', () => {
    log.info("minion stopping")
})

const open = (url, frame=true) => {
    const minion = new BrowserWindow({
        width: 400,
        height: 300,
        frame: frame,
        roundedCorners: frame,
    })
    minion.loadURL(url)
    // handling pages with beforeunload preventing close
    minion.webContents.on('will-prevent-unload', (event) => {
        event.preventDefault()
    })
    return minion
}

const shut = () => {
    const minions = BrowserWindow.getAllWindows();
    minions.forEach((minion) => {
        if (minion.id != parseInt(process.env.DOMINION_ID)) { minion.close() }
    })
}

const info = () => {
    var list = []
    const minions = BrowserWindow.getAllWindows();
    minions.forEach((minion, index) => {
        var url = minion.webContents.getURL();
        if (minion.id != parseInt(process.env.DOMINION_ID)) { list.push(url) }
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
    var list = []
    const minions = BrowserWindow.getAllWindows().filter((minion) => minion.id !== parseInt(process.env.DOMINION_ID));

    // Use a counter to handle asynchronous execution
    let counter = minions.length;

    minions.forEach((minion) => {
        // Execute JavaScript to get scroll positions
        minion.webContents.executeJavaScript("Promise.resolve({scrollX: window.scrollX, scrollY: window.scrollY})").then((scrollPos) => {
                var data = {
                id: minion.id,
                url: minion.webContents.getURL(),
                x: minion.getPosition()[0],
                y: minion.getPosition()[1],
                width: minion.getSize()[0],
                height: minion.getSize()[1],
                zoomFactor: minion.webContents.getZoomFactor(),
                scrollX: scrollPos.scrollX,
                scrollY: scrollPos.scrollY
                };
                list.push(data);

                // Decrement counter and write to file when all windows are processed
                counter--;
                if (counter === 0) {
                fs.writeFileSync(filePath, JSON.stringify(list));
                }
        });
    });
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

const _load = (workspace, frame) => {
    const data = app.getPath('userData')
    const filePath = path.join(data, 'workspaces', `${workspace}.json`)
    if (fs.existsSync(filePath)){
        var json = JSON.parse(fs.readFileSync(filePath));
        json.forEach((data) => {
            var minion = open(data.url, frame)
            minion.setPosition(data.x, data.y, false)
            minion.setSize(data.width, data.height, false)
            // Only set scroll positions if they exist for backwards compatibility
            if (data.scrollX || data.scrollY) minion.webContents.once('did-finish-load', () => {
                minion.webContents.executeJavaScript(`window.scrollTo(${data.scrollX || 0}, ${data.scrollY || 0})`);
            });
        })
    }
}

const load = (workspace) => { _load(workspace, true) }
const less = (workspace) => { _load(workspace, false) }

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

const quit = () => {
    app.quit()
}
