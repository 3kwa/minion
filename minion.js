const { BaseWindow, WebContentsView } = require("electron");

class Minion {
  static #instances = [];
  constructor(x = null, y = null, width = null, height = null, frame = true) {
    this.URLs = [];
    this.views = [];
    this.hasFrame = frame;
    this.window = new BaseWindow({
      width: width === null ? 400 : width,
      height: height === null ? 300 : height,
      frame: frame,
      roundedCorners: frame,
    });
    this.window._parent = this;
    Minion.#instances.push(this);
    this.window.on("close", function (event) {
      this._parent._close();
    });
  }

  loadURL(url) {
    console.log("loading " + url);
    const view = new WebContentsView({
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        webviewTag: true,
      },
    });
    // ctrl-tab ?
    view.webContents.on("before-input-event", (event, input) => {
      if (input.control && input.key.toLowerCase() === "tab") {
        console.log("change tab");
        event.preventDefault();
      }
    });
    view.webContents.on("will-prevent-unload", (event) => {
      event.preventDefault();
    });
    view.webContents.loadURL(url);
    this.window.contentView.addChildView(view);
    this.window.setContentView(view);
    this.URLs.push(url);
    this.views.push(view);
  }

  static getAllMinions() {
    return Minion.#instances;
  }

  _close() {
    const index = Minion.#instances.indexOf(this);
    if (index !== -1) {
      Minion.#instances.splice(index, 1);
    }
  }
}

module.exports = { Minion };
