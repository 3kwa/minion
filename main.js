// CLI
const { program } = require("commander");
// set by the parser if a command need to be executed once dominion is up
var EMIT = null;
program.name("minion");
// the main reason this exists in the first place (people are lazy :P)
// automate everything so noone has to understand anything
program
  .command("load <workspace>")
  .description("load <workspace>")
  .action((workspace) => {
    EMIT = ["load", workspace];
  });
program
  .command("less <workspace>")
  .description("load <workspace> in frameless mode")
  .action((workspace) => {
    EMIT = ["less", workspace];
  });

program.exitOverride();
try {
  // silencing the auto help output on parse failure
  _was = process.stderr.write;
  process.stderr.write = (str) => {};
  program.parse();
  process.stderr.write = _was;
} catch (err) {
  var error = true;
  // not perfect
  if (process.argv.at(process.argv.length - 1) === "help") process.exit(0);
  // dev simple start
  if (
    process.argv.at(process.argv.length - 1) === "." &&
    process.argv.length == 2
  ) {
    error = false;
  }
  // release simple start
  if (
    // MacOS
    (process.argv.at(process.argv.length - 1).endsWith("minion") ||
      // Windows
      process.argv.at(process.argv.length - 1).endsWith("minion.exe")) &&
    process.argv.length == 1
  ) {
    error = false;
  }
  if (error) {
    program.outputHelp();
    process.exit(0);
  }
}

const log = require("electron-log/main");
// to get __electronLog in renderer
log.initialize();
log.info("minion starting");

const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const path = require("path");
const fs = require("fs");

// History

const goBack = () => {
  BrowserWindow.getFocusedWindow().webContents.navigationHistory.goBack();
};

const goForward = () => {
  BrowserWindow.getFocusedWindow().webContents.navigationHistory.goForward();
};

// Global variable to track the visibility state of the draggable div
let isMoveEnabled = false;

const toggleDraggableComponent = () => {
  isMoveEnabled = !isMoveEnabled; // Toggle the move state
  const minions = BrowserWindow.getAllWindows();
  minions.forEach((minion) => {
    if (minion.hasFrame !== undefined && !minion.hasFrame) {
      if (isMoveEnabled) {
        minion.webContents.insertCSS(`
              .draggable {
                display: block !important;
              }
            `);
      } else {
        minion.webContents.insertCSS(`
              .draggable {
                display: none !important;
              }
            `);
      }
    }
  });
};

const doMinion = () => {
  const dominion = new BrowserWindow({
    width: 800,
    height: isMac ? 600 : 625,
    resizable: false,
    movable: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });
  dominion.loadFile("renderer.html");
  return dominion;
};

const isMac = process.platform === "darwin";

const template = [
  // app menu
  ...(isMac
    ? [
        {
          label: app.name,
          submenu: [
            { role: "about" },
            { type: "separator" },
            { role: "hide" },
            { role: "hideOthers" },
            { role: "unhide" },
            { type: "separator" },
            { role: "quit" },
          ],
        },
      ]
    : []),
  // edit
  {
    label: "edit",
    submenu: [
      { role: "undo" },
      { role: "redo" },
      { type: "separator" },
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
    ],
  },
  // view
  {
    label: "view",
    submenu: [
      { role: "reload" },
      { role: "forceReload" },
      { role: "toggleDevTools" },
      { type: "separator" },
      { role: "resetZoom" },
      { role: "zoomIn" },
      { role: "zoomOut" },
    ],
  },
  // browse
  {
    label: "browse",
    submenu: [
      { label: "back", click: goBack, accelerator: "Command+[", visible: true },
      {
        label: "forward",
        click: goForward,
        accelerator: "Command+]",
        visible: true,
      },
    ],
  },
  // window
  {
    label: "window",
    submenu: [
      { role: "minimize" },
      { role: "close" },
      { type: "separator" },
      {
        label: "toggle move",
        click: toggleDraggableComponent,
        accelerator: "CommandOrControl+Shift+M",
        visible: true,
      },
      { type: "separator" },
      {
        label: "dominion",
        click: () => {
          BrowserWindow.fromId(parseInt(process.env.DOMINION_ID)).show();
        },
        accelerator: "CommandOrControl+D",
      },
    ],
  },
];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);

app.whenReady().then(() => {
  DOMINION = doMinion();
  // saving the id so we don't save the dominion window
  process.env.DOMINION_ID = DOMINION.id;
  // closing the dominion window => quit
  DOMINION.on("close", () => {
    log.info("dominion stopping");
    quit();
  });

  // minion:
  ipcMain.on("open", (event, url) => {
    open(url);
  });
  ipcMain.on("shut", (event, workspace) => {
    shut(workspace);
  });
  // workspace:
  ipcMain.handle("info", info);
  ipcMain.on("save", (event, workspace) => {
    save(workspace);
  });
  ipcMain.handle("desc", desc);
  ipcMain.on("load", (event, workspace) => {
    load(workspace);
  });
  ipcMain.on("less", (event, workspace) => {
    less(workspace);
  });
  ipcMain.on("dele", (event, workspace) => {
    dele(workspace);
  });
  ipcMain.handle("list", list);
  // dominion:
  ipcMain.on("quit", (event) => {
    quit();
  });

  // EMIT set by the CLI parser
  if (EMIT !== null) {
    ipcMain.emit(EMIT.at(0), "", EMIT.at(1));
  }
});

app.on("quit", () => {
  log.info("minion stopping");
});

const open = (url, frame = true) => {
  const minion = new BrowserWindow({
    width: 400,
    height: 300,
    frame: frame,
    roundedCorners: frame,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true,
    },
  });

  minion["url"] = url;
  minion["hasFrame"] = frame;

  let htmlContent = `
        <html>
        <head>
            <style>
                .draggable {
                    -webkit-app-region: drag;
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: repeating-linear-gradient(
                      45deg,
                      transparent,
                      transparent 10px,
                      rgba(0, 0, 0, 0.2) 10px,
                      rgba(0, 0, 0, 0.2) 20px
                    );
                    display: none;
                    text-align:center
                }
                body {
                    margin: 0;
                }
                webview {
                    width: 100%;
                    height: 100%;
                }
            </style>
        </head>
        <body>
            <div class='draggable'>
            </div>
            <webview src='${url}' style='height:calc(100%);border:none;'></webview>
        </body>
        </html>`;

  // minion.loadURL(`data:text/html,${encodeURIComponent(htmlContent)}`);
  minion.loadURL(url);
  minion.webContents.on("did-finish-load", () => {
    minion.webContents.insertCSS(`
      .minion_draggable {
        -webkit-app-region: drag;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: repeating-linear-gradient(
          45deg,
          transparent,
          transparent 10px,
          rgba(0, 0, 0, 0.2) 10px,
          rgba(0, 0, 0, 0.2) 20px
        );
        display: none;
        text-align:center
    }`);
    console.log("maybe !!!");
  });
  minion.webContents.on("will-prevent-unload", (event) => {
    event.preventDefault();
  });

  return minion;
};

const shut = (workspace) => {
  let minions = BrowserWindow.getAllWindows();
  if (workspace.toLowerCase() != "all") {
    minions = minions.filter((e) => e.workspace === workspace);
  }
  minions.forEach((minion) => {
    if (minion.id != parseInt(process.env.DOMINION_ID)) {
      minion.close();
    }
  });
  isMoveEnabled = false; // reset move enabled
};

const info = () => {
  var list = [];
  const minions = BrowserWindow.getAllWindows();
  minions.forEach((minion, index) => {
    var url = minion.url;
    if (minion.id != parseInt(process.env.DOMINION_ID)) {
      list.push(url);
    }
  });
  return list;
};

const save = (workspace) => {
  const data = app.getPath("userData");
  const workspaces = path.join(data, "workspaces");
  if (!fs.existsSync(workspaces)) {
    fs.mkdirSync(workspaces);
  }
  const filePath = path.join(data, "workspaces", `${workspace}.json`);
  var list = [];
  const minions = BrowserWindow.getAllWindows().filter(
    (minion) => minion.id !== parseInt(process.env.DOMINION_ID),
  );

  // Use a counter to handle asynchronous execution
  let counter = minions.length;

  minions.forEach((minion) => {
    // Set workspace attribute so minion is shut-able
    minion.workspace = workspace;
    // Execute JavaScript inside each webview to get the URL and scroll positions
    minion.webContents
      .executeJavaScript(
        `
            document.querySelector('webview').executeJavaScript("Promise.resolve({ url: location.href, scrollX: window.scrollX, scrollY: window.scrollY })")
        `,
      )
      .then((result) => {
        var data = {
          id: minion.id,
          url: result.url, // URL from within the webview
          x: minion.getPosition()[0],
          y: minion.getPosition()[1],
          width: minion.getSize()[0],
          height: minion.getSize()[1],
          zoomFactor: minion.webContents.getZoomFactor(),
          scrollX: result.scrollX,
          scrollY: result.scrollY,
        };
        list.push(data);

        // Decrement counter and write to file when all windows are processed
        counter--;
        if (counter === 0) {
          fs.writeFileSync(filePath, JSON.stringify(list));
        }
      })
      .catch((err) => {
        console.error("Error retrieving webview data: ", err);
        counter--;
      });
  });
};

// not a .on but a .handle, first argument is event
const desc = (event, workspace) => {
  const data = app.getPath("userData");
  const filePath = path.join(data, "workspaces", `${workspace}.json`);
  var list = [];
  if (fs.existsSync(filePath)) {
    var json = JSON.parse(fs.readFileSync(filePath));
    json.forEach((data) => {
      list.push(data.url);
    });
  }
  return list;
};

const _load = (workspace, frame) => {
  const data = app.getPath("userData");
  const filePath = path.join(data, "workspaces", `${workspace}.json`);
  if (fs.existsSync(filePath)) {
    var json = JSON.parse(fs.readFileSync(filePath));
    json.forEach((data) => {
      var minion = open(data.url, frame);
      minion.workspace = workspace; // store workspace name
      minion.setPosition(data.x, data.y, false);
      minion.setSize(data.width, data.height, false);

      // Set scroll positions after the webview has finished loading
      minion.webContents.once("did-finish-load", () => {
        minion.webContents
          .executeJavaScript(
            `
                    document.querySelector('webview').executeJavaScript("window.scrollTo(${
                      data.scrollX || 0
                    }, ${data.scrollY || 0})")
                `,
          )
          .catch((err) => {
            console.error("Error setting scroll position: ", err);
          });
      });
    });
  }
};

const load = (workspace) => {
  _load(workspace, true);
};
const less = (workspace) => {
  _load(workspace, false);
};

const dele = (workspace) => {
  const data = app.getPath("userData");
  const filePath = path.join(data, "workspaces", `${workspace}.json`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

const list = () => {
  const data = app.getPath("userData");
  const workspaces = path.join(data, "workspaces");
  if (!fs.existsSync(workspaces)) {
    return [];
  }
  var list = [];
  fs.readdirSync(workspaces).forEach((file) => {
    list.push(path.parse(file).name);
  });
  return list;
};

const quit = () => {
  app.quit();
};
