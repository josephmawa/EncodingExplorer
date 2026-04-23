import Adw from "gi://Adw";
import GObject from "gi://GObject";

export const PrefDialog = GObject.registerClass(
  {
    GTypeName: "PrefDialog",
    Template: getResourceURI("pref.ui"),
  },
  class PrefDialog extends Adw.PreferencesDialog {
    constructor(options = {}) {
      super(options);
    }
  },
);
