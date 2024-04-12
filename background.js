'use strict';

import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import Cairo from 'gi://cairo';
import St from 'gi://St';

import GdkPixbuf from 'gi://GdkPixbuf';
import Gio from 'gi://Gio';

import { Drawing } from './drawing.js';

export let BackgroundCanvas = GObject.registerClass(
  {},
  class BackgroundCanvas extends St.DrawingArea {
    _init(settings = {}) {
      super._init({
        width: 128,
        height: 128,
        style_class: 'dock-box',
      });
    }

    redraw() {
      this.queue_repaint();
    }

    vfunc_repaint() {
      let ctx = this.get_context();
      let [width, height] = this.get_surface_size();

      let size = width;

      const hd_color = 'red';
      const bg_color = 'white';
      const day_color = 'black';
      const date_color = 'red';

      ctx.setOperator(Cairo.Operator.CLEAR);
      ctx.paint();

      ctx.setOperator(Cairo.Operator.SOURCE);

      let rad_percent = 0.4;
      let rad = height * rad_percent;
      if (width < height) {
        rad = width * rad_percent;
      }

      Drawing.draw_rounded_rect(
        ctx,
        [0, 0, 0, 0.7],
        0,
        0,
        width,
        height,
        0,
        rad
      );

      ctx.$dispose();
    }
  }
);
