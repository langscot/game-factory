// The app registry. Every desktop app is a module exporting the same shape:
//
//   { id, title, icon, size: [w, h], mount(container, ctx), unmount(container) }
//
// plus optional shell metadata: desktop, pinned, position, multi, titleFor.
// Apps never import each other; `apps/index.js` is the only place they meet.

const REGISTRY = new Map();

function validate(app) {
  if (!app || typeof app !== "object") throw new Error("App contract: expected an object");
  if (!app.id) throw new Error("App contract: missing id");
  if (!app.title) throw new Error(`App contract (${app.id}): missing title`);
  if (typeof app.mount !== "function") throw new Error(`App contract (${app.id}): mount() is required`);
  if (app.unmount && typeof app.unmount !== "function") throw new Error(`App contract (${app.id}): unmount must be a function`);
  if (!Array.isArray(app.size) || app.size.length !== 2) throw new Error(`App contract (${app.id}): size must be [w, h]`);
}

export function registerApps(apps) {
  for (const app of apps) {
    validate(app);
    REGISTRY.set(app.id, app);
  }
}

export function getApp(appId) {
  return REGISTRY.get(appId);
}

export function listApps() {
  return [...REGISTRY.values()].sort((a, b) => (a.order ?? 99) - (b.order ?? 99) || a.title.localeCompare(b.title));
}

export function desktopApps() {
  return listApps().filter((app) => app.desktop);
}

export function pinnedApps() {
  return listApps().filter((app) => app.pinned);
}
