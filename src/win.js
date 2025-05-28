import GObject from "gi://GObject";
import Adw from "gi://Adw";
import Gtk from "gi://Gtk";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import GtkSource from "gi://GtkSource?version=5";

GObject.type_ensure(GtkSource.View.$gtype);
const textEncoder = new TextEncoder();

export const EncodingExplorerWindow = GObject.registerClass(
  {
    GTypeName: "EncodingExplorerWindow",
    Template: getResourceURI("win.ui"),
    InternalChildren: [
      "toast_overlay",
      "source_view_text",
      "source_view_encoding",
    ],
  },
  class EncodingExplorerWindow extends Adw.ApplicationWindow {
    constructor(application) {
      super({ application });

      this.loadStyles();
      this.createBuffer();
      this.bindSettings();
      this.setColorScheme();
    }

    createBuffer = () => {
      this.buffer_text = new GtkSource.Buffer();
      this.buffer_encoding = new GtkSource.Buffer();

      if (!this.handleBufferChange) {
        this.handleBufferChange = this.debounce(this.encodeText, 300);
      }

      this.buffer_text.connect("changed", this.handleBufferChange);

      const tagTableText = this.buffer_text.tag_table;

      tagTableText.add(
        new Gtk.TextTag({
          name: "redForeground",
          foreground: "#b30000",
        })
      );
      tagTableText.add(
        new Gtk.TextTag({
          name: "redBackground",
          background: "#fadad7",
        })
      );
      tagTableText.add(
        new Gtk.TextTag({
          name: "blueForeground",
          foreground: "#406619",
        })
      );
      tagTableText.add(
        new Gtk.TextTag({
          name: "blueBackground",
          background: "#eaf2c2",
        })
      );

      this._source_view_text.buffer = this.buffer_text;
      this._source_view_encoding.buffer = this.buffer_encoding;
    };

    encodeText = () => {
      const text = this.buffer_text.text;
      
      const codeUnits = [...textEncoder.encode(text)];
      const encodedText = codeUnits.map((codeUnit) => {
        return codeUnit.toString(2).padStart(8, "0");
      });

      this.buffer_encoding.text = encodedText.join(" ");
    };

    bindSettings = () => {
      if (!this.settings) {
        this.settings = Gio.Settings.new(pkg.name);
      }

      this.settings.bind(
        "window-width",
        this,
        "default-width",
        Gio.SettingsBindFlags.DEFAULT
      );
      this.settings.bind(
        "window-height",
        this,
        "default-height",
        Gio.SettingsBindFlags.DEFAULT
      );
      this.settings.bind(
        "window-maximized",
        this,
        "maximized",
        Gio.SettingsBindFlags.DEFAULT
      );
      this.settings.connect("changed::preferred-theme", this.setColorScheme);
    };

    loadStyles = () => {
      const cssProvider = new Gtk.CssProvider();
      cssProvider.load_from_resource(getResourcePath("index.css"));

      Gtk.StyleContext.add_provider_for_display(
        this.display,
        cssProvider,
        Gtk.STYLE_PROVIDER_PRIORITY_USER
      );
    };

    setColorScheme = () => {
      if (!this.settings) {
        this.settings = Gio.Settings.new(pkg.name);
      }
      const prefColorScheme = this.settings.get_string("preferred-theme");

      const { DEFAULT, FORCE_LIGHT, FORCE_DARK } = Adw.ColorScheme;
      let colorScheme = DEFAULT;

      if (prefColorScheme === "system") {
        colorScheme = DEFAULT;
      }

      if (prefColorScheme === "light") {
        colorScheme = FORCE_LIGHT;
      }

      if (prefColorScheme === "dark") {
        colorScheme = FORCE_DARK;
      }

      const styleManager = this.application.get_style_manager();
      styleManager.color_scheme = colorScheme;

      const editorColorScheme = styleManager.dark ? "Adwaita-dark" : "Adwaita";
      const schemeManager = GtkSource.StyleSchemeManager.get_default();
      const scheme = schemeManager.get_scheme(editorColorScheme);

      this._source_view_text.buffer.set_style_scheme(scheme);
      this._source_view_encoding.buffer.set_style_scheme(scheme);
    };

    displayToast = (message) => {
      this.toast.dismiss();
      this.toast.title = message;
      this._toast_overlay.add_toast(this.toast);
    };

    debounce = (callback, wait = 300) => {
      let debounceTimeout = null;

      return (...args) => {
        if (debounceTimeout) {
          GLib.source_remove(debounceTimeout);
        }

        debounceTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, wait, () => {
          callback(...args);
          debounceTimeout = null;
          return GLib.SOURCE_REMOVE;
        });
      };
    };
  }
);
