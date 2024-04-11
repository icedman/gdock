'use strict';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

import { Services } from './services.js';
import { GDock } from './dock.js';
import { GDockIconItem, GDockDashItem } from './dockItems.js';

export default class GDockExtension extends Extension {
  enable() {
    this.services = new Services();
    this.services.enable();

    console.log('The Gnome Dock - enabled');
    this._gdock = new GDock();
    // this._gdock.set_child(new GDockIconItem());
    this._gdock.set_child(new GDockDashItem());
    this._gdock.dock();

    Main.overview.gdock = this;
  }

  disable() {
    this._gdock.undock();
    this._gdock = null;

    this.services.disable();
    this.services = null;
    console.log('The Gnome Dock - disabled');
  }

  _onFocusWindow() {
    this.services.update();
  }

  _onFullScreen() {
    this.services.update();
  }
}
