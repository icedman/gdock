'use strict';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import Gio from 'gi://Gio';

import { Dash } from 'resource:///org/gnome/shell/ui/dash.js';

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
        clip_to_allocation: true,
        x_align: Clutter.ActorAlign.CENTER,
        y_align: Clutter.ActorAlign.CENTER,
        offscreen_redirect: Clutter.OffscreenRedirect.ALWAYS,
        // style_class: 'dock-box'
      });

      let gicon = new Gio.ThemedIcon({ name: 'folder' });
      let icon = new St.Icon({ gicon: gicon });
      icon.set_icon_size(64, 64);
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
        clip_to_allocation: true,
        x_align: Clutter.ActorAlign.CENTER,
        y_align: Clutter.ActorAlign.CENTER,
        offscreen_redirect: Clutter.OffscreenRedirect.ALWAYS,
        // style_class: 'dock-box'
      });

      this.dash = new Dash();
      this.add_child(this.dash);
    }

    layout(dock) {
      let vertical = dock.is_vertical();
      this.dash.last_child.layout_manager.orientation = vertical;
      this.dash._box.layout_manager.orientation = vertical;

      let pad_width = 60;
      let pad_height = 60;
      this.width = this.dash.width;
      this.height = this.dash.height;

      return {
        dock_width: this.width + pad_width,
        dock_height: this.height + pad_height,
      };
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
        clip_to_allocation: true,
        x_align: Clutter.ActorAlign.CENTER,
        y_align: Clutter.ActorAlign.CENTER,
        offscreen_redirect: Clutter.OffscreenRedirect.ALWAYS,
        style_class: 'dock-box',
      });

      // this._box = new St.BoxLayout({});
      // let panel = Main.panel;
      // let boxes = [panel._leftBox, panel._centerBox, panel._righBox];
      // boxes.forEach((b) => {
      //   panel.remove_child(b);
      //   this._box.add_child(b);
      // });

      Main.layoutManager.panelBox.remove_child(Main.panel);
      this.panel = Main.panel;
      this.add_child(this.panel);
    }

    layout(dock) {
      this.panel.width = dock._monitor.width * 0.8;
      this.panel.height = 80;

      let pad_width = 60;
      let pad_height = 60;
      this.width = this.panel.width;
      this.height = this.panel.height;

      return {
        dock_width: this.width + pad_width,
        dock_height: this.height + pad_height,
      };
    }
  }
);
