// Everything this app remembers lives in the shared store under
// session.ui.rdp, so closing the window keeps the host you typed, the options
// tab you were on and the session you were connected to.

export const TABS = [
  { id: "general", label: "General" },
  { id: "display", label: "Display" },
  { id: "local", label: "Local Resources" },
  { id: "experience", label: "Experience" },
  { id: "advanced", label: "Advanced" },
];

/** Fresh defaults, so a tab never shares an object with another window. */
export function defaultOptions() {
  return {
    general: { alwaysAsk: false },
    display: { size: 1024, allMonitors: false, colors: "32", connectionBar: true },
    local: {
      remoteAudio: "play-here",
      keyboard: "windows",
      clipboard: true,
      printers: false,
      drives: false,
      smartcards: false,
    },
    experience: {
      speed: "auto",
      reconnect: true,
      background: true,
      fontSmoothing: true,
      desktopComposition: true,
      windowContents: false,
      menuAnimation: true,
      visualStyles: true,
      bitmapCache: true,
    },
    advanced: { auth: "warn", gateway: "auto", gatewayHost: "", port: 3389 },
  };
}

/** Merge the store's UI slice with defaults. `recentHosts: null` means "seed it". */
export function readState(ctx) {
  const saved = ctx.world.session.ui("rdp");
  const defaults = defaultOptions();
  const options = {};
  for (const group of Object.keys(defaults)) {
    options[group] = { ...defaults[group], ...(saved.options?.[group] || {}) };
  }
  return {
    computer: saved.computer || "",
    username: saved.username || "",
    showOptions: Boolean(saved.showOptions),
    tab: TABS.some((tab) => tab.id === saved.tab) ? saved.tab : "general",
    options,
    recentHosts: Array.isArray(saved.recentHosts) ? saved.recentHosts : null,
    rememberUser: Boolean(saved.rememberUser),
    connected: saved.connected || null,
    lastSession: saved.lastSession || null,
    pinned: saved.pinned !== false,
    expanded: saved.expanded !== false,
  };
}

/** One write, one ui:changed bump. Apps never touch the store directly. */
export function writeState(ctx, patch) {
  ctx.actions.setUi("rdp", patch);
}
