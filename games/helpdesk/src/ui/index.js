// ctx.ui: the shared primitives every app is allowed to use. Apps never import
// the shell, another app, or the toast/menu modules directly.

import { openMenu } from "../menu.js";
import { toast } from "./toast.js";
import { alertDialog, confirmDialog, showDialog, hideDialog } from "./dialog.js";
import { el, esc, injectStyles } from "./dom.js";
import { icon } from "../icons.js";
import { ACCENTS, WALLPAPERS, getPrefs, savePrefs } from "../prefs.js";

export const formatClock = (seconds) => {
  const total = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

export function createUi({ windows, endWindow } = {}) {
  return {
    el,
    esc,
    icon,
    formatClock,
    toast,
    alert: alertDialog,
    confirm: confirmDialog,
    dialog: showDialog,
    closeDialog: hideDialog,
    menu: openMenu,
    /** Inject an app stylesheet; selectors must be scoped under .app-<id>. */
    styles: injectStyles,
    /** The open windows, for Task Mangler. Platform UI state, not app state. */
    windows: windows || (() => []),
    endWindow: endWindow || (() => {}),
    prefs: {
      get: getPrefs,
      save: savePrefs,
      accents: ACCENTS,
      wallpapers: WALLPAPERS,
    },
  };
}
