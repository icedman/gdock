'use strict';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import St from 'gi://St';

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
        offscreen_redirect: Clutter.OffscreenRedirect.ALWAYS,
        style_class: 'dock-item-box'
      });
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
        offscreen_redirect: Clutter.OffscreenRedirect.ALWAYS,
        style_class: 'dock-box'
      });

      this._hidden = false;
      this._position = DockPosition.BOTTOM;
      this._monitor = Main.layoutManager.primaryMonitor;
    }

    slide_in() {
      let child = this.first_child;
      child.ease({
        translationX: 0,
        duration: 1500,
        mode: Clutter.AnimationMode.EASE_OUT_QUAD,
        onComplete: () => {
          console.log('slide in!');
          child._hidden = false;
        }
      });
    }

    slide_out() {
      let child = this.first_child;
      child.ease({
        translationX: -child.width,
        duration: 1500,
        mode: Clutter.AnimationMode.EASE_OUT_QUAD,
        onComplete: () => {
          console.log('slide out!');
          child._hidden = true;
        }
      });
    }

    is_vertical() {
      return (
        this._position == DockPosition.LEFT ||
        this._position == DockPosition.RIGHT
      );
    }

    layout() {
      // position the dock
      this.x = this._monitor.x + this._monitor.width / 2 - this.width / 2;
      this.y = this._monitor.y + this._monitor.height / 2 - this.height / 2;

      if (this.is_vertical()) {
        if (this._position == DockPosition.LEFT) {
          this.x = this._monitor.x;
        } else {
          this.x = this._monitor.x + this._monitor.width - this.width;
        }
      } else {
        if (this._position == DockPosition.TOP) {
          this.y = this._monitor.y;
        } else {
          this.y = this._monitor.y + this._monitor.height - this.height;
        }
      }
    }
  }
);
