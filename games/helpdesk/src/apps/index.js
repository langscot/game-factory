// The one place app modules are brought together. Apps never import each
// other; they only appear in this list.

import { registerApps } from "./registry.js";
import ticketdesk from "./ticketdesk/index.js";
import mail from "./mail/index.js";
import handbook from "./handbook/index.js";
import directory from "./directory/index.js";
import explorer from "./explorer/index.js";
import notepad from "./notepad/index.js";
import regedit from "./regedit/index.js";
import calculator from "./calculator/index.js";
import settings from "./settings/index.js";
import taskmanager from "./taskmanager/index.js";
import recyclebin from "./recyclebin/index.js";

let registered = false;

export function registerBuiltinApps() {
  if (registered) return;
  registered = true;
  registerApps([ticketdesk, mail, handbook, directory, explorer, notepad, regedit, calculator, settings, taskmanager, recyclebin]);
}

export { getApp, listApps, desktopApps, pinnedApps } from "./registry.js";
