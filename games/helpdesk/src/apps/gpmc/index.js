// Group Policy Management (gpmc.msc). One app id, two windows: the console
// and, launched by Edit, an editor instance with options.editor set. Both
// read and write the same session.ui("gpmc") state.

import { mountConsole } from "./console.js";
import { mountEditor } from "./editor.js";
import { CSS } from "./styles.js";

const instances = new WeakMap();

export default {
  id: "gpmc",
  title: "Group Policy Management",
  icon: "gpmc",
  size: [1120, 640],
  desktop: true,
  pinned: true,
  multi: true,
  fixed: true,
  order: 11,
  position: [64, 32],
  titleFor: (options) => (options?.editor ? "Group Policy Management Editor" : "Group Policy Management"),

  mount(container, ctx) {
    ctx.ui.styles("gpmc", CSS);
    const editors = ctx.options?.editor
      ? [mountEditor(container, ctx, ctx.options.editor)]
      : [mountConsole(container, ctx)];
    instances.set(container, { stop: () => editors.forEach((stop) => stop?.()) });
  },

  unmount(container) {
    instances.get(container)?.stop?.();
    instances.delete(container);
  },
};
