'use strict';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import Meta from 'gi://Meta';
import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import St from 'gi://St';

import { isOverlapRect, isInRect } from './utils.js';
import { Interpolate } from './effects.js';
import { Services } from './services.js';

const ANIM_SLIDE_DURATION = 500;

const ANIM_INTERVAL = 15;
const ANIM_DEBOUNCE_END_DELAY = 750;

export const DockPosition = {
  BOTTOM: 'bottom',
  TOP: 'top',
  LEFT: 'left',
  RIGHT: 'right',
};

export let GDockItem = GObject.registerClass(
  {},
  class GDockItem extends St.Widget {
    _init(params) {
      super._init({
        name: 'GDockItem',
        reactive: false,
        track_hover: false,
        width: 64,
        height: 64,
        clip_to_allocation: false,
        x_align: Clutter.ActorAlign.CENTER,
        y_align: Clutter.ActorAlign.CENTER,
        offscreen_redirect: Clutter.OffscreenRedirect.ALWAYS,
        // style_class: 'dock-box'
      });
    }

    layout(dock) {
      let pad_width = 60;
      let pad_height = 60;
      if (dock.is_vertical()) {
        pad_width += 20;
      } else {
        pad_height += 20;
      }
      return {
        dock_width: this.width + pad_width,
        dock_height: this.height + pad_height,
        struts_width: this.width,
        struts_height: this.height,
      };
    }

    on_dock(dock) {}

    on_undock(dock) {}

    on_animate(dt) {
      return false;
    }
  }
);

export let GDock = GObject.registerClass(
  {},
  class GDock extends St.Widget {
    _init(params = {}) {
      super._init({
        name: 'GDock',
        reactive: false,
        track_hover: false,
        width: 128,
        height: 128,
        clip_to_allocation: true,
        x_align: Clutter.ActorAlign.CENTER,
        y_align: Clutter.ActorAlign.CENTER,
        offscreen_redirect: Clutter.OffscreenRedirect.ALWAYS,
        // style_class: 'dock-box'
      });

      this._monitor = Main.layoutManager.primaryMonitor;

      this._struts = new St.Widget({
        name: 'GDockStruts',
        reactive: false,
        track_hover: false,
        style_class: 'dock-box',
      });
      this._dwell = new St.Widget({
        name: 'GDockDwell',
        reactive: true,
        track_hover: true,
        offscreen_redirect: Clutter.OffscreenRedirect.ALWAYS,
        // style_class: 'dock-box',
      });
      this._dwell.connectObject(
        'motion-event',
        () => {
          this.slide_in();
        },
        'enter-event',
        () => {
          this.slide_in();
        },
        'leave-event',
        () => {
          this.begin_animation();
        },
        this
      );

      this._settings = {
        dodge: true,
      };

      this._foreground = new St.Widget({
        name: 'GDockFg',
        reactive: false,
        track_hover: false,
      });

      this._background = new St.Widget({
        name: 'GDockBg',
        reactive: false,
        track_hover: false,
      });
      this.add_child(this._background);
      this.add_child(this._foreground);

      if (params.child) {
        this.set_child(params.child);
      }
      if (params.position) {
        this.dock(params.position);
      }
    }

    set_child(child) {
      if (this.child) {
        this.remove_child(this.child);
      }
      this.insert_child_above(child, this._background);
      this.child = child;
      child._dock = this;
      return child;
    }

    dock(position) {
      if (this._added_to_chrome) {
        if (position != null && position != this._position) {
          this.undock();
        } else {
          return;
        }
      }

      if (position) {
        this._position = position;
      }

      Main.layoutManager.addChrome(this._struts, {
        affectsStruts: !this._settings.dodge,
        affectsInputRegion: false,
        trackFullscreen: false,
      });

      Main.layoutManager.addChrome(this, {
        affectsStruts: false,
        affectsInputRegion: false,
        trackFullscreen: false,
      });

      Main.layoutManager.addChrome(this._dwell, {
        affectsStruts: false,
        affectsInputRegion: false,
        trackFullscreen: false,
      });

      this._added_to_chrome = true;

      if (this.child) {
        this.child.on_dock(this);
      }

      this._edge_distance = 10;

      this._hidden = true;
      this.slide_in();
    }

    undock() {
      if (!this._added_to_chrome) {
        return;
      }

      if (this.child) {
        this.child.on_undock(this);
      }

      Main.layoutManager.removeChrome(this);
      Main.layoutManager.removeChrome(this._struts);
      Main.layoutManager.removeChrome(this._dwell);

      this._added_to_chrome = false;
    }

    slide_in() {
      if (!this._hidden) return;

      let targetX = 0;
      let targetY = 0;
      if (this.is_vertical()) {
        if (this._position == DockPosition.LEFT) {
          targetX = this._edge_distance;
        } else {
          targetX = -this._edge_distance;
        }
      } else {
        if (this._position == DockPosition.TOP) {
          targetY = this._edge_distance;
        } else {
          targetY = -this._edge_distance;
        }
      }

      this._targetX = targetX;
      this._targetY = targetY;
      this._hidden = false;

      this.begin_animation();
    }

    slide_out() {
      if (this._hidden) return;
      let child = this.child;

      let targetX = 0;
      let targetY = 0;
      if (this.is_vertical()) {
        if (this._position == DockPosition.LEFT) {
          targetX = -child.width;
        } else {
          targetX = child.width;
        }
      } else {
        if (this._position == DockPosition.TOP) {
          targetY = -child.height;
        } else {
          targetY = child.height;
        }
      }

      this._targetX = targetX;
      this._targetY = targetY;
      this._hidden = true;

      this.begin_animation();
    }

    is_vertical() {
      return (
        this._position == DockPosition.LEFT ||
        this._position == DockPosition.RIGHT
      );
    }

    _snap_to_container_edge(container, child, edge = true) {
      child.x = container.width / 2 - child.width / 2;
      child.y = container.height / 2 - child.height / 2;
      if (edge) {
        if (this.is_vertical()) {
          if (this._position == DockPosition.LEFT) {
            child.x = 0;
          } else {
            child.x = container.width - child.width;
          }
        } else {
          if (this._position == DockPosition.TOP) {
            child.y = 0;
          } else {
            child.y = container.height - child.height;
          }
        }
      }
    }

    layout() {
      this._position = Services.instance()._position;
      
      let child = this.child;
      let constraints = child.layout(this);
      if (constraints) {
        if (constraints.dock_width > this._monitor.width) {
          constraints.dock_width = this._monitor.width;
        }
        if (constraints.dock_height > this._monitor.height) {
          constraints.dock_height = this._monitor.height;
        }
        this.width = constraints.dock_width;
        this.height = constraints.dock_height;
      }

      // dock
      this._snap_to_container_edge(this._monitor, this);
      this.x += this._monitor.x;
      this.y += this._monitor.y;

      // dock child
      this._snap_to_container_edge(this, child);

      // struts
      this._struts.width = constraints.struts_width;
      this._struts.height = constraints.struts_height;
      this._snap_to_container_edge(this._monitor, this._struts);

      // dwell
      this._dwell.width = child.width;
      this._dwell.height = child.height;
      if (this.is_vertical()) {
        this._dwell.width = 2;
      } else {
        this._dwell.height = 2;
      }
      this._snap_to_container_edge(this._monitor, this._dwell);
    }

    debounced_layout() {
      if (!this._debounce_layout_seq) {
        this._debounce_layout_seq = Services.instance().loTimer.runDebounced(
          () => {
            this.layout();
          },
          500
        );
      } else {
        Services.instance().loTimer.runDebounced(this._debounce_layout_seq);
      }
    }

    autohide_dodge_windows(windows) {
      windows =
        windows || Services.instance().window_tracker.get_tracked_windows();

      let workspace = global.workspace_manager.get_active_workspace_index();
      windows = windows.filter(
        (w) =>
          workspace == w.get_workspace().index() && w.showing_on_its_workspace()
      );

      if (!this._settings.dodge) {
        return;
      }

      let strutsRect = [
        this._struts.x,
        this._struts.y,
        this._struts.width,
        this._struts.height,
      ];

      let should_hide = false;
      windows.forEach((w) => {
        let frame = w.get_frame_rect();
        let winRect = [frame.x, frame.y, frame.width, frame.height];
        // console.log(`${w.title} ${winRect}`);
        if (isOverlapRect(strutsRect, winRect)) {
          should_hide = true;
        }
      });

      let p = global.get_pointer();
      if (isInRect(strutsRect, p)) {
        should_hide = false;
      }

      if (should_hide) {
        this.slide_out();
      } else {
        this.slide_in();
      }
    }

    debounced_autohide_dodge_windows(windows) {
      if (!windows) {
        windows = Services.instance().window_tracker.get_tracked_windows();
      }
      if (!this._debounce_autohide_dodge_seq) {
        this._debounce_autohide_dodge_seq =
          Services.instance().loTimer.runDebounced((s) => {
            this.autohide_dodge_windows(s.windows);
          }, 150);
      } else {
        Services.instance().loTimer.runDebounced(
          this._debounce_autohide_dodge_seq
        );
      }
      this._debounce_autohide_dodge_seq.windows = [...windows];
    }

    begin_animation() {
      // this.add_style_class_name('dock-box');
      let services = Services.instance();
      if (this._debounce_end_seq) {
        services.loTimer.runDebounced(this._debounce_end_seq);
        // services.loTimer.cancel(this._debounce_end_seq);
      }

      this.animation_interval = ANIM_INTERVAL;
      if (!this._animation_seq) {
        this._animation_seq = services.hiTimer.runLoop((s) => {
          this.animate(s._delay);
        }, this.animation_interval);
      } else {
        services.hiTimer.runLoop(this._animation_seq);
      }
    }

    end_animation() {
      // this.remove_style_class_name('dock-box');
      let services = Services.instance();
      services.hiTimer.cancel(this._animation_seq);
      services.loTimer.cancel(this._debounce_end_seq);
      this.debounced_autohide_dodge_windows();
    }

    debounce_end_animation() {
      let services = Services.instance();
      if (!this._debounce_end_seq) {
        this._debounce_end_seq = services.loTimer.runDebounced(() => {
          this.end_animation();
        }, ANIM_DEBOUNCE_END_DELAY + this.animation_interval);
      } else {
        services.loTimer.runDebounced(this._debounce_end_seq);
      }
    }

    animate(dt) {
      this.layout();

      let speed = 250 / 1000;
      this.child.translationX = Interpolate.linearTo(
        this.child.translationX,
        this._targetX,
        dt,
        speed
      );
      this.child.translationY = Interpolate.linearTo(
        this.child.translationY,
        this._targetY,
        dt,
        speed
      );

      this._foreground.translationX = this.child.translationX;
      this._foreground.translationY = this.child.translationY;
      this._background.translationX = this.child.translationX;
      this._background.translationY = this.child.translationY;

      if (this.child.on_animate(dt)) {
        this.debounce_end_animation();
      }
    }
  }
);
