'use strict';

import Meta from 'gi://Meta';

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

class WindowTracker {
  constructor() {
    this.windows = [];
  }

  track_windows() {
    let actors = global.get_window_actors();
    let windows = actors.map(a => a.get_meta_window());
    windows = windows.filter(w => w.can_close());
    windows = windows.filter(w => w.get_window_type() in handledWindowTypes);
    windows.forEach(w => {
      if (!w._tracked) {
        this.track(w);
      }
    });
  }

  untrack_windows() {
    let actors = global.get_window_actors();
    let windows = actors.map(a => a.get_meta_window());
    windows.forEach(w => {
      if (w._tracked) {
        this.untrack(w);
      }
    });
    this.windows = [];
  }

  track(window) {
    if (!window._tracked) {
      window.connectObject(
        'position-changed',
        () => {
          console.log('position changed');
        },
        'size-changed',
        () => {
          console.log('size changed');
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

export const Services = class {
  enable() {
    this.window_tracker = new WindowTracker();
    this.window_tracker.track_windows();
  }

  disable() {
    this.window_tracker.untrack_windows();
    this.window_tracker = null;
  }

  update() {
    this.window_tracker.update();
  }
};
