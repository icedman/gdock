'use strict';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import Meta from 'gi://Meta';

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
    this.services.on_windows_update(tracked);
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
    return windows;
  }

  track(window) {
    if (!window._tracked) {
      window.connectObject(
        'position-changed',
        () => {
          // console.log(`position changed: ${window.title}`);
          this.services.on_windows_update([window]);
        },
        'size-changed',
        () => {
          this.services.on_windows_update([window]);
          if (window.is_fullscreen()) {
            Meta.disable_unredirect_for_display(global.display);
          } else {
            Meta.enable_unredirect_for_display(global.display);
          }
        },
        this
      );
      window._tracked = true;
    }
  }

  untrack(w) {
    if (window._tracked) {
      try {
        window.disconnectObject(this);
      } catch (err) {
        console.log(err); //<< happens at suspend?
      }
      window._tracked = false;
    }
  }

  update() {
    this.track_windows();
  }
}

export class Services {
  static instance() {
    return serviceInstance;
  }

  constructor(extension) {
    this.extension = extension;
  }

  enable() {
    serviceInstance = this;

    this.window_tracker = new WindowTracker(this);

    global.display.connectObject(
      'notify::focus-window',
      this._onFocusWindow.bind(this),
      'in-fullscreen-changed',
      this._onFocusWindow.bind(this),
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

    this.loTimer.runOnce(() => {
      this.window_tracker.track_windows();
    }, 0);
  }

  disable() {
    this.timer?.shutdown();
    this.hiTimer?.shutdown();
    this.loTimer?.shutdown();

    this.window_tracker.untrack_windows();
    this.window_tracker = null;

    global.display.disconnectObject(this);

    this.timer = null;
    this.hiTimer = null;
    this.loTimer = null;

    serviceInstance = null;
  }

  _onFocusWindow() {
    this.update();
    this.on_windows_update(this.window_tracker.get_tracked_windows());
  }

  _onFullScreen(fullscreen) {
    this.update();
    this.on_windows_update(this.window_tracker.get_tracked_windows());
  }

  on_windows_update(windows) {
    if (this.extension.docks) {
      this.extension.docks.forEach((dock) => {
        dock.debounced_autohide_dodge_windows(windows);
      });
    }
  }

  update() {
    this.window_tracker.update();
  }
}
