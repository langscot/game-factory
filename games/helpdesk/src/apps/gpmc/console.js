// Group Policy Management (gpmc.msc), main console. An MMC shell over the
// authored GPO catalogue in content/gpmc.js. Links and setting values live in
// session.ui("gpmc"); the console never writes to the world store. Edit opens
// a second window of the same app with options.editor set, so the editor is a
// real window rather than a modal pretending to be one.

import {
  DELEGATION,
  DOMAIN,
  GPOS,
  LINK_TARGETS,
  SETTINGS,
  SITES,
  STARTER_GPOS,
  addLink,
  configuredSettings,
  effectiveSettings,
  gpoById,
  gpoLinks,
  linksAt,
  persist,
  precedenceFor,
  readState,
  removeLink,
  settingValueLabel,
  targetById,
} from "./state.js";

const ICO = {
  forest:
    '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.2l4.6 4.1h-2.4v3.1h3.5L8 14.8 2.3 8.4h3.5V5.3H3.4z" fill="#8ec7a8"/></svg>',
  domain:
    '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.3" fill="#4c8fd6"/><path d="M1.8 8h12.4M8 1.7c2 2.1 2 10.5 0 12.6M8 1.7c-2 2.1-2 10.5 0 12.6" stroke="#d8ecff" stroke-width=".9" fill="none"/></svg>',
  folder:
    '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 4.2A1.2 1.2 0 0 1 2.7 3h3.1l1.2 1.4h6.3a1.2 1.2 0 0 1 1.2 1.2v6.2a1.2 1.2 0 0 1-1.2 1.2H2.7a1.2 1.2 0 0 1-1.2-1.2z" fill="#d9a441"/></svg>',
  gpo:
    '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 1.8h7L13 5.3v8.9H2.5z" fill="#e8eef7"/><path d="M9.5 1.8V5.3H13z" fill="#b9cbe2"/><circle cx="7.8" cy="9.2" r="2" fill="none" stroke="#4c8fd6" stroke-width="1.2"/><path d="M9.3 10.7L11 12.5" stroke="#4c8fd6" stroke-width="1.2" stroke-linecap="round"/></svg>',
  ou:
    '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 4.2A1.2 1.2 0 0 1 2.7 3h3.1l1.2 1.4h6.3a1.2 1.2 0 0 1 1.2 1.2v6.2a1.2 1.2 0 0 1-1.2 1.2H2.7a1.2 1.2 0 0 1-1.2-1.2z" fill="#6fa8dc"/></svg>',
  dc:
    '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="2.4" width="12" height="5" rx="1" fill="#8a97a8"/><rect x="2" y="8.6" width="12" height="5" rx="1" fill="#a8b4c4"/><circle cx="4.5" cy="4.9" r=".8" fill="#4ade80"/><circle cx="4.5" cy="11.1" r=".8" fill="#4ade80"/></svg>',
};

const isOuNode = (node) => node === "domain" || node.startsWith("ou:");
const targetIdForNode = (node) => (node === "domain" ? "domain" : node.slice(3));
const scopeLabel = (scope) => (scope === "computer" ? "Computer" : "User");

export function mountConsole(container, ctx) {
  const esc = (value) => ctx.ui.esc(value);

  const stateNow = () => readState(ctx);

  function paint() {
    const state = stateNow();
    const gpo = gpoById(state.gpoId);
    const focusKey = container.contains(document.activeElement) ? document.activeElement.dataset?.fk : null;

    const root = ctx.ui.el(`
      <div class="gpmc-shell">
        <div class="gpmc-menubar" role="menubar">
          <button type="button" data-menu="file">File</button>
          <button type="button" data-menu="action">Action</button>
          <button type="button" data-menu="view">View</button>
          <button type="button" data-menu="help">Help</button>
        </div>

        <div class="gpmc-toolbar">
          <button type="button" class="gpmc-tool" data-act="link" data-fk="tool:link" title="Link an Existing GPO">
            Link <span class="gpmc-tool-plus">+</span>
          </button>
          <button type="button" class="gpmc-tool" data-act="edit" data-fk="tool:edit" title="Edit the selected GPO"${
            state.node === "container:gpos" ? "" : " disabled"
          }>Edit</button>
          <button type="button" class="gpmc-tool" data-act="delete-link" data-fk="tool:delete-link" title="Delete a link"${
            state.node === "container:gpos" && gpoLinks(state, gpo.id).length ? "" : " disabled"
          }>Unlink</button>
          <span class="gpmc-tool-sep"></span>
          <button type="button" class="gpmc-tool" data-act="precedence" data-fk="tool:precedence">Precedence</button>
          <button type="button" class="gpmc-tool" data-act="refresh" data-fk="tool:refresh">Refresh</button>
        </div>

        <div class="gpmc-body">
          <div class="gpmc-tree" role="tree" aria-label="Group Policy Management console tree">${treeHtml(state)}</div>
          ${mainHtml(state)}
          <aside class="gpmc-actions" aria-label="Actions">${actionsHtml(state)}</aside>
        </div>

        <div class="gpmc-status">
          <span>${GPOS.length} Group Policy objects · ${LINK_TARGETS.length} containers</span>
          <span class="gpmc-status-last">${esc(
            state.node === "container:gpos" ? `${gpo.name} selected` : state.lastAction,
          )}</span>
        </div>
      </div>`);

    container.replaceChildren(root);
    wire(root);

    if (focusKey) {
      [...root.querySelectorAll("[data-fk]")].find((node) => node.dataset.fk === focusKey)?.focus({ preventScroll: true });
    }
  }

  // -------------------------------------------------------------------------
  // tree
  // -------------------------------------------------------------------------

  function treeRow({ key, label, depth = 0, icon = ICO.folder, hasChildren = false, open = false, selected = false, current = false, hint = "" }) {
    const twisty = hasChildren
      ? `<button type="button" class="gpmc-tw" data-toggle="${esc(key)}" aria-label="${
          open ? "Collapse" : "Expand"
        }" aria-expanded="${open}">${open ? "\u25be" : "\u25b8"}</button>`
      : `<span class="gpmc-tw"></span>`;
    return `<div class="gpmc-trow${selected ? " sel" : ""}${current ? " current" : ""}" style="padding-left:${
      6 + depth * 13
    }px">${twisty}
      <button type="button" class="gpmc-tlabel" data-node="${esc(key)}" data-fk="tree:${esc(key)}"${
        selected ? ' aria-current="true"' : ""
      }>${icon}<span class="gpmc-ttext">${esc(label)}</span>${hint}</button>
    </div>`;
  }

  function treeHtml(state) {
    const tree = state.tree;
    const onGpos = state.node === "container:gpos";
    let html = `<div class="gpmc-troot">${ICO.forest}<span>Group Policy Management</span></div>`;
    html += treeRow({
      key: "forest",
      label: `Forest: ${DOMAIN.forest}`,
      depth: 0,
      icon: ICO.forest,
      hasChildren: true,
      open: tree.forest,
      selected: state.node === "forest",
    });

    if (tree.forest) {
      html += treeRow({
        key: "domains",
        label: "Domains",
        depth: 1,
        icon: ICO.folder,
        hasChildren: true,
        open: tree.domains,
        selected: state.node === "domains",
      });
    }

    if (tree.forest && tree.domains) {
      html += treeRow({
        key: "domain",
        label: DOMAIN.name,
        depth: 2,
        icon: ICO.domain,
        hasChildren: true,
        open: tree.domain,
        selected: state.node === "domain",
        hint: '<span class="gpmc-thint">domain</span>',
      });

      if (tree.domain) {
        html += treeRow({
          key: "gpo:gpo_default",
          label: "Default Domain Policy",
          depth: 3,
          icon: ICO.gpo,
          selected: onGpos && state.gpoId === "gpo_default",
        });
        html += treeRow({
          key: "ou:ou_dc",
          label: "Domain Controllers",
          depth: 3,
          icon: ICO.dc,
          selected: state.node === "ou:ou_dc",
        });
        html += treeRow({
          key: "container:gpos",
          label: "Group Policy Objects",
          depth: 3,
          icon: ICO.folder,
          hasChildren: true,
          open: tree.gpos,
          current: onGpos,
          hint: `<span class="gpmc-count">${GPOS.length}</span>`,
        });

        if (tree.gpos) {
          for (const gpo of GPOS) {
            html += treeRow({
              key: `gpo:${gpo.id}`,
              label: gpo.name,
              depth: 4,
              icon: ICO.gpo,
              selected: onGpos && state.gpoId === gpo.id,
            });
          }
        }

        html += treeRow({
          key: "starters",
          label: "Starter GPOs",
          depth: 3,
          icon: ICO.folder,
          selected: state.node === "starters",
        });
        html += treeRow({
          key: "sites",
          label: "Sites",
          depth: 3,
          icon: ICO.folder,
          selected: state.node === "sites",
        });
        html += treeRow({
          key: "container:departments",
          label: "Departments",
          depth: 3,
          icon: ICO.folder,
          hasChildren: true,
          open: tree.departments,
          selected: state.node === "container:departments",
        });

        if (tree.departments) {
          for (const target of LINK_TARGETS.filter((item) => item.kind === "ou" && item.id !== "ou_dc")) {
            html += treeRow({
              key: `ou:${target.id}`,
              label: target.name,
              depth: 4,
              icon: ICO.ou,
              selected: state.node === `ou:${target.id}`,
            });
          }
        }
      }
    }
    return html;
  }

  // -------------------------------------------------------------------------
  // main pane
  // -------------------------------------------------------------------------

  function mainHtml(state) {
    if (state.node === "container:gpos") {
      const gpo = gpoById(state.gpoId);
      return `<div class="gpmc-main is-gpo">${gpoListHtml(state, gpo)}${gpoDetailHtml(state, gpo)}</div>`;
    }
    if (isOuNode(state.node)) return targetViewHtml(state, targetIdForNode(state.node));
    if (state.node === "container:departments") return departmentsHtml(state);
    if (state.node === "starters") return startersHtml();
    if (state.node === "sites") return sitesHtml();
    return overviewHtml(state);
  }

  function gpoListHtml(state, selected) {
    const rows = GPOS.map((gpo) => {
      const links = gpoLinks(state, gpo.id);
      return `<button type="button" class="gpmc-gpo-row${gpo.id === selected.id ? " sel" : ""}" data-gpo="${
        gpo.id
      }" data-fk="gpo:${gpo.id}" role="row" title="Double-click to edit ${esc(gpo.name)}">
        <span class="gpmc-gpo-name">${ICO.gpo}<span>${esc(gpo.name)}</span></span>
        <span>${links.length ? "Yes" : "No"}</span>
        <span class="gpmc-cell-clip" title="${esc(gpo.security)}">${esc(gpo.security)}</span>
        <span class="gpmc-cell-clip">${esc(gpo.status)}</span>
      </button>`;
    });

    return `<section class="gpmc-listpane">
      <div class="gpmc-panehead"><b>Group Policy Objects</b><span>${GPOS.length} objects</span></div>
      <div class="gpmc-table" role="table" aria-label="Group Policy Objects">
        <div class="gpmc-thead gpmc-gpo-cols" role="row">
          <span role="columnheader">Name</span><span role="columnheader">Linked</span>
          <span role="columnheader">Security Filtering</span><span role="columnheader">GPO Status</span>
        </div>
        <div class="gpmc-tbody" role="rowgroup">${rows.join("")}</div>
      </div>
    </section>`;
  }

  function gpoDetailHtml(state, gpo) {
    const tabs = [
      ["scope", "Scope"],
      ["details", "Details"],
      ["settings", "Settings"],
      ["delegation", "Delegation"],
    ];
    const tab = tabs.some(([id]) => id === state.tab) ? state.tab : "scope";
    const bodies = {
      scope: scopeHtml,
      details: detailsHtml,
      settings: settingsTabHtml,
      delegation: delegationHtml,
    };
    return `<section class="gpmc-detail">
      <div class="gpmc-detail-head">${ICO.gpo}<div><b>${esc(gpo.name)}</b><small>${esc(
        DOMAIN.name,
      )}</small></div></div>
      <div class="gpmc-tabs" role="tablist">${tabs
        .map(
          ([id, label]) =>
            `<button type="button" class="gpmc-tab${id === tab ? " sel" : ""}" data-tab="${id}" data-fk="tab:${id}" role="tab" aria-selected="${
              id === tab
            }">${label}</button>`,
        )
        .join("")}</div>
      <div class="gpmc-tabbody">${bodies[tab](state, gpo)}</div>
    </section>`;
  }

  function scopeHtml(state, gpo) {
    const links = gpoLinks(state, gpo.id);
    const rows = links.length
      ? links
          .map((link) => {
            const target = targetById(link.targetId);
            return `<div class="gpmc-linkrow">
              <span class="gpmc-linkname">${target.kind === "domain" ? ICO.domain : ICO.ou}<span>
                <b>${esc(target.name)}</b><small>${esc(target.path)}</small>
              </span></span>
              <span>${link.order}</span>
              <span>${link.enforced ? "Yes" : "No"}</span>
              <button type="button" class="gpmc-mini" data-unlink-gpo="${gpo.id}" data-unlink-target="${
                target.id
              }" data-fk="unlink:${target.id}" title="Delete this link">Delete link</button>
            </div>`;
          })
          .join("")
      : `<div class="gpmc-empty">This GPO is not linked to any containers.</div>`;

    return `<div class="gpmc-tabbar"><b>Links</b><button type="button" class="gpmc-btn" data-act="link">Link an Existing GPO...</button></div>
      <div class="gpmc-linkhead"><span>Location</span><span>Order</span><span>Enforced</span><span></span></div>
      <div class="gpmc-linklist">${rows}</div>
      <h4 class="gpmc-subhead">Security Filtering</h4>
      <div class="gpmc-filterrow">${ctx.ui.icon("people")}<span>${esc(
        gpo.security,
      )}</span></div>
      <p class="gpmc-note">Only this group reads and applies the policy.</p>`;
  }

  function detailsHtml(state, gpo) {
    const modified = state.lastEdited[gpo.id]
      ? `Today at ${state.lastEdited[gpo.id]}`
      : gpo.modified;
    const field = (label, value, wide = false) =>
      `<div class="gpmc-field${wide ? " is-wide" : ""}"><span>${label}</span><div>${value}</div></div>`;
    return `<div class="gpmc-fields">
      ${field("Name", esc(gpo.name))}
      ${field("Domain", esc(DOMAIN.name))}
      ${field("Owner", esc(gpo.owner))}
      ${field("Created", esc(gpo.created))}
      ${field("Modified", esc(modified))}
      ${field("Status", esc(gpo.status))}
      ${field("User version", `(AD) ${gpo.revision}.0`)}
      ${field("Computer version", `(AD) ${gpo.revision}.0`)}
      ${field("Security filtering", esc(gpo.security))}
      ${field("Description", esc(gpo.description), true)}
    </div>`;
  }

  function settingsTabHtml(state, gpo) {
    const configured = configuredSettings(state, gpo.id);
    const rows = state.showAllSettings
      ? SETTINGS.map((setting) => ({
          setting,
          record: (state.settings[gpo.id] || {})[setting.id] || null,
        }))
      : configured;
    const body = rows.length
      ? rows
          .map(
            ({ setting, record }) => `<div class="gpmc-settingrow">
              <span class="gpmc-scope">${scopeLabel(setting.scope)}</span>
              <span class="gpmc-settingname">${esc(setting.name)}<small>${esc(
                setting.path.join(" > "),
              )}</small></span>
              <span class="gpmc-state">${esc(settingValueLabel(setting, record))}</span>
            </div>`,
          )
          .join("")
      : `<div class="gpmc-empty">No settings are configured in this GPO.</div>`;

    return `<div class="gpmc-tabbar">
        <b>Configured settings</b>
        <label class="gpmc-check"><input type="checkbox" data-showall ${
          state.showAllSettings ? "checked" : ""
        }> Show all settings</label>
        <button type="button" class="gpmc-btn" data-act="edit">Edit...</button>
      </div>
      <div class="gpmc-settinghead"><span>Scope</span><span>Setting</span><span>State</span></div>
      <div class="gpmc-settinglist">${body}</div>`;
  }

  function delegationHtml() {
    return `<div class="gpmc-delegationhead"><span>Name</span><span>Allowed permissions</span><span>Inherited</span></div>
      <div class="gpmc-delegationlist">${DELEGATION.map(
        (entry) => `<div class="gpmc-delegationrow">
          <span>${ctx.ui.icon("people")}${esc(entry.name)}</span>
          <span>${esc(entry.allowed)}</span>
          <span>${esc(entry.inherited)}</span>
        </div>`,
      ).join("")}</div>`;
  }

  function targetViewHtml(state, targetId) {
    const target = targetById(targetId);
    const tab = state.ouTab === "inheritance" ? "inheritance" : "linked";
    return `<div class="gpmc-main is-single">
      <div class="gpmc-panehead"><div><b>${esc(target.name)}</b><small>${esc(
        target.path,
      )}</small></div><span class="gpmc-pill">${target.kind === "domain" ? "Domain" : "Organizational unit"}</span></div>
      <div class="gpmc-tabs" role="tablist">
        <button type="button" class="gpmc-tab${tab === "linked" ? " sel" : ""}" data-outab="linked" role="tab" aria-selected="${
          tab === "linked"
        }">Linked Group Policy Objects</button>
        <button type="button" class="gpmc-tab${tab === "inheritance" ? " sel" : ""}" data-outab="inheritance" role="tab" aria-selected="${
          tab === "inheritance"
        }">Group Policy Inheritance</button>
      </div>
      <div class="gpmc-tabbody">${tab === "linked" ? linkedHtml(state, target) : inheritanceHtml(state, target)}</div>
    </div>`;
  }

  function linkedHtml(state, target) {
    const rows = linksAt(state, target.id);
    const body = rows.length
      ? rows
          .map(
            (link) => `<div class="gpmc-ou-row">
              <span>${link.order}</span>
              <span class="gpmc-gpo-name">${ICO.gpo}<span>${esc(link.gpo.name)}</span></span>
              <span>${link.enforced ? "Yes" : "No"}</span>
              <span class="gpmc-cell-clip">${esc(link.gpo.status)}</span>
              <button type="button" class="gpmc-mini" data-unlink-gpo="${link.gpoId}" data-unlink-target="${
                target.id
              }">Delete link</button>
            </div>`,
          )
          .join("")
      : `<div class="gpmc-empty">No Group Policy objects are linked directly to this container.</div>`;

    return `<div class="gpmc-tabbar"><b>Links</b><button type="button" class="gpmc-btn" data-act="link">Link an Existing GPO...</button></div>
      <div class="gpmc-ou-head"><span>Order</span><span>Group Policy Object</span><span>Enforced</span><span>Status</span><span></span></div>
      <div class="gpmc-ou-list">${body}</div>`;
  }

  function inheritanceHtml(state, target) {
    const precedence = precedenceFor(state, target.id);
    const effective = effectiveSettings(state, precedence);
    const orderRows = precedence.length
      ? precedence
          .map(
            (entry) => `<div class="gpmc-prec-row">
              <span>${entry.precedence}</span>
              <span class="gpmc-gpo-name">${ICO.gpo}<span>${esc(entry.gpo.name)}${
                entry.inherited ? '<small>Inherited</small>' : ""
              }</span></span>
              <span>${esc(entry.location)}</span>
              <span>${entry.enforced ? "Yes" : "No"}</span>
              <span class="gpmc-cell-clip">${esc(entry.gpo.status)}</span>
            </div>`,
          )
          .join("")
      : `<div class="gpmc-empty">No Group Policy objects apply to this container.</div>`;

    const effectiveRows = effective.length
      ? effective
          .map(({ setting, winner, overridden }) => {
            const conflict = overridden.length > 0;
            const losers = overridden.map((item) => item.entry.gpo.name).join(", ");
            return `<div class="gpmc-effective-row${conflict ? " conflict" : ""}">
              <span>${esc(setting.name)}</span>
              <span class="gpmc-gpo-name">${ICO.gpo}<span>${esc(winner.entry.gpo.name)}</span></span>
              <span>${esc(settingValueLabel(setting, winner.record))}</span>
              <span>${
                conflict
                  ? `<span class="gpmc-badge">Conflict</span><span class="gpmc-losers" title="Overridden: ${esc(
                      losers,
                    )}">overrides ${esc(losers)}</span>`
                  : '<span class="gpmc-muted">No conflict</span>'
              }</span>
            </div>`;
          })
          .join("")
      : `<div class="gpmc-empty">There are no configured settings in the linked policies.</div>`;

    return `<div class="gpmc-tabbar"><b>Precedence</b><button type="button" class="gpmc-btn" data-act="link">Link an Existing GPO...</button></div>
      <p class="gpmc-note">Enforced links come first, then the closest container, then inherited domain links. The first policy that configures a setting wins.</p>
      <div class="gpmc-prec-head"><span>#</span><span>Group Policy Object</span><span>Linked at</span><span>Enforced</span><span>Status</span></div>
      <div class="gpmc-prec-list">${orderRows}</div>
      <h4 class="gpmc-subhead">Effective settings</h4>
      <div class="gpmc-effective-head"><span>Setting</span><span>Winning policy</span><span>Value</span><span>Result</span></div>
      <div class="gpmc-effective-list">${effectiveRows}</div>`;
  }

  function departmentsHtml(state) {
    return `<div class="gpmc-main is-single">
      <div class="gpmc-panehead"><div><b>Departments</b><small>${esc(
        DOMAIN.name,
      )} organizational units</small></div><span class="gpmc-pill">${LINK_TARGETS.length - 2} units</span></div>
      <div class="gpmc-tabbody">
        <div class="gpmc-ou-cards">${LINK_TARGETS.filter((target) => target.kind === "ou" && target.id !== "ou_dc")
          .map(
            (target) => `<button type="button" class="gpmc-ou-card" data-node="ou:${target.id}">
              ${ICO.ou}<span><b>${esc(target.name)}</b><small>${esc(target.path)}</small></span>
              <span class="gpmc-pill">${linksAt(state, target.id).length} linked</span>
            </button>`,
          )
          .join("")}</div>
      </div>
    </div>`;
  }

  function startersHtml() {
    return `<div class="gpmc-main is-single">
      <div class="gpmc-panehead"><div><b>Starter GPOs</b><small>${esc(
        DOMAIN.name,
      )}</small></div><span class="gpmc-pill">${STARTER_GPOS.length}</span></div>
      <div class="gpmc-tabbody">
        <div class="gpmc-starterhead"><span>Name</span><span>Comment</span><span>Version</span></div>
        <div class="gpmc-starterlist">${STARTER_GPOS.map(
          (starter) => `<div class="gpmc-starterrow">
            <span class="gpmc-gpo-name">${ICO.gpo}<span>${esc(starter.name)}</span></span>
            <span>${esc(starter.comment)}</span><span>${esc(starter.version)}</span>
          </div>`,
        ).join("")}</div>
      </div>
    </div>`;
  }

  function sitesHtml() {
    return `<div class="gpmc-main is-single">
      <div class="gpmc-panehead"><div><b>Sites</b><small>${esc(
        DOMAIN.forest,
      )}</small></div><span class="gpmc-pill">${SITES.length}</span></div>
      <div class="gpmc-tabbody">
        <div class="gpmc-sitehead"><span>Site</span><span>Location</span><span>Links</span><span>Description</span></div>
        <div class="gpmc-sitelist">${SITES.map(
          (site) => `<div class="gpmc-siterow">
            <span>${ICO.folder}${esc(site.name)}</span><span>${esc(site.location)}</span>
            <span>${site.links}</span><span>${esc(site.description)}</span>
          </div>`,
        ).join("")}</div>
        <p class="gpmc-note">No site-level Group Policy links in this domain.</p>
      </div>
    </div>`;
  }

  function overviewHtml(state) {
    const title = state.node === "forest" ? `Forest: ${DOMAIN.forest}` : "Domains";
    const body =
      state.node === "forest"
        ? `<p>The forest holds one domain, one domain controller and ${GPOS.length} Group Policy objects.</p>
           <button type="button" class="gpmc-ou-card" data-node="domain">${ICO.domain}<span><b>${esc(
             DOMAIN.name,
           )}</b><small>1 domain · ${GPOS.length} GPOs</small></span><span class="gpmc-pill">${LINK_TARGETS.length} containers</span></button>`
        : `<p>Domains in this forest.</p>
           <button type="button" class="gpmc-ou-card" data-node="domain">${ICO.domain}<span><b>${esc(
             DOMAIN.name,
           )}</b><small>${esc(DOMAIN.company)}</small></span></button>`;
    return `<div class="gpmc-main is-single">
      <div class="gpmc-panehead"><div><b>${title}</b><small>Group Policy Management</small></div></div>
      <div class="gpmc-tabbody">${body}</div>
    </div>`;
  }

  // -------------------------------------------------------------------------
  // actions pane
  // -------------------------------------------------------------------------

  function actionsHtml(state) {
    if (state.node === "container:gpos") {
      const gpo = gpoById(state.gpoId);
      const linkCount = gpoLinks(state, gpo.id).length;
      return `<div class="gpmc-acthead">Actions</div>
        <div class="gpmc-actgroup">${esc(gpo.name)}</div>
        <button type="button" data-act="edit" data-fk="act:edit">Edit...</button>
        <button type="button" data-act="link" data-fk="act:link">Link an Existing GPO...</button>
        <button type="button" data-act="delete-link" data-fk="act:delete-link"${linkCount ? "" : " disabled"}>Delete Link...</button>
        <div class="gpmc-actsep"></div>
        <button type="button" data-act="precedence" data-fk="act:precedence">Group Policy Inheritance</button>
        <button type="button" data-act="refresh" data-fk="act:refresh">Refresh</button>
        <div class="gpmc-actgroup">Group Policy Objects</div>
        <button type="button" data-act="new" disabled>New</button>
        <button type="button" data-act="report" disabled>Save Report...</button>`;
    }
    if (isOuNode(state.node)) {
      const target = targetById(targetIdForNode(state.node));
      return `<div class="gpmc-acthead">Actions</div>
        <div class="gpmc-actgroup">${esc(target.name)}</div>
        <button type="button" data-act="link" data-fk="act:link">Link an Existing GPO...</button>
        <button type="button" data-act="inheritance" data-fk="act:inheritance">Group Policy Inheritance</button>
        <button type="button" data-act="refresh" data-fk="act:refresh">Refresh</button>
        <div class="gpmc-actgroup">Container</div>
        <button type="button" data-act="goto-gpos" data-fk="act:goto-gpos">Group Policy Objects</button>`;
    }
    return `<div class="gpmc-acthead">Actions</div>
      <div class="gpmc-actgroup">Group Policy Management</div>
      <button type="button" data-act="goto-gpos" data-fk="act:goto-gpos">Group Policy Objects</button>
      <button type="button" data-act="precedence" data-fk="act:precedence">Group Policy Inheritance</button>
      <button type="button" data-act="refresh" data-fk="act:refresh">Refresh</button>`;
  }

  // -------------------------------------------------------------------------
  // wiring
  // -------------------------------------------------------------------------

  function wire(root) {
    root.querySelectorAll("[data-menu]").forEach((button) => {
      button.addEventListener("click", () => openMenu(button.dataset.menu, button));
    });
    root.querySelectorAll("[data-toggle]").forEach((button) => {
      button.addEventListener("click", () => toggleTree(button.dataset.toggle));
    });
    root.querySelectorAll("[data-node]").forEach((button) => {
      button.addEventListener("click", () => selectNode(button.dataset.node));
    });
    root.querySelectorAll("[data-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        persist(ctx, { tab: button.dataset.tab });
        paint();
      });
    });
    root.querySelectorAll("[data-outab]").forEach((button) => {
      button.addEventListener("click", () => {
        persist(ctx, { ouTab: button.dataset.outab });
        paint();
      });
    });
    root.querySelectorAll("[data-showall]").forEach((input) => {
      input.addEventListener("change", () => {
        persist(ctx, { showAllSettings: input.checked });
        paint();
      });
    });
    root.querySelectorAll("[data-unlink-gpo]").forEach((button) => {
      button.addEventListener("click", () => unlink(button.dataset.unlinkGpo, button.dataset.unlinkTarget));
    });
    root.querySelectorAll("[data-act]").forEach((button) => {
      button.addEventListener("click", () => handleAction(button.dataset.act));
    });

    const rows = [...root.querySelectorAll("[data-gpo]")];
    rows.forEach((row) => {
      const gpo = gpoById(row.dataset.gpo);
      row.addEventListener("click", () => selectGpo(gpo));
      row.addEventListener("dblclick", () => openEditor(gpo));
      row.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        event.stopPropagation();
        selectGpo(gpo);
        openGpoMenu(gpo, event.clientX, event.clientY);
      });
      row.addEventListener("keydown", (event) => {
        const index = GPOS.findIndex((item) => item.id === gpo.id);
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          const next = GPOS[index + (event.key === "ArrowDown" ? 1 : -1)];
          if (!next) return;
          selectGpo(next);
          container.querySelector(`[data-gpo="${next.id}"]`)?.focus({ preventScroll: true });
        } else if (event.key === "Enter") {
          event.preventDefault();
          openEditor(gpo);
        }
      });
    });
  }

  function toggleTree(key) {
    const state = stateNow();
    persist(ctx, { tree: { ...state.tree, [key]: !state.tree[key] } });
    paint();
  }

  function selectNode(node) {
    if (node.startsWith("gpo:")) {
      selectGpo(gpoById(node.slice(4)));
      return;
    }
    const patch = { node, tab: "scope" };
    if (isOuNode(node)) patch.ouTab = "linked";
    persist(ctx, patch);
    paint();
  }

  function selectGpo(gpo) {
    persist(ctx, { node: "container:gpos", gpoId: gpo.id });
    paint();
  }

  function handleAction(kind) {
    const state = stateNow();
    const gpo = gpoById(state.gpoId);
    if (kind === "link") {
      if (isOuNode(state.node)) openLinkDialog(state, { targetId: targetIdForNode(state.node) });
      else openLinkDialog(state, { gpoId: gpo.id });
    } else if (kind === "edit") {
      if (state.node === "container:gpos") openEditor(gpo);
    } else if (kind === "delete-link") {
      openDeleteDialog(gpo.id);
    } else if (kind === "precedence") {
      persist(ctx, { node: "domain", ouTab: "inheritance", lastAction: "Showing Group Policy inheritance" });
      paint();
    } else if (kind === "inheritance") {
      persist(ctx, { ouTab: "inheritance" });
      paint();
    } else if (kind === "goto-gpos") {
      persist(ctx, { node: "container:gpos" });
      paint();
    } else if (kind === "refresh") {
      persist(ctx, { lastAction: `Refreshed at ${ctx.clock.timeText()}` });
      paint();
    }
  }

  function openEditor(gpo) {
    persist(ctx, { node: "container:gpos", gpoId: gpo.id });
    ctx.open("gpmc", { editor: gpo.id, path: `editor-${gpo.id}` });
  }

  function linkGpo(gpoId, targetId) {
    const state = stateNow();
    const next = addLink(state, gpoId, targetId);
    const gpo = gpoById(gpoId);
    const target = targetById(targetId);
    if (!next) {
      ctx.ui.closeDialog();
      return;
    }
    persist(ctx, {
      links: next,
      node: "container:gpos",
      gpoId,
      tab: "scope",
      lastAction: `Linked ${gpo.name} to ${target.name}`,
    });
    ctx.ui.closeDialog();
    paint();
    ctx.ui.toast("Group Policy Management", `${gpo.name} linked to ${target.name}.`, "gpmc");
  }

  function unlink(gpoId, targetId) {
    const state = stateNow();
    const gpo = gpoById(gpoId);
    const target = targetById(targetId);
    persist(ctx, {
      links: removeLink(state, gpoId, targetId),
      node: "container:gpos",
      gpoId,
      tab: "scope",
      lastAction: `Removed the link from ${gpo.name} to ${target.name}`,
    });
    ctx.ui.closeDialog();
    paint();
    ctx.ui.toast("Group Policy Management", `Link to ${target.name} removed.`, "gpmc");
  }

  function openLinkDialog(state, { gpoId, targetId }) {
    const byTarget = Boolean(gpoId);
    const choices = byTarget
      ? LINK_TARGETS.filter((target) => !(state.links[gpoId] || []).some((link) => link.targetId === target.id))
      : GPOS.filter((gpo) => !(state.links[gpo.id] || []).some((link) => link.targetId === targetId));

    if (!choices.length) {
      ctx.ui.alert(
        "Link an Existing GPO",
        byTarget
          ? "This GPO is already linked to every container in the domain."
          : "Every Group Policy object is already linked to this container.",
      );
      return;
    }

    const gpo = byTarget ? gpoById(gpoId) : null;
    const target = byTarget ? null : targetById(targetId);
    const select = byTarget
      ? `<label class="gpmc-dialog-field"><span>Location</span><select data-link-select>${choices
          .map((item) => `<option value="${item.id}">${esc(item.path)}</option>`)
          .join("")}</select></label>`
      : `<label class="gpmc-dialog-field"><span>Group Policy object</span><select data-link-select>${choices
          .map((item) => `<option value="${item.id}">${esc(item.name)}</option>`)
          .join("")}</select></label>`;

    const card = ctx.ui.dialog({
      html: `<div class="app-gpmc gpmc-dialog">
        <h2>Link an Existing GPO</h2>
        <p class="gpmc-dialog-sub">${
          byTarget
            ? `Choose the container that should apply <b>${esc(gpo.name)}</b>.`
            : `Choose a Group Policy object to link to <b>${esc(target.name)}</b>.`
        }</p>
        ${select}
        <div class="row"><button type="button" class="btn" data-link-cancel>Cancel</button>
        <button type="button" class="btn primary" data-link-ok>Link</button></div>
      </div>`,
    });
    card.querySelector("[data-link-cancel]").addEventListener("click", ctx.ui.closeDialog);
    card.querySelector("[data-link-ok]").addEventListener("click", () => {
      const value = card.querySelector("[data-link-select]").value;
      if (byTarget) linkGpo(gpoId, value);
      else linkGpo(value, targetId);
    });
  }

  function openDeleteDialog(gpoId) {
    const state = stateNow();
    const links = gpoLinks(state, gpoId);
    const gpo = gpoById(gpoId);
    if (!links.length) return;
    const rows = links
      .map((link) => {
        const target = targetById(link.targetId);
        return `<button type="button" class="gpmc-dialog-link" data-delete-target="${target.id}">
          <span><b>${esc(target.name)}</b><small>${esc(target.path)}</small></span>
          <span class="gpmc-pill">Delete</span>
        </button>`;
      })
      .join("");
    const card = ctx.ui.dialog({
      html: `<div class="app-gpmc gpmc-dialog">
        <h2>Delete Link</h2>
        <p class="gpmc-dialog-sub">Choose a link to remove from <b>${esc(gpo.name)}</b>.</p>
        <div class="gpmc-dialog-links">${rows}</div>
        <div class="row"><button type="button" class="btn" data-link-cancel>Cancel</button></div>
      </div>`,
    });
    card.querySelector("[data-link-cancel]").addEventListener("click", ctx.ui.closeDialog);
    card.querySelectorAll("[data-delete-target]").forEach((button) => {
      button.addEventListener("click", () => unlink(gpoId, button.dataset.deleteTarget));
    });
  }

  function openGpoMenu(gpo, x, y) {
    const state = stateNow();
    ctx.ui.menu(x, y, [
      { label: "Edit...", icon: "doc", onClick: () => openEditor(gpo) },
      { label: "Link an Existing GPO...", onClick: () => openLinkDialog(readState(ctx), { gpoId: gpo.id }) },
      {
        label: "Delete Link...",
        disabled: !gpoLinks(state, gpo.id).length,
        onClick: () => openDeleteDialog(gpo.id),
      },
      { separator: true },
      { label: "Save Report...", disabled: true },
    ]);
  }

  function openMenu(kind, button) {
    const rect = button.getBoundingClientRect();
    const x = rect.left;
    const y = rect.bottom + 2;
    const state = stateNow();
    const gpo = gpoById(state.gpoId);
    if (kind === "file") {
      ctx.ui.menu(x, y, [
        { label: "New", disabled: true },
        { label: "Save Report...", disabled: true },
        { separator: true },
        { label: "Exit", onClick: () => ctx.window.close() },
      ]);
    } else if (kind === "action") {
      ctx.ui.menu(x, y, [
        { label: "Edit...", disabled: state.node !== "container:gpos", onClick: () => openEditor(gpo) },
        {
          label: "Link an Existing GPO...",
          onClick: () =>
            isOuNode(state.node)
              ? openLinkDialog(state, { targetId: targetIdForNode(state.node) })
              : openLinkDialog(state, { gpoId: gpo.id }),
        },
        {
          label: "Delete Link...",
          disabled: !gpoLinks(state, gpo.id).length || state.node !== "container:gpos",
          onClick: () => openDeleteDialog(gpo.id),
        },
        { separator: true },
        {
          label: "Group Policy Inheritance",
          onClick: () => {
            persist(ctx, { node: "domain", ouTab: "inheritance" });
            paint();
          },
        },
      ]);
    } else if (kind === "view") {
      ctx.ui.menu(x, y, [
        {
          label: "Group Policy Objects",
          onClick: () => {
            persist(ctx, { node: "container:gpos" });
            paint();
          },
        },
        {
          label: "Group Policy Inheritance",
          onClick: () => {
            persist(ctx, { node: "domain", ouTab: "inheritance" });
            paint();
          },
        },
        { separator: true },
        { label: "Refresh", icon: "$refresh", shortcut: "F5", onClick: () => handleAction("refresh") },
      ]);
    } else {
      ctx.ui.menu(x, y, [
        {
          label: "About Group Policy Management",
          onClick: () =>
            ctx.ui.alert(
              "Group Policy Management",
              "Group Policy Management (gpmc.msc)\n\nGroup Policy Management lets you manage the Group Policy objects and links for the HALCYON domain.\n\nVersion 10.0 (Build 22621)",
            ),
        },
      ]);
    }
  }

  function onKeyDown(event) {
    if (event.key !== "F5" || event.defaultPrevented) return;
    event.preventDefault();
    handleAction("refresh");
  }

  const off = ctx.events.on("ui:changed", paint);
  container.addEventListener("keydown", onKeyDown);
  const stop = () => {
    off?.();
    container.removeEventListener("keydown", onKeyDown);
  };
  ctx.onDispose(stop);
  paint();
  return stop;
}
