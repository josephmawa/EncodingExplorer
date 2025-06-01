import Adw from "gi://Adw";
import GObject from "gi://GObject";
import Gio from "gi://Gio";

const themes = ["system", "light", "dark"];
const endianness = ["le", "be"];
const encodingMode = ["text_encoding", "ieee_754"];

export const PrefDialog = GObject.registerClass(
  {
    GTypeName: "PrefDialog",
    Template: getResourceURI("pref.ui"),
    InternalChildren: [...themes, ...endianness, ...encodingMode],
    Properties: {
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

      for (const theme of themes) {
        this.bind_property_full(
          "theme",
          this[`_${theme}`],
          "active",
          GObject.BindingFlags.BIDIRECTIONAL | GObject.BindingFlags.SYNC_CREATE,
          (binding, currTheme) => [true, currTheme === theme],
          (binding, active) => [active, theme]
        );
      }

      for (const currEndianness of endianness) {
        this.bind_property_full(
          "endianness",
          this[`_${currEndianness}`],
          "active",
          GObject.BindingFlags.BIDIRECTIONAL | GObject.BindingFlags.SYNC_CREATE,
          (binding, pickedEndianness) => [
            true,
            pickedEndianness === currEndianness,
          ],
          (binding, active) => [active, currEndianness]
        );
      }

      for (const mode of encodingMode) {
        this.bind_property_full(
          "encoding_mode",
          this[`_${mode}`],
          "active",
          GObject.BindingFlags.BIDIRECTIONAL | GObject.BindingFlags.SYNC_CREATE,
          (binding, currEncodingMode) => [
            true,
            currEncodingMode === mode,
          ],
          (binding, active) => [active, mode]
        );
      }
    }
  }
);
