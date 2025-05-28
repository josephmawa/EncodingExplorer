import Adw from "gi://Adw";
import Gtk from "gi://Gtk";

const URL = "https://github.com/josephmawa/EncodingExplorer";

const aboutParams = {
  application_name: "Encoding Explorer",
  application_icon: pkg.name,
  version: pkg.version,
  developer_name: "Joseph Mawa",
  developers: ["Joseph Mawa"],
  license_type: Gtk.License.LGPL_3_0,
  translator_credits: _("translator-credits"),
  copyright: "Copyright © 2025 Joseph Mawa",
  website: URL,
  issue_url: URL + "/issues",
  support_url: URL + "/issues",
};

export function getAboutDialog() {
  return new Adw.AboutDialog(aboutParams);
}
