'use strict';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

import { setTimeout } from './utils.js';
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
    setTimeout(() => {
      this._gdock.layout();
    }, 500);

    Main.overview.gdock = this;

    this.attach_events();
  }

  disable() {
    this.services.disable();
    this.services = null;

    this._gdock.undock();
    this._gdock = null;
    console.log('The Gnome Dock - disabled');
  }

  attach_events() {
    global.display.connectObject(
      'notify::focus-window',
      this._onFocusWindow.bind(this),
      'in-fullscreen-changed',
      this._onFullScreen.bind(this),
      this
    );
  }

  detach_events() {
    global.display.disconnectObject(this);
  }

  _onFocusWindow() {
    this.services.update();
  }

  _onFullScreen() {
    this.services.update();
  }
}
