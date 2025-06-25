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
const { Minion } = require("./minion.js");
const path = require("path");
const fs = require("fs");

// History

const goBack = () => {
  Minion.getFocusedMinion().webContents.navigationHistory.goBack();
};

const goForward = () => {
  Minion.getFocusedMinion().webContents.navigationHistory.goForward();
};

const toggleLocation = () => {
  const minion = Minion.getFocusedMinion();
  minion.webContents.executeJavaScript(`
    var visible = document.querySelector('#minion_location').style.display === 'block';
    var input = document.querySelector('#minion_location input');
    if (!visible) {
      document.querySelector('#minion_location').style.display = 'block';
      input.value = location.href;
      input.focus();
      input.select();
    } else {
      input.blur();
      document.querySelector('#minion_location').style.display = 'none';
    }
  `);
};

// Global variable to track the visibility state of the draggable div
let isMoveEnabled = false;

const toggleDraggableComponent = () => {
  isMoveEnabled = !isMoveEnabled; // Toggle the move state
  const minions = Minion.getAllMinions();
  minions.forEach((minion) => {
    if (minion.hasFrame !== undefined && !minion.hasFrame) {
      if (isMoveEnabled) {
        minion.webContents.insertCSS(`
              #minion_draggable {
                display: block !important;
              }
            `);
      } else {
        minion.webContents.insertCSS(`
              #minion_draggable {
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
      {
        label: "location",
        click: toggleLocation,
        accelerator: "CommandOrControl+L",
        visible: true,
      },
      { type: "separator" },
      {
        label: "back",
        click: goBack,
        accelerator: "CommandOrControl+[",
        visible: true,
      },
      {
        label: "forward",
        click: goForward,
        accelerator: "CommandOrControl+]",
        visible: true,
      },
      { type: "separator" },
      { role: "reload" },
      { role: "forceReload" },
      { role: "toggleDevTools" },
      { type: "separator" },
      { role: "resetZoom" },
      { role: "zoomIn" },
      { role: "zoomOut" },
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
  const minion = new Minion({
    width: 400,
    height: 300,
    frame: frame,
    roundedCorners: frame,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webviewTag: true,
      allowRunningInsecureContent: true,
    },
  });

  minion["hasFrame"] = frame;

  minion.loadURL(url);
  minion.webContents.on("did-finish-load", () => {
    minion.webContents.executeJavaScript(`
  const draggableDiv = document.createElement('div');
  draggableDiv.id = 'minion_draggable';
  draggableDiv.style.cssText = \`
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
    text-align: center;
    z-index: 1000000;
  \`;
  document.body.appendChild(draggableDiv);
  // Create and add the location div with URL input
  const locationDiv = document.createElement('div');
  locationDiv.id = 'minion_location';
  locationDiv.style.cssText = \`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    padding: 5px;
    background: white;
    display: none;
    z-index: 1000001;
    -webkit-app-region: no-drag;
  \`;

  const urlInput = document.createElement('input');
  urlInput.type = 'text';
  urlInput.value = window.location.href;
  urlInput.style.cssText = \`
    width: 100%;
    padding: 5px;
    border: 1px solid #ccc;
    border-radius: 3px;
    -webkit-app-region: no-drag;
  \`;

  urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      let url = urlInput.value;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      window.location.href = url;
    }
  });

  locationDiv.appendChild(urlInput);
  document.body.appendChild(locationDiv);`);
  });
  minion.webContents.on("will-prevent-unload", (event) => {
    event.preventDefault();
  });
  return minion;
};

const shut = (workspace) => {
  let minions = Minion.getAllMinions();
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
  const minions = Minion.getAllMinions();
  minions.forEach((minion, index) => {
    var url = minion.webContents.getURL();
    list.push({
      id: minion.id,
      urls: [url],
    });
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
  const minions = Minion.getAllMinions().filter(
    (minion) => minion.id !== parseInt(process.env.DOMINION_ID),
  );

  // Use a counter to handle asynchronous execution
  let counter = minions.length;

  minions.forEach((minion) => {
    // set workspace attribute so minion is shut-able
    minion.workspace = workspace;
    // execute JavaScript inside each minion to get the URL and scroll positions
    minion.webContents
      .executeJavaScript(
        `Promise.resolve({ url: location.href, scrollX: window.scrollX, scrollY: window.scrollY })`,
      )
      .then((result) => {
        var data = {
          id: minion.id,
          url: result.url,
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
          fs.writeFileSync(filePath, JSON.stringify(list, null, 2));
        }
      })
      .catch((err) => {
        console.error("Error retrieving data: ", err);
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

      // set scroll positions
      minion.webContents.once("did-finish-load", () => {
        minion.webContents
          .executeJavaScript(
            `window.scrollTo(${data.scrollX || 0}, ${data.scrollY || 0})`,
          )
          .catch((err) => {
            console.error("error setting scroll position: ", err);
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
