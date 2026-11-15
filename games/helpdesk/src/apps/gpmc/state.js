// Shared state and precedence maths for the GPMC shell. Everything mutable
// lives in one place: session.ui("gpmc"). The content module supplies the
// starting links and setting values; this file never mutates either object.

import {
  DELEGATION,
  DOMAIN,
  GPOS,
  INITIAL_LINKS,
  INITIAL_SETTINGS,
  LINK_TARGETS,
  SETTINGS,
  SETTING_BY_ID,
  SITES,
  STARTER_GPOS,
} from "../../content/gpmc.js";

export const DEFAULT_TREE = {
  forest: true,
  domains: true,
  domain: true,
  gpos: true,
  starters: false,
  sites: false,
  departments: true,
};

export const DEFAULT_UI = {
  node: "container:gpos",
  gpoId: "gpo_default",
  tab: "scope",
  ouTab: "linked",
  tree: DEFAULT_TREE,
  links: INITIAL_LINKS,
  settings: INITIAL_SETTINGS,
  lastAction: "Ready",
  lastEdited: {},
  showAllSettings: false,
};

export { DELEGATION, DOMAIN, GPOS, LINK_TARGETS, SETTINGS, SETTING_BY_ID, SITES, STARTER_GPOS };

export function readState(ctx) {
  const stored = ctx.world.session.ui("gpmc") || {};
  return {
    ...DEFAULT_UI,
    ...stored,
    tree: { ...DEFAULT_TREE, ...(stored.tree || {}) },
    links: stored.links || INITIAL_LINKS,
    settings: stored.settings || INITIAL_SETTINGS,
    lastEdited: stored.lastEdited || {},
  };
}

export function persist(ctx, patch) {
  ctx.actions.setUi("gpmc", patch);
}

export const gpoById = (gpoId) => GPOS.find((gpo) => gpo.id === gpoId) || GPOS[0];
export const targetById = (targetId) => LINK_TARGETS.find((target) => target.id === targetId) || LINK_TARGETS[0];

export function gpoLinks(state, gpoId) {
  return [...(state.links[gpoId] || [])].sort((a, b) => a.order - b.order);
}

export function linksAt(state, targetId) {
  return Object.entries(state.links)
    .flatMap(([gpoId, links]) =>
      (links || [])
        .filter((link) => link.targetId === targetId)
        .map((link) => ({ ...link, gpoId, gpo: gpoById(gpoId) })),
    )
    .sort((a, b) => a.order - b.order);
}

/**
 * The order the console uses for a domain or OU. Enforced links float to the
 * top, then the closest container, then inherited domain links. Inheritance
 * only goes one level here because the OUs in this mock are all direct
 * children of the domain.
 */
export function precedenceFor(state, targetId) {
  const target = targetById(targetId);
  const gather = (id, location, inherited) =>
    Object.entries(state.links).flatMap(([gpoId, links]) =>
      (links || [])
        .filter((link) => link.targetId === id)
        .map((link) => ({
          gpoId,
          gpo: gpoById(gpoId),
          order: link.order,
          enforced: Boolean(link.enforced),
          location,
          inherited,
        })),
    );

  const own = gather(targetId, target.name, false);
  const parent = targetId === "domain" ? [] : gather("domain", DOMAIN.name, true);
  const entries = [...own, ...parent].sort(
    (a, b) =>
      Number(b.enforced) - Number(a.enforced) ||
      Number(a.inherited) - Number(b.inherited) ||
      a.order - b.order,
  );
  return entries.map((entry, index) => ({ ...entry, precedence: index + 1 }));
}

function recordFor(state, gpoId, settingId) {
  const record = (state.settings[gpoId] || {})[settingId];
  if (!record || record.state === "not-configured") return null;
  return record;
}

export function configuredSettings(state, gpoId) {
  return SETTINGS.map((setting) => ({ setting, record: recordFor(state, gpoId, setting.id) })).filter(
    (row) => row.record,
  );
}

export function effectiveSettings(state, precedence) {
  return SETTINGS.map((setting) => {
    const hits = [];
    for (const entry of precedence) {
      if (entry.gpo.status === "All settings disabled") continue;
      const record = recordFor(state, entry.gpoId, setting.id);
      if (record) hits.push({ entry, record });
    }
    if (!hits.length) return null;
    return { setting, winner: hits[0], overridden: hits.slice(1) };
  }).filter(Boolean);
}

export function settingValueLabel(setting, record) {
  if (!record || record.state === "not-configured") return "Not configured";
  if (record.state === "disabled") return "Disabled";
  if (setting.kind === "boolean") return "Enabled";
  if (setting.kind === "number") {
    const value = record.value ?? setting.min ?? 0;
    return `${value}${setting.unit ? ` ${setting.unit}` : ""}`;
  }
  return record.value ? String(record.value) : "(not set)";
}

export function addLink(state, gpoId, targetId) {
  const existing = state.links[gpoId] || [];
  if (existing.some((link) => link.targetId === targetId)) return null;
  const orders = Object.values(state.links)
    .flat()
    .filter((link) => link.targetId === targetId)
    .map((link) => link.order);
  const order = Math.max(0, ...orders) + 1;
  return {
    ...state.links,
    [gpoId]: [...existing, { targetId, order, enforced: false }],
  };
}

export function removeLink(state, gpoId, targetId) {
  const links = {
    ...state.links,
    [gpoId]: (state.links[gpoId] || []).filter((link) => link.targetId !== targetId),
  };

  // Keep the remaining orders readable (1..n) instead of leaving a gap.
  const remaining = Object.entries(links)
    .flatMap(([id, list]) => list.filter((link) => link.targetId === targetId).map((link) => ({ id, link })))
    .sort((a, b) => a.link.order - b.link.order);
  const orderById = new Map(remaining.map((entry, index) => [entry.id, index + 1]));

  for (const [id, list] of Object.entries(links)) {
    if (!orderById.has(id)) continue;
    links[id] = list.map((link) => (link.targetId === targetId ? { ...link, order: orderById.get(id) } : link));
  }
  return links;
}

export function setSetting(state, gpoId, settingId, record) {
  return {
    ...state.settings,
    [gpoId]: { ...(state.settings[gpoId] || {}), [settingId]: record },
  };
}
