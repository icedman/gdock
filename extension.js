'use strict';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

import Gio from 'gi://Gio';
import Cairo from 'gi://cairo';
import GdkPixbuf from 'gi://GdkPixbuf';

import { Services } from './services.js';
import { DockPosition, GDock } from './dock.js';
import { GDockIconItem, GDockDashItem, GDockPanelItem } from './dockItems.js';

const schemaId = 'org.gnome.shell.extensions.gdock';

export default class GDockExtension extends Extension {
  enable() {
    this.services = new Services(this);
    this.services.enable();

    this._settings = this.getSettings(schemaId);
    let keys = this._settings.list_keys();
    keys.forEach((k) => {
      this._settings.connectObject(`changed::${k}`, (n, v) => {
        this.services.refresh_setting(k, this._settings);
      });
      this.services.refresh_setting(k, this._settings);
    });

    console.log('The Gnome Dock - enabled');

    this.docks = [
      new GDock({ child: new GDockDashItem(), position: this.services._position }),
      // new GDock({ child: new GDockPanelItem(), position: DockPosition.TOP }),
      // new GDock({ child: new GDockIconItem(), position: DockPosition.RIGHT }),
    ];

    Main.overview.gdock = this;
  }

  disable() {
    this.docks.forEach((d) => {
      d.undock();
    });
    this.docks = null;

    this.services.disable();
    this.services = null;
    console.log('The Gnome Dock - disabled');
  }
}
