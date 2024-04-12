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
        style_class: 'dock-box'
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

      ctx.save();
      ctx.moveTo(0, 0);
      ctx.lineTo(size, 0);
      ctx.lineTo(size, size);
      ctx.lineTo(0, size);
      ctx.lineTo(0, 0);
      ctx.fill();
      ctx.restore();

      ctx.$dispose();
    }
  }
);
