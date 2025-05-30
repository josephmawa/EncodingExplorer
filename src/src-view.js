import GObject from "gi://GObject";
import GtkSource from "gi://GtkSource?version=5";

export const SourceView = GObject.registerClass(
  {
    GTypeName: "SourceView",
    Template: getResourceURI("src-view.ui"),
  },
  class SourceView extends GtkSource.View {
    constructor(options = {}) {
      super(options);
    }
  }
);
