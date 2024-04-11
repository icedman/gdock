'use strict';

import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import St from 'gi://St';

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
  });

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
            },
        });
    }

    slide_out() {
        let child = this.first_child;
        // child.translationX = -child.width;
        child.ease({
            translationX: -child.width,
            duration: 1500,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            onComplete: () => {
                console.log('slide out!');
                child._hidden = true;
            },
        });
    }
});