'use strict';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import Gio from 'gi://Gio';
import Graphene from 'gi://Graphene';

import { Dash } from 'resource:///org/gnome/shell/ui/dash.js';

import { IconsAnimator, Interpolate, Linear, Bounce } from './effects.js';
import { BackgroundCanvas } from './background.js';
import { GDockItem, DockPosition } from './dock.js';
import { Services } from './services.js';

const ICON_QUALITY = 2;

export let GDockIconItem = GObject.registerClass(
  {},
  class GDockIconItem extends GDockItem {
    _init(params) {
      super._init({
        name: 'GDockItem',
        reactive: false,
        track_hover: false,
        width: 64,
        height: 64,
        clip_to_allocation: false,
        x_align: Clutter.ActorAlign.CENTER,
        y_align: Clutter.ActorAlign.CENTER,
        offscreen_redirect: Clutter.OffscreenRedirect.ALWAYS,
      });

      let gicon = new Gio.ThemedIcon({ name: 'folder' });
      let icon = new St.Icon({ gicon: gicon });
      icon.set_icon_size(64);
      icon.set_size(64, 64);
      this.add_child(icon);
    }
  }
);

export let GDockDashItem = GObject.registerClass(
  {},
  class GDockDashItem extends GDockItem {
    _init(params) {
      super._init({
        name: 'GDockItem',
        reactive: false,
        track_hover: false,
        width: 64,
        height: 64,
        clip_to_allocation: false,
        x_align: Clutter.ActorAlign.CENTER,
        y_align: Clutter.ActorAlign.CENTER,
        offscreen_redirect: Clutter.OffscreenRedirect.ALWAYS,
        style_class: 'dock-box',
        layout_manager: new Clutter.BinLayout(),
      });

      this.style = 'border: 2px solid red;';

      this._icon_size = 64;

      this.dash = new Dash();
      this.dash._adjustIconSize = () => {};
      this.dash._box.clip_to_allocation = false;
      // this.dash._showAppsIcon.visible = false;
      this.dash._background.visible = false;

      this.show_apps_at_front = true;

      this.dash.reactive = true;
      this.dash.track_hover = true;
      this.dash.connectObject(
        'motion-event',
        () => {
          if (this.dock) {
            this.dock.begin_animation();
          }
        },
        this
      );

      this.add_child(this.dash);

      this.animator = new IconsAnimator();
    }

    _prepare_icons() {
      let iconSources = [];

      if (this.dash._box.visible) {
        iconSources.push(this.dash._box.get_children());
      }
      if (this.dash._showAppsIcon.visible) {
        if (this.show_apps_at_front) {
          iconSources.unshift([this.dash._showAppsIcon]);
        } else {
          iconSources.push([this.dash._showAppsIcon]);
        }
      }

      this._icons = this.animator.findIcons(iconSources);
      if (this._icons.length == 0) {
        return;
      }

      let iconQualitySize = this._icon_size * ICON_QUALITY;

      this._icons.forEach((c) => {
        if (c._hooked) {
          return;
        }

        c._icon.set_size(this._icon_size, this._icon_size);
        c._icon.set_icon_size(this._icon_size);

        let pv = new Graphene.Point();
        pv.init(0.5, 0.5);
        c._icon.pivot_point = pv;

        c._icon.remove_all_transitions();

        let cp = c._icon.get_parent();
        cp.layoutManager = new Clutter.FixedLayout();
        c._icon.layoutManager = new Clutter.FixedLayout();
        cp.set_size(this._icon_size, this._icon_size);
        c._icon.set_icon_size(iconQualitySize);
        c._icon.set_size(iconQualitySize, iconQualitySize);
        // cp._icon

        c._hooked = true;
        c._icon.track_hover = true;
        c._icon.reactive = true;
        if (c._grid) {
          c._grid.style = 'background: none !important;';
        }

        if (c._appwell && !c._appwell._activate) {
          c._appwell._activate = c._appwell.activate;
          c._appwell.activate = () => {
            try {
              this._maybeBounce(c);
              c._appwell._activate();
            } catch (err) {
              // happens with dummy DashIcons
            }
          };
        }
      });
    }

    layout(dock) {
      this.dock = dock;
      let vertical = dock.is_vertical();

      this._icon_size = Services.instance().icon_size || 48;

      this._prepare_icons();

      this.dash.last_child.layout_manager.orientation = vertical;
      this.dash._box.layout_manager.orientation = vertical;

      let padding = 32; // allow padding, otherwise dash is misaligned?
      this.width = this.dash.width + padding;
      this.height = this._icon_size + padding;
      if (vertical) {
        this.width = this._icon_size + padding;
        this.height = this.dash.height + padding;
      }

      this.dock._snap_to_container_edge(this, this.dash);

      // showAppsAtFront
      let container = this.dash._box.get_parent();
      if (
        container.first_child != this.dash._showAppsIcon &&
        this.show_apps_at_front
      ) {
        container.remove_child(this.dash._showAppsIcon);
        container.insert_child_below(
          this.dash._showAppsIcon,
          container.first_child
        );
      }
      if (
        container.first_child == this.dash._showAppsIcon &&
        !this.show_apps_at_front
      ) {
        container.remove_child(this.dash._showAppsIcon);
        container.add_child(this.dash._showAppsIcon, container.first_child);
      }

      let pad_width = this._icon_size * 2;
      let pad_height = this._icon_size * 2;

      let dock_width = this.width + pad_width;
      let dock_height = this.height + pad_height;
      if (vertical) {
        dock_height = this.dock._monitor.height;
      } else {
        dock_width = this.dock._monitor.width;
      }

      return {
        dock_width,
        dock_height,
        struts_width: this.dash.width + dock._edge_distance,
        struts_height: this.dash.height + dock._edge_distance,
      };
    }

    on_animate(dt) {
      if (!this.dock) return;

      // render background here
      if (!this._background) {
        this._background = new BackgroundCanvas();
        this.dock._background.add_child(this._background);
      }

      let iconQualitySize = this._icon_size * ICON_QUALITY;
      let scaleFactor = this.dock._monitor.geometry_scale;

      this._icons.forEach((c) => {
        let cp = c._icon.get_parent();
        if (c._icon.icon_size != iconQualitySize) {
          cp.set_size(this._icon_size, this._icon_size);
          c._icon.set_icon_size(iconQualitySize);
        }
        let sz = this._icon_size / c._icon.icon_size / scaleFactor;
        cp.set_scale(sz, sz);
      });

      let first = this._icons[0];
      let last = this._icons[this._icons.length - 1];

      first.style = 'border: 1px solid yellow';

      let parentScale = first._icon.get_parent().scaleX;

      let [px, py] = first.get_transformed_position();
      let container = this.get_parent();
      this._background.x = (px || 0) - container.x;
      this._background.y = (py || 0) - container.y;

      if (this.dock.is_vertical()) {
        this._background.width = this._icon_size + 4 * scaleFactor;
        this._background.height = this.dash.height + 4 * scaleFactor;
        this._background.y += first._icon.translationY * parentScale;
        this._background.height +=
          -first._icon.translationY * parentScale +
          last._icon.translationX * parentScale;
      } else {
        this._background.width = this.dash.width + 4 * scaleFactor;
        this._background.height = this._icon_size + 4 * scaleFactor;
        this._background.x +=
          first._icon.translationX * first._icon.get_parent().scaleX;
        this._background.width +=
          -first._icon.translationX * parentScale +
          last._icon.translationX * parentScale;
      }

      this._background.x -= this.translationX;
      this._background.y -= this.translationY;

      // render foreground here

      let didAnimate = this.animator.animate(dt, {
        dock: this.dock,
        pointer: global.get_pointer(),
        iconSize: this._icon_size,
        scaleFactor: this.dock._monitor.geometry_scale,
      });

      if (!this.animator._hoveredIcon && !this.dash.hover) {
        // didAnimate = false;
      }

      return didAnimate;
    }

    _maybeBounce(container) {
      if (
        !container.child.app ||
        (container.child.app &&
          container.child.app.get_n_windows &&
          !container.child.app.get_n_windows())
      ) {
        if (container.child) {
          this._bounceIcon(container.child);
        }
      }
    }

    _bounceIcon(appwell) {
      let services = Services.instance();
      let dock = this.dock;

      const BOUNCE_HEIGHT = 0.5;

      // let scaleFactor = dock.getMonitor().geometry_scale;
      //! why not scaleFactor?
      let travel = (this._icon_size / 3) * ((0.25 + BOUNCE_HEIGHT) * 1.5);
      // * scaleFactor;
      appwell.translation_y = 0;

      let container = appwell.get_parent();
      let icon = container._icon;

      const translateDecor = (container, appwell) => {
        if (container._renderer) {
          container._renderer.translationY = appwell.translationY;
        }
        if (container._image) {
          container._image.translationY = appwell.translationY;
        }
        if (container._badge) {
          container._badge.translationY = appwell.translationY;
        }
      };

      let t = 250;
      let _frames = [
        {
          _duration: t,
          _func: (f, s) => {
            let res = Linear.easeNone(f._time, 0, travel, f._duration);
            if (dock.is_vertical()) {
              appwell.translation_x =
                dock._position == DockPosition.LEFT ? res : -res;
            } else {
              appwell.translation_y =
                dock._position == DockPosition.BOTTOM ? -res : res;
            }
            translateDecor(container, appwell);
          },
        },
        {
          _duration: t * 3,
          _func: (f, s) => {
            let res = Bounce.easeOut(f._time, travel, -travel, f._duration);
            if (dock.is_vertical()) {
              appwell.translation_x = appwell.translation_x =
                dock._position == DockPosition.LEFT ? res : -res;
            } else {
              appwell.translation_y =
                dock._position == DockPosition.BOTTOM ? -res : res;
              if (container._renderer) {
                container._renderer.translationY = appwell.translationY;
              }
            }
            translateDecor(container, appwell);
          },
        },
      ];

      let frames = [];
      for (let i = 0; i < 3; i++) {
        _frames.forEach((b) => {
          frames.push({
            ...b,
          });
        });
      }

      services.hiTimer.runAnimation([
        ...frames,
        {
          _duration: 10,
          _func: (f, s) => {
            appwell.translation_y = 0;
            translateDecor(container, appwell);
          },
        },
      ]);
    }
  }
);

export let GDockPanelItem = GObject.registerClass(
  {},
  class GDockPanelItem extends GDockItem {
    _init(params) {
      super._init({
        name: 'GDockItem',
        reactive: false,
        track_hover: false,
        width: 64,
        height: 64,
        clip_to_allocation: false,
        x_align: Clutter.ActorAlign.CENTER,
        y_align: Clutter.ActorAlign.CENTER,
        offscreen_redirect: Clutter.OffscreenRedirect.ALWAYS,
        // style_class: 'dock-box',
      });

      this.panel = Main.panel;
    }

    layout(dock) {
      this.dock = dock;

      if (dock.is_vertical()) {
        dock.visible = false;
        this.width = 0;
        this.height = 0;
        return {
          dock_width: 0,
          dock_height: 0,
        };
      }

      dock.visible = true;

      this.panel.width = dock._monitor.width * 0.8;
      this.panel.height = 48;

      let pad_width = 0;
      let pad_height = 0;
      this.width = this.panel.width;
      this.height = this.panel.height;

      return {
        dock_width: this.width + pad_width,
        dock_height: this.height + pad_height,
      };
    }

    on_animate(dt) {
      // render background here
      if (!this._background) {
        this._background = new BackgroundCanvas();
        this.dock._background.add_child(this._background);
      }

      this._background.x = this.x;
      this._background.y = this.y;
      this._background.width = this.width;
      this._background.height = this.height;
      this._background.translationX = this.translationX;
      this._background.translationY = this.translationY;
    }

    on_dock(dock) {
      Main.layoutManager.panelBox.remove_child(Main.panel);
      this.add_child(this.panel);
    }

    on_undock(dock) {
      this.remove_child(this.panel);
      Main.layoutManager.panelBox.add_child(Main.panel);
    }
  }
);
