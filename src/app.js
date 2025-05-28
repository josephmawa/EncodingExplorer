import GObject from "gi://GObject";
import Gio from "gi://Gio";
import Adw from "gi://Adw?version=1";

import { EncodingExplorerWindow } from "./win.js";
import { getAboutDialog } from "./about.js";
import { PrefDialog } from "./pref.js";

export const EncodingExplorerApplication = GObject.registerClass(
  class EncodingExplorerApplication extends Adw.Application {
    constructor() {
      super({
        application_id: pkg.name,
        flags: Gio.ApplicationFlags.DEFAULT_FLAGS,
        resource_base_path: getResourcePath(),
      });

      const quitAction = new Gio.SimpleAction({ name: "quit" });
      quitAction.connect("activate", () => {
        this.quit();
      });

      const showAboutAction = new Gio.SimpleAction({ name: "about" });
      showAboutAction.connect("activate", () => {
        const aboutDialog = getAboutDialog();
        aboutDialog.present(this.active_window);
      });

       const preferencesAction = new Gio.SimpleAction({ name: "pref" });
      preferencesAction.connect("activate", (action) => {
        const preferencesDialog = new PrefDialog();

        preferencesDialog.present(this.active_window);
      });
      
      this.add_action(quitAction);
      this.add_action(showAboutAction);
      this.add_action(preferencesAction);

      this.set_accels_for_action("app.quit", ["<primary>q"]);
      this.set_accels_for_action("app.pref", ["<primary>comma"]);
    }

    vfunc_activate() {
      let activeWindow = this.active_window;
      if (!activeWindow) activeWindow = new EncodingExplorerWindow(this);
      activeWindow.present();
    }
  }
);
