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

/**
 * Polyfill getFloat16 and setFloat16
 */
import { getFloat16, setFloat16 } from "./float-16.js";

/**
 * Big number library for large number manipulation and
 * formatting.
 */
import "./big-number.js";

import {
  clamp,
  regexes,
  getRadix,
  getMaxLength,
  getTextOffsets,
  getIEEEBitFields,
  getEncodingOffsets,
  getConversionError,
  floatingPointFormats,
  getIEEEEncodedString,
  getActualStoredNumber,
} from "./util.js";
import { MoreSettings } from "./more-settings.js";

const textEncoder = new TextEncoder();
const locale = new Intl.DateTimeFormat().resolvedOptions().locale;
const segmenter = new Intl.Segmenter(locale, {
  granularity: "grapheme",
});

const padChar = "0";
const byteSeparator = " ";

BigNumber.config({ DECIMAL_PLACES: 1100 });

export const EncodingExplorerWindow = GObject.registerClass(
  {
    GTypeName: "EncodingExplorerWindow",
    Template: getResourceURI("win.ui"),
    InternalChildren: [
      "toast_overlay",
      "encoding_stack",
      "radix_label",
      "endianness_label",
      "dropdown_encoding",
      "source_view_text",
      "source_view_number",
      "source_view_text_encoding",
      "source_view_number_encoding",
      "dropdown_floating_point_format",
    ],
    Properties: {
      encoding: GObject.ParamSpec.string(
        "encoding",
        "Encoding",
        "Text encoding",
        GObject.ParamFlags.READWRITE,
        "UTF-8"
      ),
      floating_point_format: GObject.ParamSpec.string(
        "floating_point_format",
        "floatingPointFormat",
        "IEEE 754 encoding format",
        GObject.ParamFlags.READWRITE,
        "single_precision"
      ),
      endianness: GObject.ParamSpec.string(
        "endianness",
        "Endianness",
        "Byte order",
        GObject.ParamFlags.READWRITE,
        "LE"
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
      this.createNumberBuffer();
      /**
       * This method creates the floating
       * point format dropdown model. Create
       * the model before binding settings.
       */
      this.createDropdownModel();
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
        this.displayToast(_("Copied encoding"));
      });

      const openMoreSettings = Gio.SimpleAction.new("open-more-settings", null);
      openMoreSettings.connect("activate", () => {
        const moreSettings = new MoreSettings();
        moreSettings.present(this);
      });

      const moveMark = Gio.SimpleAction.new(
        "move-mark",
        GLib.VariantType.new("s")
      );

      moveMark.connect("activate", (action, param) => {
        const direction = param.unpack();
        const { index, text, encoding } = this.offsets;
        if (
          (text.length === 0 && encoding.length === 0) ||
          (direction === "forward" && index === text.length - 1) ||
          (direction === "backward" && index === 0)
        ) {
          return;
        }

        if (direction === "forward") {
          this.offsets.index = clamp(0, text.length - 1, index + 1);
        }

        if (direction === "backward") {
          this.offsets.index = clamp(0, text.length - 1, index - 1);
        }

        this.createTags();
      });

      this.add_action(copyEncoding);
      this.add_action(openMoreSettings);
      this.add_action(moveMark);
    };

    createTags = () => {
      const { index, text, encoding } = this.offsets;
      if (!text.length && !encoding.length) {
        this.removeTags();
        return;
      }

      this.removeTags();
      this.offsets.index = clamp(0, text.length ? text.length - 1 : 0, index);
      const [txtOffsetA, txtOffsetB] = text[this.offsets.index];
      const [encOffsetA, encOffsetB] = encoding[this.offsets.index];

      this.buffer_text.apply_tag_by_name(
        "blueForeground",
        this.buffer_text.get_iter_at_offset(txtOffsetA),
        this.buffer_text.get_iter_at_offset(txtOffsetB)
      );
      this.buffer_text.apply_tag_by_name(
        "blueBackground",
        this.buffer_text.get_iter_at_offset(txtOffsetA),
        this.buffer_text.get_iter_at_offset(txtOffsetB)
      );

      this.buffer_text_encoding.apply_tag_by_name(
        "blueForeground",
        this.buffer_text_encoding.get_iter_at_offset(encOffsetA),
        this.buffer_text_encoding.get_iter_at_offset(encOffsetB)
      );
      this.buffer_text_encoding.apply_tag_by_name(
        "blueBackground",
        this.buffer_text_encoding.get_iter_at_offset(encOffsetA),
        this.buffer_text_encoding.get_iter_at_offset(encOffsetB)
      );
    };

    createNumberBuffer = () => {
      this.buffer_number = new GtkSource.Buffer();
      this.buffer_number_encoding = new GtkSource.Buffer();

      if (!this.handleTextBufferChange) {
        this.handleTextBufferChange = this.debounce(this.encodeNumber, 300);
      }
      this.buffer_number.connect("changed", this.handleTextBufferChange);
      this.buffer_number.connect("insert-text", this.insertTextHandler);

      this._source_view_number.buffer = this.buffer_number;
      this._source_view_number_encoding.buffer = this.buffer_number_encoding;
    };

    createBuffer = () => {
      this.buffer_text = new GtkSource.Buffer();
      this.buffer_text_encoding = new GtkSource.Buffer();

      if (!this.handleBufferChange) {
        this.handleBufferChange = this.debounce(this.encodeText, 300);
      }

      this.buffer_text.connect("changed", this.handleBufferChange);

      this.offsets = {
        index: 0,
        text: [],
        encoding: [],
      };

      const tagTableText = this.buffer_text.tag_table;
      const tagTableEncoding = this.buffer_text_encoding.tag_table;

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

      tagTableEncoding.add(
        new Gtk.TextTag({
          name: "blueForeground",
          foreground: "#406619",
        })
      );
      tagTableEncoding.add(
        new Gtk.TextTag({
          name: "blueBackground",
          background: "#eaf2c2",
        })
      );

      this._source_view_text.buffer = this.buffer_text;
      this._source_view_text_encoding.buffer = this.buffer_text_encoding;
    };

    removeTags = () => {
      this.buffer_text.remove_tag_by_name(
        "blueForeground",
        this.buffer_text.get_start_iter(),
        this.buffer_text.get_end_iter()
      );
      this.buffer_text.remove_tag_by_name(
        "blueBackground",
        this.buffer_text.get_start_iter(),
        this.buffer_text.get_end_iter()
      );

      this.buffer_text_encoding.remove_tag_by_name(
        "blueForeground",
        this.buffer_text_encoding.get_start_iter(),
        this.buffer_text_encoding.get_end_iter()
      );
      this.buffer_text_encoding.remove_tag_by_name(
        "blueBackground",
        this.buffer_text_encoding.get_start_iter(),
        this.buffer_text_encoding.get_end_iter()
      );
    };

    insertTextHandler = (textBuffer, location, text, len) => {
      const bufferText = textBuffer.text;
      const signalId = GObject.signal_lookup("insert-text", textBuffer);
      const handlerId = GObject.signal_handler_find(
        textBuffer,
        GObject.SignalMatchType.ID,
        signalId,
        GLib.quark_to_string(0),
        null,
        null,
        null
      );

      GObject.signal_handler_block(textBuffer, handlerId);

      if (regexes.validCharacter.test(text)) {
        const codePoints = [...bufferText];
        codePoints.splice(location.get_offset(), 0, text);
        const finalText = codePoints.join("");
        if (regexes.validEntry.test(finalText)) {
          textBuffer.insert(location, text, len);
        }
      }

      GObject.signal_handler_unblock(textBuffer, handlerId);
      GObject.signal_stop_emission(
        textBuffer,
        signalId,
        GLib.quark_to_string(0)
      );
    };

    encodeNumber = () => {
      let text = this.buffer_number.text;
      /**
       * This check will mark entries such as "3."" or "In" as
       * incomplete. For an entry to be considered complete,
       * it must be a valid number without a trailing decimal
       * point or one of "Infinity", "-Infinity", and "NaN". This
       * method is invoked when text is added or deleted from
       * the text buffer.
       */
      if (!regexes.completeEntry.test(text)) return;

      const number = +text;
      const format = this.settings.get_string("floating-point-format");

      if (format === "half_precision") {
        const arrayBuffer = new ArrayBuffer(2);
        const dataView = new DataView(arrayBuffer);

        dataView.setFloat16 = (...args) => setFloat16(dataView, ...args);
        dataView.getFloat16 = (...args) => getFloat16(dataView, ...args);

        dataView.setFloat16(0, number);
        const bits = dataView.getUint16(0).toString(2).padStart(16, padChar);

        const storedNumber = dataView.getFloat16(0);
        const actualStoredNumber = getActualStoredNumber(storedNumber);
        const bitFields = getIEEEBitFields(bits, format);
        const conversionError = getConversionError(text, storedNumber);
        const encodedString = getIEEEEncodedString({
          text,
          bitFields,
          conversionError,
          actualStoredNumber,
        });

        this.buffer_number_encoding.text = "";
        const startIter = this.buffer_number_encoding.get_start_iter();
        this.buffer_number_encoding.insert_markup(startIter, encodedString, -1);
        return;
      }

      if (format === "single_precision") {
        const arrayBuffer = new ArrayBuffer(4);
        const dataView = new DataView(arrayBuffer);

        dataView.setFloat32(0, number);
        const bits = dataView.getUint32(0).toString(2).padStart(32, padChar);

        const storedNumber = dataView.getFloat32(0);
        const actualStoredNumber = getActualStoredNumber(storedNumber);
        const bitFields = getIEEEBitFields(bits, format);
        const conversionError = getConversionError(text, storedNumber);
        const encodedString = getIEEEEncodedString({
          text,
          bitFields,
          conversionError,
          actualStoredNumber,
        });

        this.buffer_number_encoding.text = "";
        const startIter = this.buffer_number_encoding.get_start_iter();
        this.buffer_number_encoding.insert_markup(startIter, encodedString, -1);
        return;
      }

      if (format === "double_precision") {
        const arrayBuffer = new ArrayBuffer(8);
        const dataView = new DataView(arrayBuffer);

        dataView.setFloat64(0, number);
        const bits = dataView.getBigUint64(0).toString(2).padStart(64, padChar);

        const storedNumber = dataView.getFloat64(0);
        const actualStoredNumber = getActualStoredNumber(storedNumber);
        const bitFields = getIEEEBitFields(bits, format);
        const conversionError = getConversionError(text, storedNumber);
        const encodedString = getIEEEEncodedString({
          text,
          bitFields,
          conversionError,
          actualStoredNumber,
        });

        this.buffer_number_encoding.text = "";
        const startIter = this.buffer_number_encoding.get_start_iter();
        this.buffer_number_encoding.insert_markup(startIter, encodedString, -1);
        return;
      }
    };

    encodeText = () => {
      const text = this.buffer_text.text;
      /**
       * The app becomes slow and unresponsive for large text. This is
       * especially true when the user copies and pastes text into the
       * TextView. To remain performant, there's need to truncate the
       * text to about 2,500 characters.
       */
      const codePoints = [...text];
      if (codePoints.length > 2_500) {
        this.displayToast(_("Truncating text to 2500 characters"));
        this.buffer_text.text = codePoints.slice(0, 2_500).join("");
        return;
      }
      
      const radix = this.settings.get_string("radix");
      const encoding = this.settings.get_string("encoding");
      const endianness = this.settings.get_string("endianness");

      const base = getRadix(radix);
      const maxLength = getMaxLength(base);
      const segments = [...segmenter.segment(text)];

      if (encoding === "ASCII") {
        for (const { segment } of segments) {
          const codePoints = [...segment].map((character) => {
            return character.codePointAt(0);
          });

          if (
            codePoints.length > 1 ||
            codePoints.some((codePoint) => codePoint > 127)
          ) {
            this.displayToast(_("Invalid ASCII"));
            return;
          }
        }

        const codeUnits = [...textEncoder.encode(text)].map((codeUnit) => {
          return codeUnit.toString(base).padStart(maxLength, padChar);
        });

        this.offsets.text = getTextOffsets(segments);
        this.offsets.encoding = getEncodingOffsets(codeUnits);
        this.buffer_text_encoding.text = codeUnits.join(byteSeparator);
        this.createTags();
        return;
      }

      if (encoding === "UTF-8") {
        const encodedCodePoints = segments.map(({ segment }) => {
          return [...textEncoder.encode(segment)]
            .map((codeUnit) => {
              return codeUnit.toString(base).padStart(maxLength, padChar);
            })
            .join(byteSeparator);
        });

        this.offsets.text = getTextOffsets(segments);
        this.offsets.encoding = getEncodingOffsets(encodedCodePoints);
        this.buffer_text_encoding.text = encodedCodePoints.join(byteSeparator);
        this.createTags();
        return;
      }

      if (encoding === "UTF-16") {
        const codePoints = segments.map(({ segment }) => {
          return [...segment].map((character) => character.codePointAt(0));
        });
        const isValidUTF16 = codePoints.every((codePointsArray) => {
          return codePointsArray.every((codePoint) => {
            return (
              (codePoint >= 0x0000 && codePoint < 0xd800) ||
              (codePoint > 0xdfff && codePoint <= 0x10ffff)
            );
          });
        });

        if (!isValidUTF16) {
          this.displayToast(_("Lone Surrogate"));
          return;
        }

        const codeUnits = codePoints.map((codePointsArray) => {
          return codePointsArray
            .map((codePoint) => {
              if (codePoint > 0xffff) {
                const highSurrogate = 0xd800 + ((codePoint - 0x10000) >> 10);
                const lowSurrogate = 0xdc00 + ((codePoint - 0x10000) & 0x3ff);

                const arrayBuffer = new ArrayBuffer(4);
                const dataView = new DataView(arrayBuffer);

                dataView.setUint16(0, highSurrogate, endianness === "le");
                dataView.setUint16(2, lowSurrogate, endianness === "le");

                return [...new Uint8Array(arrayBuffer)]
                  .map((byte) => {
                    return byte.toString(base).padStart(maxLength, padChar);
                  })
                  .join(byteSeparator);
              }

              const arrayBuffer = new ArrayBuffer(2);
              const dataView = new DataView(arrayBuffer);
              dataView.setUint16(0, codePoint, endianness === "le");

              return [...new Uint8Array(arrayBuffer)]
                .map((byte) => {
                  return byte.toString(base).padStart(maxLength, padChar);
                })
                .join(byteSeparator);
            })
            .join(byteSeparator);
        });

        this.offsets.text = getTextOffsets(segments);
        this.offsets.encoding = getEncodingOffsets(codeUnits);
        this.buffer_text_encoding.text = codeUnits.join(byteSeparator);
        this.createTags();
        return;
      }

      if (["UTF-32", "UCS-4"].includes(encoding)) {
        const arrayBuffer = new ArrayBuffer(4);
        const dataView = new DataView(arrayBuffer);

        const encodedSegments = segments.map(({ segment }) => {
          const encodedCodePoints = [...segment].map((character) => {
            const codePoint = character.codePointAt(0);
            dataView.setUint32(0, codePoint, endianness === "le");
            return [...new Uint8Array(arrayBuffer)]
              .map((byte) => {
                return byte.toString(base).padStart(maxLength, padChar);
              })
              .join(byteSeparator);
          });

          return encodedCodePoints.join(byteSeparator);
        });

        this.offsets.text = getTextOffsets(segments);
        this.offsets.encoding = getEncodingOffsets(encodedSegments);
        this.buffer_text_encoding.text = encodedSegments.join(byteSeparator);
        this.createTags();
      }
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

      this.settings.bind(
        "encoding",
        this,
        "encoding",
        Gio.SettingsBindFlags.DEFAULT
      );
      this.settings.bind(
        "floating-point-format",
        this,
        "floating_point_format",
        Gio.SettingsBindFlags.DEFAULT
      );
      this.bindEncoding();

      this.settings.bind(
        "endianness",
        this,
        "endianness",
        Gio.SettingsBindFlags.DEFAULT
      );
      this.bindEndianness();

      this.settings.bind(
        "radix",
        this._radix_label,
        "label",
        Gio.SettingsBindFlags.DEFAULT
      );

      this.settings.bind(
        "encoding-mode",
        this._encoding_stack,
        "visible-child-name",
        Gio.SettingsBindFlags.DEFAULT
      );

      this.settings.connect("changed::radix", this.encodeText);
      this.settings.connect("changed::encoding", this.encodeText);
      this.settings.connect("changed::endianness", this.encodeText);
      this.settings.connect("changed::preferred-theme", this.setColorScheme);
      this.settings.connect(
        "changed::floating-point-format",
        this.encodeNumber
      );
    };

    bindEndianness = () => {
      this.bind_property_full(
        "endianness",
        this._endianness_label,
        "label",
        GObject.BindingFlags.SYNC_CREATE,
        (binding, endianness) => {
          return [true, endianness.toUpperCase()];
        },
        null
      );
    };

    createDropdownModel = () => {
      const formats = floatingPointFormats.map(({ format }) => format);
      const model = Gtk.StringList.new(formats);
      const expression = Gtk.PropertyExpression.new(
        Gtk.StringObject,
        null,
        "string"
      );
      this._dropdown_floating_point_format.model = model;
      this._dropdown_floating_point_format.expression = expression;
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

      this.bind_property_full(
        "floating_point_format",
        this._dropdown_floating_point_format,
        "selected",
        GObject.BindingFlags.BIDIRECTIONAL | GObject.BindingFlags.SYNC_CREATE,
        (binding, encoding) => {
          let selected;
          const encodingObj = floatingPointFormats.find(
            ({ key }) => key === encoding
          );

          const model = this._dropdown_floating_point_format.model;
          for (let i = 0; i < model.n_items; i++) {
            if (model.get_item(i).string === encodingObj.format) {
              selected = i;
              break;
            }
          }
          return [true, selected];
        },
        (binding, selected) => {
          const stringObj =
            this._dropdown_floating_point_format.model.get_item(selected);

          const encodingObj = floatingPointFormats.find(
            ({ format }) => stringObj?.string === format
          );

          return [true, encodingObj?.key];
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
