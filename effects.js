'use strict';

import Graphene from 'gi://Graphene';

import { get_distance_sqr } from './utils.js';
import { DockPosition } from './dock.js';

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
  },
};

const ANIM_ICON_RAISE = 0.6;
const ANIM_ICON_SCALE = 1.5;
const ANIM_ICON_HIT_AREA = 2.5;

export class IconsAnimator {
  _inspectIcon(c) {
    if (!c.visible) return false;

    /* separator */
    c._cls = c._cls || c.get_style_class_name();
    if (c._cls === 'dash-separator') {
      this._separators.push(c);
      this._iconsAndSeparators.push(c);
      if (!c._destroyConnectId) {
        c._destroyConnectId = c.connect('destroy', () => {
          this._icons = null;
          console.log('separator destroyed');
        });
      }
      c.visible = true;
      // c.style = 'margin-left: 8px; margin-right: 8px;';
      return false;
    }

    /* ShowAppsIcon */
    if (c.icon /* IconGrid */ && c.icon.icon /* StIcon */) {
      c._icon = c.icon.icon;
      c._button = c.child;
      c.icon.style = 'background-color: transparent !important;';
    }

    /* DashItemContainer */
    if (
      c.child /* DashIcon */ &&
      c.child.icon /* IconGrid */ &&
      c.child.icon.icon /* StIcon */
    ) {
      c._grid = c.child.icon;
      c._icon = c.child.icon.icon;
      c._appwell = c.child;
      if (c._appwell) {
        c._appwell.visible = true;
        c._dot = c._appwell._dot;
      }
      if (c._dot) {
        c._dot.opacity = 0;
      }
    }

    if (c._icon) {
      // renderer takes care of displaying an icon
      // c._icon.opacity = 0;
      c._label = c.label;

      this._icons.push(c);
      this._iconsAndSeparators.push(c);
      return true;
    }

    return false;
  }

  findIcons(sources) {
    this._iconsAndSeparators = [];
    this._separators = [];
    this._icons = [];

    sources.forEach((src) => {
      src.forEach((icon) => {
        this._inspectIcon(icon);
      });
    });

    let pv = new Graphene.Point();
    pv.init(0.5, 0.5);
    this._icons.forEach((icon) => {
      icon._icon.pivot_point = pv;
    });
    return this._icons;
  }

  animate(dt, pointer) {
    let position = DockPosition.BOTTOM;
    let vertical = false;
    let didAnimate = false;

    let [px, py] = pointer;
    let animateIcons = this._icons;
    let iconSize = 64; // dock._iconSizeScaledDown;
    let scaleFactor = 1; // dock._scaleFactor;

    let nearestIdx = -1;
    let nearestIcon = null;
    let nearestDistance = -1;

    let iconCenterOffset = (iconSize * scaleFactor) / 2;
    let hitArea = iconSize * ANIM_ICON_HIT_AREA * scaleFactor;
    hitArea *= hitArea;

    let idx = 0;
    animateIcons.forEach((icon) => {
      let pos = icon.get_transformed_position();
      icon._pos = [...pos];
      icon._fixedPosition = [...pos];

      // get nearest
      let bposcenter = [...pos];
      bposcenter[0] += iconCenterOffset;
      bposcenter[1] += iconCenterOffset;
      let dst = get_distance_sqr(pointer, bposcenter);

      if (
        // isWithin &&
        (nearestDistance == -1 || nearestDistance > dst) &&
        dst < hitArea
      ) {
        nearestDistance = dst;
        nearestIcon = icon;
        nearestIdx = idx;
        icon._distance = dst;
      }

      icon._target = pos;
      icon._targetScale = 1;

      idx++;
    });

    //------------------------
    // animation behavior
    //------------------------
    let rise = 0.35 * ANIM_ICON_RAISE;
    let magnify = 0.35 * ANIM_ICON_SCALE;
    let spread = 0.25;

    // when not much spreading, minimize magnification
    if (spread < 0.2) {
      magnify *= 0.8;
    }
    // when too much magnification, increase spreading
    if (magnify > 0.5 && spread < 0.55) {
      spread = 0.55 + spread * 0.2;
    }

    let threshold = (iconSize + 10) * 2.5 * scaleFactor;

    // animate
    let iconTable = [];
    animateIcons.forEach((icon) => {
      let original_pos = [...icon._pos];

      // used by background resizing and repositioning
      icon._fixedPosition = [...original_pos];

      original_pos[0] += icon.width / 2;
      original_pos[1] += icon.height / 2;

      icon._pos = [...original_pos];
      icon._translate = 0;
      icon._translateRise = 0;

      iconTable.push(icon);

      let scale = 1;
      let dx = original_pos[0] - px;
      if (vertical) {
        dx = original_pos[1] - py;
      }

      //! _p replace with a more descriptive variable name
      icon._p = 0;
      if (dx * dx < threshold * threshold && nearestIcon) {
        let adx = Math.abs(dx);
        let p = 1.0 - adx / threshold;
        let fp = p * 0.6 * (1 + magnify);
        icon._p = p;

        // affect scale;
        if (magnify != 0) {
          scale += fp;
        }

        // affect rise
        let sz = iconSize * fp * scaleFactor;
        icon._translateRise = sz * 0.1 * rise;
      }

      icon._scale = scale;
      icon._targetScale = scale;

      //! what is the difference between set_size and set_icon_size? and effects
      // set_icon_size resizes the image... avoid changing per frame
      // set_size resizes the widget
      // icon._icon.set_size(iconSize * scale, iconSize * scale);

      if (icon._icon.gicon.file != null) {
        // skip scaling image files!... too costly
      } else {
        icon._icon.set_scale(scale, scale);
        if (scale > 1) {
          didAnimate = true;
        }
      }

      if (!icon._pos) {
        return;
      }
    });

    // spread
    //! use better collision test here?
    let hoveredIcon = null;
    for (let i = 0; i < iconTable.length; i++) {
      if (iconTable.length < 2) break;
      let icon = iconTable[i];
      if (icon._icon && icon._icon.hover) {
        hoveredIcon = icon;
      }
      if (icon._scale > 1.1) {
        // affect spread
        let offset =
          1.25 * (icon._scale - 1) * iconSize * scaleFactor * spread * 0.8;
        let o = offset;
        // left
        for (let j = i - 1; j >= 0; j--) {
          let left = iconTable[j];
          left._translate -= offset;
          o *= 0.98;
        }
        // right
        o = offset;
        for (let j = i + 1; j < iconTable.length; j++) {
          let right = iconTable[j];
          right._translate += offset;
          o *= 0.98;
        }
      }
    }

    // re-center to hovered icon
    let TRANSLATE_COEF = 24;
    if (nearestIcon) {
      nearestIcon._targetScale += 0.1;
      let adjust = nearestIcon._translate / 2;
      animateIcons.forEach((icon) => {
        if (icon._scale > 1) {
          let o = -adjust * (2 - icon._scale);
          let nt = icon._translate - o;
          icon._translate =
            (icon._translate * TRANSLATE_COEF + nt) / (TRANSLATE_COEF + 1);
        }
      });
    }

    let first = animateIcons[0];
    let last = animateIcons[animateIcons.length - 1];

    let slowDown = 1; // !nearestIcon || !animated ? 0.75 : 1;
    let lockPosition =
      didAnimate && first && last && first._p == 0 && last._p == 0;

    animateIcons.forEach((icon) => {
      // this fixes jittery hovered icon
      if (icon._targetScale > 1.9) icon._targetScale = 2;

      icon._scale = icon._targetScale;

      //! make these computation more readable even if more verbose
      let rdir =
        position == DockPosition.TOP || position == DockPosition.LEFT ? 1 : -1;

      let translationX = icon._translate;
      let translationY = icon._translateRise * rdir;
      if (vertical) {
        translationX = icon._translateRise * rdir;
        translationY = icon._translate;
      }

      let adjustX = 0;
      let adjustY = 0;

      let [targetSize] = icon._icon.get_transformed_size();
      if (targetSize > icon.height) {
        let rise = (targetSize - icon.height) * 0.5;
        if (vertical) {
          adjustX += rise * (position == DockPosition.LEFT ? 1 : -1);
        } else {
          adjustY += rise * (position == DockPosition.BOTTOM ? -1 : 1);
        }
      }

      // fix jitterness
      if (lockPosition && icon._p == 0) {
        icon._positionCache = icon._positionCache || [];
        if (icon._positionCache.length > 16) {
          [translationX, translationY] =
            icon._positionCache[icon._positionCache.length - 1];
        } else {
          icon._positionCache.push([translationX, translationY]);
        }
      } else {
        icon._positionCache = null;
      }

      //-------------------
      // animate position
      //-------------------
      icon._icon.translationX = (icon._icon.translationX + translationX) / 2;
      icon._icon.translationY = (icon._icon.translationY + translationY) / 2;

      icon._icon.get_parent().translationX = adjustX;
      icon._icon.get_parent().translationY = adjustY;

      //------------------
      // adjust the labels
      //-------------------
      let flags = {
        bottom: {
          lx: 0,
          ly: 0.5 * icon._targetScale * scaleFactor,
        },
        top: {
          lx: 0,
          ly: -1.5 * icon._targetScale * scaleFactor,
        },
        left: {
          lx: -1.25 * icon._targetScale * scaleFactor,
          ly: -1.25,
        },
        right: {
          lx: 1.5 * icon._targetScale * scaleFactor,
          ly: -1.25,
        },
      };

      let posFlags = flags[position];

      // labels
      if (icon._label) {
        icon._label.translationX = translationX - iconSize * posFlags.lx;
        icon._label.translationY = translationY - iconSize * posFlags.ly;
      }
    });

    this._is_animating = didAnimate;
    return didAnimate;
  }
}
