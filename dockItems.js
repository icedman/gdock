'use strict';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import Gio from 'gi://Gio';

import { Dash } from 'resource:///org/gnome/shell/ui/dash.js';

import { IconsAnimator } from './effects.js';
import { BackgroundCanvas } from './background.js';
import { GDockItem } from './dock.js';

export let GDockIconItem = GObject.registerClass(
  {},
  class GDockIconItem extends GDockItem {
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
        offscreen_redirect: Clutter.OffscreenRedirect.ALWAYS
        // style_class: 'dock-box'
      });

      let gicon = new Gio.ThemedIcon({ name: 'folder' });
      let icon = new St.Icon({ gicon: gicon });
      icon.set_icon_size(64);
      icon.set_size(64, 64);
      this.add_child(icon);
    }
  }
);

export let GDockDashItem = GObject.registerClass(
  {},
  class GDockDashItem extends GDockItem {
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
        offscreen_redirect: Clutter.OffscreenRedirect.ALWAYS
        // style_class: 'dock-box'
      });

      this.dash = new Dash();
      this.dash._box.clip_to_allocation = false;
      this.dash._background.visible = false;

      this.dash.reactive = true;
      this.dash.track_hover = true;
      this.dash.connectObject(
        'motion-event',
        () => {
          if (this.dock) {
            this.dock.begin_animation();
          }
        },
        this
      );

      this.add_child(this.dash);

      this.animator = new IconsAnimator();
    }

    layout(dock) {
      this.dock = dock;
      let vertical = dock.is_vertical();

      this.dash.last_child.layout_manager.orientation = vertical;
      this.dash._box.layout_manager.orientation = vertical;

      let pad_width = 60;
      let pad_height = 60;
      this.width = this.dash.width;
      this.height = this.dash.height;

      if (vertical) {
        pad_height += 60 * 2;
      } else {
        pad_width += 60 * 2;
      }

      return {
        dock_width: this.width + pad_width,
        dock_height: this.height + pad_height
      };
    }

    on_animate(dt) {
      if (!this.dock) return;

      this._icons = this.animator.findIcons([
        this.dash._box.get_children(),
        [this.dash._showAppsIcon]
      ]);

      this._icons.forEach(c => {
        if (c._hooked) {
          return;
        }
        c._hooked = true;
        c._icon.track_hover = true;
        c._icon.reactive = true;
        if (c._grid) {
          c._grid.style = 'background: none !important;';
        }
      });

      // render background here
      if (!this._background) {
        this._background = new BackgroundCanvas();
        this.dock._background.add_child(this._background);
      }

      this._background.x = this.x;
      this._background.y = this.y;
      this._background.width = this.width;
      this._background.height = this.height;

      // render foreground here

      return this.animator.animate(dt, global.get_pointer());
    }
  }
);

export let GDockPanelItem = GObject.registerClass(
  {},
  class GDockPanelItem extends GDockItem {
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
        style_class: 'dock-box'
      });

      this.panel = Main.panel;
    }

    layout(dock) {
      if (dock.is_vertical()) {
        dock.visible = false;
        this.width = 0;
        this.height = 0;
        return {
          dock_width: 0,
          dock_height: 0
        };
      }

      dock.visible = true;

      this.panel.width = dock._monitor.width * 0.8;
      this.panel.height = 48;

      let pad_width = 0;
      let pad_height = 0;
      this.width = this.panel.width;
      this.height = this.panel.height;

      return {
        dock_width: this.width + pad_width,
        dock_height: this.height + pad_height
      };
    }

    on_dock(dock) {
      Main.layoutManager.panelBox.remove_child(Main.panel);
      this.add_child(this.panel);
    }

    on_undock(dock) {
      this.remove_child(this.panel);
      Main.layoutManager.panelBox.add_child(Main.panel);
    }
  }
);
