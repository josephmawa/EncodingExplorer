import GObject from "gi://GObject";
import Adw from "gi://Adw";
import Gtk from "gi://Gtk";
import Gio from "gi://Gio";
import Gdk from "gi://Gdk";
import GLib from "gi://GLib";
import GtkSource from "gi://GtkSource?version=5";

GObject.type_ensure(GtkSource.View.$gtype);
/**
 * NOTE:
 * Import src-view.js after registering GtkSource.View in
 * the GObject type system because the SourceView custom
 * widget is a subclass of GtkSource.View. You have to use
 * GObject.type_ensure method as above.
 */
import "./src-view.js";
import "./scrolled-win.js";

const textEncoder = new TextEncoder();

export const EncodingExplorerWindow = GObject.registerClass(
  {
    GTypeName: "EncodingExplorerWindow",
    Template: getResourceURI("win.ui"),
    InternalChildren: [
      "toast_overlay",
      "encoding_stack",
      "dropdown_encoding",
      "source_view_text",
      "source_view_number",
      "source_view_text_encoding",
      "source_view_number_encoding",
    ],
    Properties: {
      encoding: GObject.ParamSpec.string(
        "encoding",
        "Encoding",
        "Text encoding",
        GObject.ParamFlags.READWRITE,
        ""
      ),
    },
  },
  class EncodingExplorerWindow extends Adw.ApplicationWindow {
    constructor(application) {
      super({ application });

      this.loadStyles();
      this.createToast();
      this.createActions();
      this.createBuffer();
      this.bindSettings();
      this.setColorScheme();
    }

    createActions = () => {
      const copyEncoding = Gio.SimpleAction.new("copy-encoded-text", null);
      copyEncoding.connect("activate", () => {
        const text = this.buffer_text_encoding.text;
        if (!text) {
          this.displayToast(_("No encoding to copy"));
          return;
        }
        this.copyToClipboard(text);
        this.displayToast("Copied encoding");
      });

      this.add_action(copyEncoding);
    };
    createBuffer = () => {
      this.buffer_text = new GtkSource.Buffer();
      this.buffer_text_encoding = new GtkSource.Buffer();

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
      this._source_view_text_encoding.buffer = this.buffer_text_encoding;
    };

    encodeText = () => {
      const text = this.buffer_text.text;
      const radix = this.settings.get_string("radix");
      const encoding = this.settings.get_string("encoding");

      const locale = new Intl.DateTimeFormat().resolvedOptions().locale;
      const segmenter = new Intl.Segmenter(locale, {
        granularity: "grapheme",
      });

      const segments = [...segmenter.segment(text)]
        .map(({ segment }) => {
          const codePoints = [];
          for (const character of segment) {
            codePoints.push(character.codePointAt(0));
          }
          return codePoints;
        })
        .flat(Infinity);

      switch (encoding) {
        case "ASCII": {
          const isValidAscii = segments.every((codePoint) => codePoint <= 127);
          if (!isValidAscii) {
            this.displayToast("Invalid ASCII");
            break;
          }

          const codeUnits = [...textEncoder.encode(text)];
          const encodedText = codeUnits.map((codeUnit) => {
            return codeUnit.toString(2).padStart(7, "0");
          });
          this.buffer_text_encoding.text = encodedText.join(" ");
          break;
        }
        case "UTF-8": {
          const codeUnits = [...textEncoder.encode(text)];
          const encodedText = codeUnits.map((codeUnit) => {
            return codeUnit.toString(2).padStart(8, "0");
          });
          this.buffer_text_encoding.text = encodedText.join(" ");
          break;
        }
        case "UTF-16": {
          const isValidUTF16 = segments.every((codePoint) => {
            return (
              (codePoint >= 0x0000 && codePoint < 0xd800) ||
              (codePoint > 0xdfff && codePoint <= 0x10ffff)
            );
          });

          if (!isValidUTF16) {
            this.displayToast(_("Lone Surrogate"));
            break;
          }
          const codeUnits = segments
            .map((codePoint) => {
              if (codePoint > 0xffff) {
                const highSurrogate = 0xd800 + ((codePoint - 0x10000) >> 10);
                const lowSurrogate = 0xdc00 + ((codePoint - 0x10000) & 0x3ff);
                /**
                 * FIXME:
                 * This is a temporary solution. It doesn't take into account
                 * Endianness.
                 */
                return [
                  highSurrogate.toString(16, "0"),
                  lowSurrogate.toString(16, "0"),
                ];
              }

              return codePoint.toString(2).padStart(16, "0");
            })
            .flat(Infinity);

          this.buffer_text_encoding.text = codeUnits.join(" ");
          break;
        }
        case "UTF-32":
          break;
        case "UCS-2":
          break;
        case "UCS-4":
          break;

        default:
          break;
      }
    };

    bindSettings = () => {
      if (!this.settings) {
        this.settings = Gio.Settings.new(pkg.name);
      }

      // Window settings
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

      // Encoding settings
      this.settings.bind(
        "encoding",
        this,
        "encoding",
        Gio.SettingsBindFlags.DEFAULT
      );
      this.bindEncoding();

      this.settings.bind(
        "encoding-mode",
        this._encoding_stack,
        "visible-child-name",
        Gio.SettingsBindFlags.DEFAULT
      );

      this.settings.connect("changed::radix", this.encodeText);
      this.settings.connect("changed::encoding", this.encodeText);
      this.settings.connect("changed::preferred-theme", this.setColorScheme);
    };

    bindEncoding = () => {
      this.bind_property_full(
        "encoding",
        this._dropdown_encoding,
        "selected",
        GObject.BindingFlags.BIDIRECTIONAL | GObject.BindingFlags.SYNC_CREATE,
        (binding, encoding) => {
          let selected;
          let model = this._dropdown_encoding.model;
          for (let i = 0; i < model.n_items; i++) {
            if (model.get_item(i)?.string === encoding) {
              selected = i;
              break;
            }
          }
          return [true, selected];
        },
        (binding, selected) => {
          const encoding =
            this._dropdown_encoding.model.get_item(selected)?.string;
          return [true, encoding];
        }
      );
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
      this._source_view_number.buffer.set_style_scheme(scheme);
      this._source_view_text_encoding.buffer.set_style_scheme(scheme);
      this._source_view_number_encoding.buffer.set_style_scheme(scheme);
    };

    createToast = () => {
      this.toast = new Adw.Toast({ timeout: 1 });
    };

    copyToClipboard = (text) => {
      const clipboard = this.display.get_clipboard();
      const contentProvider = Gdk.ContentProvider.new_for_value(text);
      clipboard.set_content(contentProvider);
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
