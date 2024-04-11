'use strict';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import St from 'gi://St';

import { isOverlapRect } from './utils.js';
import { Services } from './services.js';

export const DockPosition = {
  TOP: 'top',
  BOTTOM: 'bottom',
  LEFT: 'left',
  RIGHT: 'right'
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
        clip_to_allocation: true,
        x_align: Clutter.ActorAlign.CENTER,
        y_align: Clutter.ActorAlign.CENTER,
        offscreen_redirect: Clutter.OffscreenRedirect.ALWAYS
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
        dock_height: this.height + pad_height
      };
    }
  }
);

export let GDock = GObject.registerClass(
  {},
  class GDock extends St.Widget {
    _init(params) {
      super._init({
        name: 'GDock',
        reactive: false,
        track_hover: false,
        width: 128,
        height: 128,
        clip_to_allocation: true,
        x_align: Clutter.ActorAlign.CENTER,
        y_align: Clutter.ActorAlign.CENTER,
        offscreen_redirect: Clutter.OffscreenRedirect.ALWAYS
        // style_class: 'dock-box'
      });

      this._hidden = false;
      this._position = DockPosition.TOP;
      this._monitor = Main.layoutManager.primaryMonitor;

      this._struts = new St.Widget({
        name: 'GDockStruts',
        reactive: false,
        track_hover: false
        // style_class: 'dock-box'
      });

      this._settings = {
        dodge: true
      };
    }

    set_child(child) {
      if (this.child) {
        this.remove_child(this.child);
      }
      this.add_child(child);
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

      Main.layoutManager.addChrome(this, {
        affectsStruts: false,
        affectsInputRegion: false,
        trackFullscreen: false
      });

      Main.layoutManager.addChrome(this._struts, {
        affectsStruts: !this._settings.dodge,
        affectsInputRegion: false,
        trackFullscreen: false
      });

      this._added_to_chrome = true;

      Services.instance().connectObject(
        'window-geometry-changed',
        (service, windows) => {
          this.debounced_autohide_dodge_windows(windows);
        },
        this
      );

      this.debounced_layout();
    }

    undock() {
      if (!this._added_to_chrome) {
        return;
      }

      Main.layoutManager.removeChrome(this);
      Main.layoutManager.removeChrome(this._struts);

      this._added_to_chrome = false;

      Services.instance().disconnectObject(this);
    }

    slide_in() {
      let child = this.first_child;
      child.remove_all_transitions();

      child.ease({
        translationX: 0,
        translationY: 0,
        duration: 750,
        mode: Clutter.AnimationMode.EASE_OUT_QUAD,
        onComplete: () => {
          console.log('slide in!');
          this.debounced_layout();
        }
      });
    }

    slide_out() {
      let child = this.first_child;

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

      child.remove_all_transitions();
      child.ease({
        translationX: targetX,
        translationY: targetY,
        duration: 750,
        mode: Clutter.AnimationMode.EASE_OUT_QUAD,
        onComplete: () => {
          console.log('slide out!');
          child._hidden = true;
          this.debounced_layout();
        }
      });
    }

    is_vertical() {
      return (
        this._position == DockPosition.LEFT ||
        this._position == DockPosition.RIGHT
      );
    }

    is_child_hidden() {
      return this.child.translationX + this.child.translationY != 0;
    }

    _snap_to_container_edge(container, child) {
      child.x = container.width / 2 - child.width / 2;
      child.y = container.height / 2 - child.height / 2;
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

    layout() {
      let child = this.first_child;
      let constraints = child.layout(this);
      if (constraints) {
        this.width = constraints.dock_width;
        this.height = constraints.dock_height;
      }

      this._snap_to_container_edge(this._monitor, this);
      this.x += this._monitor.x;
      this.y += this._monitor.y;

      this._snap_to_container_edge(this, child);

      let [cx, cy] = child.get_transformed_position();
      if (!isNaN(cx) && !isNaN(cy)) {
        this._struts.x = cx;
        this._struts.y = cy;
        this._struts.width = child.width;
        this._struts.height = child.height;
        this._struts.affectsStruts = this.is_child_hidden();
      }
    }

    debounced_layout() {
      if (!this._debounce_layout_seq) {
        this._debounce_layout_seq = Services.instance().loTimer.runDebounced(
          () => {
            this.layout();
          },
          500,
          'debounced_layout'
        );
      } else {
        Services.instance().loTimer.runDebounced(this._debounce_layout_seq);
      }
    }

    autohide_dodge_windows(windows) {
      // todo make this a debounced call
      this.debounced_layout();

      if (!this._settings.dodge) {
        return;
      }

      let strutsRect = [
        this._struts.x,
        this._struts.y,
        this._struts.width,
        this._struts.height
      ];

      let should_hide = false;
      windows.forEach(w => {
        let frame = w.get_frame_rect();
        let winRect = [frame.x, frame.y, frame.width, frame.height];
        console.log(`${strutsRect} - ${winRect}`);
        if (isOverlapRect(strutsRect, winRect)) {
          should_hide = true;
        }
      });

      if (should_hide) {
        this.slide_out();
      } else {
        this.slide_in();
      }
    }

    debounced_autohide_dodge_windows(windows) {
      if (!this._debounce_autohide_dodge_seq) {
        this._debounce_autohide_dodge_seq = Services.instance().loTimer.runDebounced(
          () => {
            this.autohide_dodge_windows(windows);
          },
          500,
          'debounced_autohide_dodge_windows'
        );
      } else {
        Services.instance().loTimer.runDebounced(
          this._debounce_autohide_dodge_seq
        );
      }
    }
  }
);
