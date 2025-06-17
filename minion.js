const { BaseWindow, WebContentsView } = require("electron");

class Minion {
  static #instances = [];
  static #focusedInstance = null;

  constructor(options = {}) {
    // Extract webPreferences for the view
    const { webPreferences, ...windowOptions } = options;
    
    // Create BaseWindow with window options
    this.window = new BaseWindow(windowOptions);
    
    // Store properties for compatibility
    this.hasFrame = options.frame !== false;
    
    // Create initial WebContentsView
    this.view = new WebContentsView({
      webPreferences: webPreferences || {}
    });
    
    // Add view to window and set bounds
    this.window.contentView.addChildView(this.view);
    this._updateViewBounds();
    
    // Proxy common properties
    this.id = this.window.id;
    this.webContents = this.view.webContents;

    // Handle window resize to update view bounds
    this.window.on('resized', () => {
      this._updateViewBounds();
    });

    // Track instances
    Minion.#instances.push(this);

    // Track focus changes
    this.window.on('focus', () => {
      Minion.#focusedInstance = this;
    });

    this.window.on('closed', () => {
      const index = Minion.#instances.indexOf(this);
      if (index !== -1) {
        Minion.#instances.splice(index, 1);
      }
      if (Minion.#focusedInstance === this) {
        Minion.#focusedInstance = null;
      }
    });
  }

  loadURL(url) {
    return this.view.webContents.loadURL(url);
  }
  
  // Helper method to update view bounds
  _updateViewBounds() {
    const bounds = this.window.getBounds();
    this.view.setBounds({ x: 0, y: 0, width: bounds.width, height: bounds.height });
  }


  // Event proxy methods
  on(eventName, listener) {
    return this.window.on(eventName, listener);
  }

  once(eventName, listener) {
    return this.window.once(eventName, listener);
  }

  // Window method proxies
  show() {
    return this.window.show();
  }

  hide() {
    return this.window.hide();
  }

  focus() {
    return this.window.focus();
  }

  close() {
    return this.window.close();
  }

  isDestroyed() {
    return this.window.isDestroyed();
  }

  getPosition() {
    return this.window.getPosition();
  }

  setPosition(x, y, animate) {
    return this.window.setPosition(x, y, animate);
  }

  getSize() {
    return this.window.getSize();
  }

  setSize(width, height, animate) {
    return this.window.setSize(width, height, animate);
  }

  getBounds() {
    return this.window.getBounds();
  }

  setBounds(bounds) {
    return this.window.setBounds(bounds);
  }

  // Static method to get focused minion
  static getFocusedMinion() {
    return Minion.#focusedInstance;
  }

  // Static method to get all minions
  static getAllMinions() {
    return Minion.#instances;
  }
}

module.exports = { Minion };
