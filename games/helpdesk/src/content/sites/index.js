// The browser's site registry: every intranet hostname it can open.
//
// A site is a plain module in this folder. Nothing is fetched — resolving a host
// is a Map lookup, and a site renders itself into the content element with
// ordinary DOM code.
//
// ## Site contract
//
//   export default {
//     id: "servicedesk",                    // stable id, also the CSS suffix
//     title: "Service Desk",                // tab title and bookmark label
//     host: "servicedesk.halcyon.co",       // the one hostname it answers on
//     description: "Tickets and requests",  // one line for the start/search pages
//     mount(content, platform) {},          // render into the content element
//     unmount(content, platform) {},        // optional: cancel timers, drop listeners
//   };
//
// `platform` is built by the browser once per mount:
//
//   ctx                 the app context — world, actions, events, clock, ui, session
//   url, host, path     the address being shown, already parsed
//   sites               [{ id, title, host, description }] every registered site
//   bookmarks           [{ title, host }] the player's bookmark bar
//   navigate(address)   open another intranet address in this tab
//   setTitle(title)     rename this tab (cleared on the next navigation)
//   style(css)          inject a site stylesheet once; scope it under `.site-<id>`
//
// The browser wraps the mount container in `<div class="bw-page site-<id>">`, so
// a site can lean on the shared page classes in `apps/browser/styles.js`
// (`.bw-page h1`, `.bw-panel`, `.bw-btn`, `.bw-muted`) and ship no CSS at all.
//
// Rules, because this is a fake intranet on a static site:
//
//   - no fetch, no external URLs, no telemetry;
//   - no imports from `src/apps/` — read through `platform.ctx.world`, write
//     through `platform.ctx.actions`, exactly like an app does;
//   - a site never touches the browser chrome; navigation is `platform.navigate`.

import start from "./start.js";
import servicedesk from "./servicedesk.js";
import search from "./search.js";

const MODULES = [start, servicedesk, search];

function validate(site) {
  if (!site || typeof site !== "object") throw new Error("Site contract: expected an object");
  if (!site.id) throw new Error("Site contract: missing id");
  const where = `Site contract (${site.id})`;
  if (!site.title) throw new Error(`${where}: missing title`);
  if (!site.host) throw new Error(`${where}: missing host`);
  if (typeof site.mount !== "function") throw new Error(`${where}: mount() is required`);
  if (site.unmount && typeof site.unmount !== "function") throw new Error(`${where}: unmount must be a function`);
}

for (const site of MODULES) validate(site);

const BY_HOST = new Map();
for (const site of MODULES) {
  const host = site.host.toLowerCase();
  if (BY_HOST.has(host)) throw new Error(`Site contract: ${host} is registered twice`);
  BY_HOST.set(host, site);
}

/** Look a hostname up. Unknown hosts return null and become the error page. */
export function siteForHost(host) {
  return BY_HOST.get(String(host ?? "").toLowerCase()) || null;
}

/** Registry entries without the mount functions, for pages that list sites. */
export function siteList() {
  return MODULES.map(({ id, title, host, description }) => ({ id, title, host, description }));
}

/** The hostname Home and a new tab open on. */
export const HOME_HOST = "start.halcyon.co";

/** A fresh profile's bookmarks. Titles come from the registry, not from here. */
export const DEFAULT_BOOKMARKS = ["start.halcyon.co", "servicedesk.halcyon.co", "search.halcyon.co"];

/** Host that answers intranet searches, for the start page and the omnibox. */
export const SEARCH_HOST = "search.halcyon.co";
