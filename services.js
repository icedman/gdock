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
    this.services.on_windows_update(tracked);
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

  get_tracked_windows() {
    let actors = global.get_window_actors();
    let windows = actors.map(a => a.get_meta_window());
    windows = windows.filter(w => w._tracked);
    return windows;
  }

  track(window) {
    if (!window._tracked) {
      window.connectObject(
        'position-changed',
        () => {
          console.log(`position changed: ${window.title}`);
          this.services.on_windows_update([window]);
        },
        'size-changed',
        () => {
          // console.log(`size changed: ${window.title}`);
          this.services.on_windows_update([window]);
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

class PointerTracker {
  constructor(services) {
    this.services = services;
    this._dwell = 0;
    this._edge = null;
  }

  update(dt) {
    let [px, py] = global.get_pointer();
    let edge = null;
    let monitor = null;

    const dwell_count = 1000;

    Main.layoutManager.monitors.forEach(m => {
      if (px == m.x) {
        edge = 'left';
        monitor = m;
      }
      if (py == m.y) {
        edge = 'top';
        monitor = m;
      }
      if (px == m.x + m.width - 1) {
        edge = 'right';
        monitor = m;
      }
      if (py == m.y + m.height - 1) {
        edge = 'bottom';
        monitor = m;
      }
    });

    if (edge && monitor) {
      this._dwell += dt;
    } else {
      if (this._dwell > dwell_count) {
        this.services.on_pointer_leave_edge(this._monitor, this._edge);
      }
      this._dwell = 0;
    }

    this._edge = edge;
    this._monitor = monitor;
    console.log(`${this._dwell} ${edge}`);
    if (this._dwell > dwell_count) {
      this.services.on_pointer_on_edge(this._monitor, this._edge);
    }
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
    this.pointer_tracker = new PointerTracker(this);

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

    this.hiTimer.runLoop(s => {
      this.pointer_tracker.update(s._delay);
    }, 150);
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

  _onFocusWindow() {
    this.update();
    this.on_windows_update(this.window_tracker.get_tracked_windows());
  }

  _onFullScreen() {
    this.update();
    this.on_windows_update(this.window_tracker.get_tracked_windows());
  }

  on_windows_update(windows) {
    this.extension.docks.forEach(dock => {
      dock.debounced_autohide_dodge_windows(windows);
    });
  }

  on_pointer_on_edge(monitor, edge) {
    this.extension.docks.forEach(dock => {
      dock.on_pointer_on_edge(monitor, edge);
    });
  }

  on_pointer_leave_edge(monitor, edge) {
    let windows = this.window_tracker.get_tracked_windows();
    this.extension.docks.forEach(dock => {
      dock.debounced_autohide_dodge_windows(windows);
    });
  }

  update() {
    this.window_tracker.update();
  }
}
