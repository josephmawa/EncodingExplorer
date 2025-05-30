import GObject from "gi://GObject";
import Gtk from "gi://Gtk";

export const ScrolledWin = GObject.registerClass(
  {
    GTypeName: "ScrolledWin",
    Template: getResourceURI("scrolled-win.ui"),
  },
  class ScrolledWin extends Gtk.ScrolledWindow {
    constructor(options = {}) {
      super(options);
    }
  }
);
