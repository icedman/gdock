import { Vector } from './utils.js';

export const Interpolate = {
  linearTo: (start, end, time, speed) => {
    let dst = end - start;
    let mag = Math.abs(dst);
    let dir = Math.sign(dst);
    let adv = speed * time;
    if (adv > mag) {
      return end;
    }
    return start + adv * dir;
  }
};
