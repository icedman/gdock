'use strict';

import Meta from 'gi://Meta';
import GObject from 'gi://GObject';
import * as Signals from 'resource:///org/gnome/shell/misc/signals.js';

import { Timer } from './timer.js';

// some codes lifted from dash-to-dock intellihide
const handledWindowTypes = [
  Meta.WindowType.NORMAL,
  // Meta.WindowType.DOCK,
  Meta.WindowType.DIALOG,
  Meta.WindowType.MODAL_DIALOG,
  // Meta.WindowType.TOOLBAR,
  // Meta.WindowType.MENU,
  Meta.WindowType.UTILITY,
  // Meta.WindowType.SPLASHSCREEN
];

let serviceInstance = null;

class WindowTracker {
  constructor(services) {
    this.services = services;
  }

  track_windows() {
    let tracked = [];
    let actors = global.get_window_actors();
    let windows = actors.map((a) => a.get_meta_window());
    windows = windows.filter((w) => w.can_close());
    windows = windows.filter((w) => w.get_window_type() in handledWindowTypes);
    windows.forEach((w) => {
      if (!w._tracked) {
        this.track(w);
      }
      tracked.push(w);
    });
    this.services.emit('window-geometry-changed', tracked);
  }

  untrack_windows() {
    let actors = global.get_window_actors();
    let windows = actors.map((a) => a.get_meta_window());
    windows.forEach((w) => {
      if (w._tracked) {
        this.untrack(w);
      }
    });
  }

  get_tracked_windows() {
    let actors = global.get_window_actors();
    let windows = actors.map((a) => a.get_meta_window());
    windows = windows.filter((w) => w._tracked);
    let workspace = global.workspace_manager.get_active_workspace_index();
    windows = windows.filter(
      (w) =>
        workspace == w.get_workspace().index() && w.showing_on_its_workspace()
    );
    return windows;
  }

  track(window) {
    if (!window._tracked) {
      window.connectObject(
        'position-changed',
        () => {
          // console.log(`position changed: ${window.title}`);
          this.services.emit('window-geometry-changed', [window]);
        },
        'size-changed',
        () => {
          // console.log(`size changed: ${window.title}`);
          this.services.emit('window-geometry-changed', [window]);
        },
        this
      );
      window._tracked = true;
    }
  }

  untrack(w) {
    if (window._tracked) {
      window.disconnectObject(this);
      window._tracked = false;
    }
  }

  update() {
    this.track_windows();
  }
}

export class Services extends Signals.EventEmitter {
  static instance() {
    return serviceInstance;
  }

  enable() {
    serviceInstance = this;

    this.window_tracker = new WindowTracker(this);
    this.window_tracker.track_windows();

    global.display.connectObject(
      'notify::focus-window',
      this.update.bind(this),
      'in-fullscreen-changed',
      this.update.bind(this),
      this
    );

    // three available timers
    // for persistent runs
    this.timer = new Timer('loop timer');
    this.timer.initialize(3500);

    // for animation runs
    // resolution (15) will be modified by animation-fps
    this.hiTimer = new Timer('hi-res timer');
    this.hiTimer.initialize(15);

    // for deferred or debounced runs
    this.loTimer = new Timer('lo-res timer');
    this.loTimer.initialize(750);
  }

  disable() {
    this._timer?.shutdown();
    this._hiTimer?.shutdown();
    this._loTimer?.shutdown();

    this.window_tracker.untrack_windows();
    this.window_tracker = null;

    global.display.disconnectObject(this);

    this._timer = null;
    this._hiTimer = null;
    this._loTimer = null;

    serviceInstance = null;
  }

  update() {
    this.window_tracker.update();
  }
}
