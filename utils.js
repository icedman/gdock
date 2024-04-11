'use strict';

import GLib from 'gi://GLib';

export const get_distance_sqr = (pos1, pos2) => {
  let a = pos1[0] - pos2[0];
  let b = pos1[1] - pos2[1];
  return a * a + b * b;
};

export const get_distance = (pos1, pos2) => {
  return Math.sqrt(get_distance_sqr(pos1, pos2));
};

export const isOverlapRect = (r1, r2) => {
  let [r1x, r1y, r1w, r1h] = r1;
  let [r2x, r2y, r2w, r2h] = r2;
  // are the sides of one rectangle touching the other?
  if (
    r1x + r1w >= r2x && // r1 right edge past r2 left
    r1x <= r2x + r2w && // r1 left edge past r2 right
    r1y + r1h >= r2y && // r1 top edge past r2 bottom
    r1y <= r2y + r2h
  ) {
    // r1 bottom edge past r2 top
    return true;
  }
  return false;
};

export const isInRect = (r, p, pad) => {
  let [x1, y1, w, h] = r;
  let x2 = x1 + w;
  let y2 = y1 + h;
  let [px, py] = p;
  return px + pad >= x1 && px - pad < x2 && py + pad >= y1 && py - pad < y2;
};
