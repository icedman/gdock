'use strict';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import { GDock, GDockItem } from './dock.js';

export default class GDockExtension extends Extension {
  enable() {
    console.log('The Gnome Dock - enabled');
    this._gdock = new GDock();
    Main.uiGroup.add_child(this._gdock);

    let item = new GDockItem();
    this._gdock.add_child(item);
    this._gdock.slide_out();

    Main.overview.gdock = this;
  }

  disable() {
    Main.uiGroup.remove_child(this._gdock);
    this._gdock = null;
    console.log('The Gnome Dock - disabled');
  }
}
