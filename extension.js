'use strict';

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

export default class GDockExtension extends Extension {
  enable() {
    console.log('The Gnome Dock - enabled');
  }

  disable() {
    console.log('The Gnome Dock - disabled');
  }
}