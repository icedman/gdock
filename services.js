'use strict';

import Meta from 'gi://Meta';
import GObject from 'gi://GObject';

import * as Signals from 'resource:///org/gnome/shell/misc/signals.js';

// some codes lifted from dash-to-dock intellihide
const handledWindowTypes = [
  Meta.WindowType.NORMAL,
  // Meta.WindowType.DOCK,
  Meta.WindowType.DIALOG,
  Meta.WindowType.MODAL_DIALOG,
  // Meta.WindowType.TOOLBAR,
  // Meta.WindowType.MENU,
  Meta.WindowType.UTILITY
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
    let windows = actors.map(a => a.get_meta_window());
    windows = windows.filter(w => w.can_close());
    windows = windows.filter(w => w.get_window_type() in handledWindowTypes);
    windows.forEach(w => {
      if (!w._tracked) {
        this.track(w);
      }
      tracked.push(w);
    });
    this.services.emit('window-geometry-changed', tracked);
  }

  untrack_windows() {
    let actors = global.get_window_actors();
    let windows = actors.map(a => a.get_meta_window());
    windows.forEach(w => {
      if (w._tracked) {
        this.untrack(w);
      }
    });
  }

  track(window) {
    if (!window._tracked) {
      window.connectObject(
        'position-changed',
        () => {
          this.services.emit('window-geometry-changed', [window]);
        },
        'size-changed',
        () => {
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
    this.window_tracker = new WindowTracker(this);
    this.window_tracker.track_windows();
    serviceInstance = this;

    global.display.connectObject(
      'notify::focus-window',
      this.update.bind(this),
      'in-fullscreen-changed',
      this.update.bind(this),
      this
    );
  }

  disable() {
    this.window_tracker.untrack_windows();
    this.window_tracker = null;
    serviceInstance = null;

    global.display.disconnectObject(this);
  }

  update() {
    this.window_tracker.update();
  }
}
