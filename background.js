'use strict';

import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import Cairo from 'gi://cairo';
import St from 'gi://St';

import { Drawing } from '../drawing.js';

const BackgroundCanvas = GObject.registerClass(
  {},
  class BackgroundCanvas extends St.DrawingArea {
    _init(settings = {}) {
      super._init();

      this.settings = {
        dark_color: [0.2, 0.2, 0.2, 1.0],
        light_color: [1.0, 1.0, 1.0, 1.0],
        accent_color: [1.0, 0.0, 0.0, 1.0],
        ...settings,
      };
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

      ctx.translate(size / 2, size / 2);
      ctx.setLineWidth(1);
      ctx.setLineCap(Cairo.LineCap.ROUND);
      ctx.setOperator(Cairo.Operator.SOURCE);

      let bgSize = size * 0.85;
      let offset = size - bgSize;

      const d0 = new Date();

      Drawing.draw_rounded_rect(
        ctx,
        bg_color,
        -size / 2 + offset / 2,
        -size / 2 + offset / 2,
        bgSize,
        bgSize,
        0,
        16
      );
      Drawing.set_color(ctx, date_color, 1.0);
      ctx.moveTo(0, 14);
      Drawing.draw_text(ctx, `${d0.getDate()}`, 'DejaVuSans 40');

      let dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      Drawing.set_color(ctx, day_color, 1.0);
      ctx.moveTo(0, -24);
      Drawing.draw_text(ctx, `${dayNames[d0.getDay()]}`, 'DejaVuSans 20');

      ctx.$dispose();
    }
  }
);
