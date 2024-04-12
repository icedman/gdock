'use strict';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

import Gio from 'gi://Gio';
import Cairo from 'gi://cairo';
import GdkPixbuf from 'gi://GdkPixbuf';

import { Services } from './services.js';
import { DockPosition, GDock } from './dock.js';
import { GDockIconItem, GDockDashItem, GDockPanelItem } from './dockItems.js';

export default class GDockExtension extends Extension {
  enable() {
    this.services = new Services(this);
    this.services.enable();

    console.log('The Gnome Dock - enabled');

    this.docks = [
      new GDock({ child: new GDockDashItem(), position: DockPosition.BOTTOM }),
      new GDock({ child: new GDockPanelItem(), position: DockPosition.TOP }),
      new GDock({ child: new GDockIconItem(), position: DockPosition.LEFT }),
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
