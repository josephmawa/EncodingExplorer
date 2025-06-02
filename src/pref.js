import Adw from "gi://Adw";
import GObject from "gi://GObject";
import Gio from "gi://Gio";

/**
 * These CheckButton Ids should be the same as
 * their corresponding settings in the gschema.
 *
 */
const themeSettingsCheckBtnIds = ["system", "light", "dark"];
const endiannessSettingsCheckBtnIds = ["le", "be"];
const encodingModeSettingsCheckBtnIds = ["text_encoding", "ieee_754"];

export const PrefDialog = GObject.registerClass(
  {
    GTypeName: "PrefDialog",
    Template: getResourceURI("pref.ui"),
    InternalChildren: [
      ...themeSettingsCheckBtnIds,
      ...endiannessSettingsCheckBtnIds,
      ...encodingModeSettingsCheckBtnIds,
    ],
    Properties: {
      /**
       * There is no way of directly binding gschema settings
       * to the CheckButtons. The settings are first bound to
       * these properties and these properties are bound to the
       * CheckButtons' active properties.
       */
      theme: GObject.ParamSpec.string(
        "theme",
        "Theme",
        "Preferred theme",
        GObject.ParamFlags.READWRITE,
        ""
      ),
      endianness: GObject.ParamSpec.string(
        "endianness",
        "Endianness",
        "Machine endianness",
        GObject.ParamFlags.READWRITE,
        ""
      ),
      encoding_mode: GObject.ParamSpec.string(
        "encoding_mode",
        "encoding-mode",
        "Encoding Mode",
        GObject.ParamFlags.READWRITE,
        ""
      ),
    },
  },
  class PrefDialog extends Adw.PreferencesDialog {
    constructor(options = {}) {
      super(options);

      this.settings = Gio.Settings.new(pkg.name);
      this.settings.bind(
        "preferred-theme",
        this,
        "theme",
        Gio.SettingsBindFlags.DEFAULT
      );
      this.settings.bind(
        "endianness",
        this,
        "endianness",
        Gio.SettingsBindFlags.DEFAULT
      );
      this.settings.bind(
        "encoding-mode",
        this,
        "encoding_mode",
        Gio.SettingsBindFlags.DEFAULT
      );

      for (const checkBtnId of themeSettingsCheckBtnIds) {
        this.bindCheckBtns("theme", checkBtnId);
      }

      for (const checkBtnId of endiannessSettingsCheckBtnIds) {
        this.bindCheckBtns("endianness", checkBtnId);
      }

      for (const checkBtnId of encodingModeSettingsCheckBtnIds) {
        this.bindCheckBtns("encoding_mode", checkBtnId);
      }
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
