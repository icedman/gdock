'use strict';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import GLib from 'gi://GLib';

import { GDock } from './dock.js';
import { GDockIconItem, GDockDashItem } from './dockItems.js';

const setTimeout = (func, delay, ...args) => {
  const wrappedFunc = () => {
    func.apply(this, args);
  };
  return GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay, wrappedFunc);
};

export default class GDockExtension extends Extension {
  enable() {
    console.log('The Gnome Dock - enabled');
    this._gdock = new GDock();
    // this._gdock.set_child(new GDockIconItem());
    this._gdock.set_child(new GDockDashItem());

    this._gdock.dock();
    setTimeout(() => {
      this._gdock.layout();
    }, 500);

    Main.overview.gdock = this;
  }

  disable() {
    this._gdock.undock();
    this._gdock = null;
    console.log('The Gnome Dock - disabled');
  }
}
