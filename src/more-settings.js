import Gio from "gi://Gio";
import Adw from "gi://Adw";
import GObject from "gi://GObject";

export const MoreSettings = GObject.registerClass(
  {
    GTypeName: "MoreSettings",
    Template: getResourceURI("more-settings.ui"),
    InternalChildren: ["radix"],
    Properties: {
      /**
       * There is no way of directly binding GSettings
       * to the ComboRow. The settings are first bound to
       * this property and this property is bound to the
       * ComboRow's selected property.
       */
      radix: GObject.ParamSpec.string(
        "radix",
        "Radix",
        "Number base",
        GObject.ParamFlags.READWRITE,
        "",
      ),
    },
  },
  class MoreSettings extends Adw.PreferencesDialog {
    constructor(options = {}) {
      super(options);

      this.settings = Gio.Settings.new(pkg.name);
      this.settings.bind("radix", this, "radix", Gio.SettingsBindFlags.DEFAULT);
      this.bind_property_full(
        "radix",
        this._radix,
        "selected",
        GObject.BindingFlags.BIDIRECTIONAL | GObject.BindingFlags.SYNC_CREATE,
        (binding, radix) => {
          let selected;
          let model = this._radix.model;
          for (let i = 0; i < model.n_items; i++) {
            if (model.get_item(i)?.string === radix) {
              selected = i;
              break;
            }
          }
          return [true, selected];
        },
        (binding, selected) => {
          const radix = this._radix.model.get_item(selected)?.string;
          return [true, radix];
        },
      );
    }
  },
);
