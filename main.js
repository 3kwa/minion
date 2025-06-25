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

// global variable to track the visibility state of the draggable div
let isMoveEnabled = false;

const toggleDraggableComponent = () => {
  isMoveEnabled = !isMoveEnabled; // toggle the move state
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
      ...(isMac
        ? [
            { role: 'pasteAndMatchStyle' },
            { role: 'delete' },
            { role: 'selectAll' },
            { type: 'separator' },
            {
              label: 'Speech',
              submenu: [
                { role: 'startSpeaking' },
                { role: 'stopSpeaking' }
              ]
            }
          ]
        : [
            { role: 'delete' },
            { type: 'separator' },
            { role: 'selectAll' }
          ])
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
      {
        label: "next tab",
        click: () => {
          const focusedMinion = Minion.getFocusedMinion();
          if (focusedMinion) {
            focusedMinion.switchToNextView();
          }
        },
        accelerator: "Control+Tab",
        visible: true,
      },
      {
        label: "close tab",
        click: () => {
          const focusedMinion = Minion.getFocusedMinion();
          if (focusedMinion) {
            focusedMinion.closeCurrentTab();
          }
        },
        accelerator: "Control+W",
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
  ipcMain.on("opin", (event, url, id) => {
    opin(url, id);
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
  // creating a snapshot because close modifies Minion.#instance - shut all problem fix
  let minions = [...Minion.getAllMinions()];
  if (workspace.toLowerCase() != "all") {
    minions = minions.filter((e) => e.workspace === workspace);
  }
  minions.forEach((minion) => {
    minion.close();
  });
  isMoveEnabled = false; // reset move enabled
};

const opin = (url, id) => {
  const minion = Minion.findMinionById(id);
  if (minion) {
    minion._addView();
    minion.loadURL(url);
  } else {
    console.error(`Minion with id ${id} not found`);
  }
};

const info = () => {
  var list = [];
  const minions = Minion.getAllMinions();
  minions.forEach((minion, index) => {
    var urls = minion.views.map((view) => view.webContents.getURL());
    list.push({
      id: minion.id,
      urls: urls,
    });
  });
  return list;
};

const save = async (workspace) => {
  const data = app.getPath("userData");
  const workspaces = path.join(data, "workspaces");
  if (!fs.existsSync(workspaces)) {
    fs.mkdirSync(workspaces);
  }
  const filePath = path.join(data, "workspaces", `${workspace}.json`);
  const minions = Minion.getAllMinions();

  const minionPromises = minions.map(async (minion) => {
    // set workspace attribute so minion is shut-able
    minion.workspace = workspace;

    // collect data from each view
    const viewPromises = minion.views.map(async (view) => {
      try {
        const result = await view.webContents.executeJavaScript(
          `Promise.resolve({ url: location.href, scrollX: window.scrollX, scrollY: window.scrollY })`,
        );

        return {
          url: result.url,
          scrollX: result.scrollX,
          scrollY: result.scrollY,
          zoomFactor: view.webContents.getZoomFactor(),
        };
      } catch (err) {
        console.error("Error retrieving view data: ", err);
      }
    });

    const views = await Promise.all(viewPromises);

    return {
      id: minion.id,
      x: minion.getPosition()[0],
      y: minion.getPosition()[1],
      width: minion.getSize()[0],
      height: minion.getSize()[1],
      activeViewIndex: minion.activeViewIndex,
      views: views,
    };
  });

  try {
    const list = await Promise.all(minionPromises);
    fs.writeFileSync(filePath, JSON.stringify(list, null, 2));
  } catch (err) {
    console.error("Error saving workspace: ", err);
  }
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

// detect workspace file format
const detectWorkspaceFormat = (data) => {
  if (!data || data.length === 0) return "empty";

  const firstMinion = data[0];
  // new format has 'views' array and 'activeViewIndex'
  // old format has 'url' property directly on minion object
  if (
    firstMinion.views &&
    Array.isArray(firstMinion.views) &&
    typeof firstMinion.activeViewIndex === "number"
  ) {
    return "new";
  } else if (typeof firstMinion.url === "string") {
    return "old";
  } else {
    return "unknown";
  }
};

const _load = (workspace, frame) => {
  const data = app.getPath("userData");
  const filePath = path.join(data, "workspaces", `${workspace}.json`);
  if (fs.existsSync(filePath)) {
    var json = JSON.parse(fs.readFileSync(filePath));
    const format = detectWorkspaceFormat(json);

    console.log(`Loading workspace "${workspace}" in ${format} format`);

    if (format === "old") {
      _loadOldFormat(json, workspace, frame);
    } else if (format === "new") {
      _loadNewFormat(json, workspace, frame);
    } else {
      console.error(`Unknown or empty workspace format for "${workspace}"`);
    }
  }
};

// load workspace in old format (single URL per minion)
const _loadOldFormat = (json, workspace, frame) => {
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
};

// load workspace in new format (multiple views per minion)
const _loadNewFormat = (json, workspace, frame) => {
  json.forEach((minionData) => {
    if (!minionData.views || minionData.views.length === 0) {
      console.error("Minion data has no views, skipping");
      return;
    }

    // create minion with first view
    const firstView = minionData.views[0];
    var minion = open(firstView.url, frame);
    minion.workspace = workspace; // store workspace name

    // restore window properties
    minion.setPosition(minionData.x, minionData.y, false);
    minion.setSize(minionData.width, minionData.height, false);

    // set up first view state after it loads
    minion.webContents.once("did-finish-load", () => {
      // set zoom and scroll for first view
      minion.webContents.setZoomFactor(firstView.zoomFactor || 1);
      minion.webContents
        .executeJavaScript(
          `window.scrollTo(${firstView.scrollX || 0}, ${firstView.scrollY || 0})`,
        )
        .catch((err) => {
          console.error("error setting scroll position: ", err);
        });
    });

    // add additional views if there are more than one
    for (let i = 1; i < minionData.views.length; i++) {
      const viewData = minionData.views[i];

      // add view using opin functionality
      setTimeout(() => {
        opin(viewData.url, minion.id);

        // set up the newly added view state after it loads
        const addedView = minion.views[minion.views.length - 1];
        addedView.webContents.once("did-finish-load", () => {
          addedView.webContents.setZoomFactor(viewData.zoomFactor || 1);
          addedView.webContents
            .executeJavaScript(
              `window.scrollTo(${viewData.scrollX || 0}, ${viewData.scrollY || 0})`,
            )
            .catch((err) => {
              console.error(
                "error setting scroll position for added view: ",
                err,
              );
            });
        });
      }, i * 100); // small delay to ensure views are added in order
    }

    // switch to the previously active tab after all views are added
    if (
      typeof minionData.activeViewIndex === "number" &&
      minionData.activeViewIndex >= 0 &&
      minionData.activeViewIndex < minionData.views.length
    ) {
      setTimeout(
        () => {
          minion.switchToView(minionData.activeViewIndex);
        },
        minionData.views.length * 100 + 100,
      );
    }
  });
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
