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
    this.webPreferences = webPreferences || {};

    // Create views array and track active view
    this.views = [];
    this.activeViewIndex = 0;

    // Create initial view using _addView method
    this._addView();

    // Proxy common properties
    this.id = this.window.id - 1;
    this.webContents = this.views[this.activeViewIndex].webContents;


    // Handle window resize to update active view bounds
    this.window.on("resized", () => {
      this._updateViewBounds();
    });

    // Track instances
    Minion.#instances.push(this);

    // Track focus changes
    this.window.on("focus", () => {
      Minion.#focusedInstance = this;
    });

    this.window.on("closed", () => {
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
    return this.views[this.activeViewIndex].webContents.loadURL(url);
  }

  // Helper method to add a new view
  _addView() {
    const view = new WebContentsView({
      webPreferences: this.webPreferences,
    });

    // Add view to array
    this.views.push(view);

    // Add view to window
    this.window.contentView.addChildView(view);


    // Make the newly added view the active view
    this.activeViewIndex = this.views.length - 1;
    this.window.setContentView(view);
    this.webContents = view.webContents;

    // Update bounds for all views
    this._updateViewBounds();

    return view;
  }

  // Helper method to update all view bounds
  _updateViewBounds() {
    const contentBounds = this.window.getContentBounds();
    const bounds = {
      x: 0,
      y: 0,
      width: contentBounds.width,
      height: contentBounds.height,
    };

    // Update bounds for all views so they're ready when switching
    this.views.forEach((view) => {
      view.setBounds(bounds);
    });
  }

  // Switch to a specific view by index
  switchToView(index) {
    if (index >= 0 && index < this.views.length && index !== this.activeViewIndex) {
      this.activeViewIndex = index;
      this.window.setContentView(this.views[index]);
      this.webContents = this.views[index].webContents;
    }
  }

  // Switch to the next view (circular)
  switchToNextView() {
    if (this.views.length > 1) {
      const nextIndex = (this.activeViewIndex + 1) % this.views.length;
      this.switchToView(nextIndex);
    }
  }

  // Close the current tab (only if there are multiple tabs)
  closeCurrentTab() {
    if (this.views.length > 1) {
      // Remove the current view from the window
      const currentView = this.views[this.activeViewIndex];
      this.window.contentView.removeChildView(currentView);

      // Remove from views array
      this.views.splice(this.activeViewIndex, 1);

      // Adjust activeViewIndex if needed
      if (this.activeViewIndex >= this.views.length) {
        this.activeViewIndex = this.views.length - 1;
      }

      // Switch to the new active view
      this.window.setContentView(this.views[this.activeViewIndex]);
      this.webContents = this.views[this.activeViewIndex].webContents;

      return true; // Tab was closed
    }
    return false; // No tab closed (only one left)
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

  // Static method to find minion by ID
  static findMinionById(id) {
    return Minion.#instances.find((minion) => minion.id === id);
  }
}

module.exports = { Minion };
