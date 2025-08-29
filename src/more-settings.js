import Gio from "gi://Gio";
import Adw from "gi://Adw";
import GObject from "gi://GObject";

/**
 * These CheckButton Ids should be the same as
 * their corresponding settings in the gschema.
 *
 */
const endiannessSettingsCheckBtnIds = ["le", "be"];

export const MoreSettings = GObject.registerClass(
  {
    GTypeName: "MoreSettings",
    Template: getResourceURI("more-settings.ui"),
    InternalChildren: [
      "radix",
      ...endiannessSettingsCheckBtnIds,
    ],
    Properties: {
      /**
       * There is no way of directly binding gschema settings
       * to the CheckButtons. The settings are first bound to
       * these properties and these properties are bound to the
       * CheckButtons' active properties.
       */
     
      endianness: GObject.ParamSpec.string(
        "endianness",
        "Endianness",
        "Machine endianness",
        GObject.ParamFlags.READWRITE,
        ""
      ),
      radix: GObject.ParamSpec.string(
        "radix",
        "Radix",
        "Number base",
        GObject.ParamFlags.READWRITE,
        ""
      ),
    },
  },
  class MoreSettings extends Adw.PreferencesDialog {
    constructor(options = {}) {
      super(options);

      this.settings = Gio.Settings.new(pkg.name);
      this.settings.bind(
        "endianness",
        this,
        "endianness",
        Gio.SettingsBindFlags.DEFAULT
      );
      this.settings.bind("radix", this, "radix", Gio.SettingsBindFlags.DEFAULT);

      for (const checkBtnId of endiannessSettingsCheckBtnIds) {
        this.bindCheckBtns("endianness", checkBtnId);
      }

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
        }
      );
    }

    bindCheckBtns = (sourceProp, btnId) => {
      this.bind_property_full(
        sourceProp,
        this[`_${btnId}`],
        "active",
        GObject.BindingFlags.BIDIRECTIONAL | GObject.BindingFlags.SYNC_CREATE,
        (binding, setting) => [true, setting === btnId],
        (binding, active) => [active, btnId]
      );
    };
  }
);
