// Servicing (services.msc). An MMC console over the technician machine's service
// rows in the world. The console owns presentation only: status and startup
// type come from the store, transitions go through ctx.actions, and the sort,
// selection and view live in ctx.world.session.ui("services").

import { metaFor, startupTypeLabel, statusLabel, dependentsOf } from "./catalog.js";
import { CSS } from "./styles.js";

const instances = new WeakMap();

// Long enough to read, short enough not to be a chore. The bar animation uses
// the same value so the dialog closes exactly when it fills.
const PROGRESS_SECONDS = { start: 1.4, stop: 1.2, pause: 0.9, resume: 0.9, restart: 2.2 };
const TARGET_STATUS = { start: "running", stop: "stopped", pause: "paused", resume: "running" };
const VERB = { start: "start", stop: "stop", pause: "pause", resume: "resume", restart: "restart" };
const PAST = { start: "started", stop: "stopped", pause: "paused", resume: "resumed", restart: "restarted" };
const ACTION_LABEL = { start: "Started", stop: "Stopped", pause: "Paused", resume: "Resumed", restart: "Restarted" };
const DEFAULT_UI = { sortKey: "name", sortDir: "asc", selectedId: null, view: "extended", log: [] };

const SORT_FIELDS = {
  name: (service) => service.name,
  description: (service) => service.description,
  status: (service) => service.statusLabel,
  startType: (service) => service.startupLabel,
  logonAs: (service) => service.logonAs,
};

const ICON_START = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.2 2.6l9 5.4-9 5.4z" fill="currentColor"/></svg>`;
const ICON_STOP = `<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.4" y="3.4" width="9.2" height="9.2" rx="1" fill="currentColor"/></svg>`;
const ICON_PAUSE = `<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.6" y="3.2" width="3.2" height="9.6" rx="0.8" fill="currentColor"/><rect x="9.2" y="3.2" width="3.2" height="9.6" rx="0.8" fill="currentColor"/></svg>`;
const ICON_RESTART = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13.4 8a5.4 5.4 0 1 1-1.8-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M13.7 2.6v3.6h-3.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export default {
  id: "services",
  title: "Servicing",
  icon: "services",
  size: [1120, 640],
  desktop: true,
  pinned: true,
  fixed: true,
  order: 10,
  position: [120, 48],

  mount(container, ctx) {
    ctx.ui.styles("services", CSS);

    let busy = false;
    let alive = true;

    const uiState = () => ({ ...DEFAULT_UI, ...ctx.world.session.ui("services") });
    const persist = (patch) => ctx.actions.setUi("services", patch);
    const machine = () => {
      const technician = ctx.world.session.current().technician;
      return technician ? ctx.world.machines.byOwner(technician.id) : null;
    };

    function rows() {
      const target = machine();
      if (!target) return [];
      const list = ctx.world.machines.services(target.id).map((service) => {
        const meta = metaFor(service);
        return {
          ...service,
          meta,
          description: meta.description,
          logonAs: meta.logonAs,
          startupLabel: startupTypeLabel(service.startType),
          statusLabel: statusLabel(service.status),
        };
      });
      const { sortKey, sortDir } = uiState();
      const field = SORT_FIELDS[sortKey] || SORT_FIELDS.name;
      const direction = sortDir === "desc" ? -1 : 1;
      return list.sort(
        (a, b) =>
          String(field(a)).localeCompare(String(field(b)), undefined, { sensitivity: "base" }) * direction ||
          a.displayName.localeCompare(b.displayName),
      );
    }

    function selectedService() {
      const list = rows();
      const { selectedId } = uiState();
      return list.find((service) => service.id === selectedId) || list[0] || null;
    }

    function can(service, kind) {
      if (!service || busy) return false;
      if (kind === "refresh" || kind === "properties" || kind === "help") return true;
      if (kind === "start") return service.status === "stopped";
      if (kind === "stop") return service.status === "running" || service.status === "paused";
      if (kind === "pause") return service.status === "running";
      if (kind === "resume") return service.status === "paused";
      if (kind === "restart") return service.status !== "stopped";
      return false;
    }

    // -----------------------------------------------------------------------
    // menus
    // -----------------------------------------------------------------------

    function actionMenuItems(service) {
      const item = (kind, label, icon) => ({
        label,
        icon,
        disabled: !can(service, kind),
        onClick: () => handle(kind, service),
      });
      return [
        item("start", "Start"),
        item("stop", "Stop"),
        item("pause", "Pause"),
        item("resume", "Resume"),
        item("restart", "Restart"),
        { separator: true },
        item("refresh", "Refresh", "$refresh"),
        item("properties", "Properties", "$info"),
        { separator: true },
        item("help", "Help"),
      ];
    }

    function openContextMenu(service, x, y) {
      persist({ selectedId: service.id });
      paint();
      ctx.ui.menu(x, y, actionMenuItems(service));
    }

    function openMenuBar(name, button) {
      const rect = button.getBoundingClientRect();
      const at = [rect.left, rect.bottom + 2];
      if (name === "file") {
        ctx.ui.menu(...at, [
          { label: "Run as administrator", disabled: true },
          { label: "Connect to another computer...", disabled: true },
          { separator: true },
          { label: "Exit", onClick: () => ctx.window.close() },
        ]);
      } else if (name === "action") {
        ctx.ui.menu(...at, actionMenuItems(selectedService()));
      } else if (name === "view") {
        const view = uiState().view;
        ctx.ui.menu(...at, [
          { label: "Extended", checked: view === "extended", onClick: () => setView("extended") },
          { label: "Standard", checked: view === "standard", onClick: () => setView("standard") },
          { separator: true },
          { label: "Refresh", icon: "$refresh", onClick: paint },
        ]);
      } else {
        ctx.ui.menu(...at, [
          {
            label: "About Servicing",
            onClick: () =>
              ctx.ui.alert(
                "Servicing",
                "Servicing (services.msc) lists the background services on this computer. Stopping one is always more exciting than starting it again.\n\nVersion 10.0 (Build 22621)",
              ),
          },
        ]);
      }
    }

    function setView(view) {
      persist({ view });
      paint();
    }

    // -----------------------------------------------------------------------
    // actions
    // -----------------------------------------------------------------------

    function record(kind, service) {
      const entry = { text: `${ACTION_LABEL[kind]} ${service.displayName}`, at: ctx.clock.timeText() };
      persist({ log: [entry, ...(uiState().log || [])].slice(0, 5) });
    }

    function closeOurDialog() {
      const card = document.querySelector("#modalCard");
      if (card?.querySelector("[data-svc-progress]")) ctx.ui.closeDialog();
    }

    function showProgress(kind, service, seconds) {
      const card = ctx.ui.dialog({
        html: `
          <div class="app-services svc-dialog" data-svc-progress>
            <h2>Servicing</h2>
            <p class="svc-progress-line">Doors is attempting to ${VERB[kind]} the ${ctx.ui.esc(
              service.displayName,
            )}${/service$/i.test(service.displayName) ? "" : " service"} on Local Computer...</p>
            <div class="svc-progress-bar"><i style="animation-duration:${seconds}s"></i></div>
            <p class="svc-progress-hint">This may take a few seconds.</p>
            <div class="row"><button class="btn" data-progress-close>Close</button></div>
          </div>`,
      });
      card.querySelector("[data-progress-close]").addEventListener("click", ctx.ui.closeDialog);
    }

    function run(kind, service) {
      if (!can(service, kind)) return;
      const target = machine();
      if (!target) return;
      const seconds = PROGRESS_SECONDS[kind] || 1.2;
      busy = true;
      paint();
      showProgress(kind, service, seconds);

      const cancel = ctx.clock.schedule(seconds, () => {
        if (!alive) return;
        const result =
          kind === "restart"
            ? ctx.actions.restartService(target.id, service.id, { role: "helpdesk" })
            : ctx.actions.setServiceStatus(target.id, service.id, TARGET_STATUS[kind], { role: "helpdesk" });
        busy = false;
        if (result.ok) {
          record(kind, service);
          ctx.ui.toast("Servicing", `${service.displayName} ${PAST[kind]}.`, "services");
        } else {
          ctx.ui.toast("Servicing", `${service.displayName}: ${result.reason}.`, "services");
        }
        closeOurDialog();
        paint();
      });
      ctx.onDispose(cancel);
    }

    function handle(kind, service) {
      if (kind === "refresh") return paint();
      if (kind === "properties") return openProperties(service);
      if (kind === "help") return showHelp(service);
      return run(kind, service);
    }

    function showHelp(service) {
      if (!service) return;
      ctx.ui.alert(
        "Servicing",
        `${service.displayName}\n${service.description}\n\nService name: ${service.name}\nStartup type: ${service.startupLabel}\nLog on as: ${service.logonAs}`,
      );
    }

    // -----------------------------------------------------------------------
    // properties
    // -----------------------------------------------------------------------

    function dependencyName(name, list) {
      return list.find((service) => service.name === name)?.displayName || name;
    }

    function propertiesHtml(service, tab) {
      const list = rows();
      const dependencies = service.meta.dependsOn.map((name) => dependencyName(name, list));
      const dependents = dependentsOf(list, service).map((service) => service.displayName);
      const body =
        tab === "dependencies"
          ? `
            <p class="svc-dep-note">Some services depend on this service. To stop a service that other services depend on, stop the dependent services first.</p>
            <div class="svc-dep-box">
              <div class="svc-dep-list">${
                dependents.length
                  ? dependents.map((name) => `<div>${ctx.ui.esc(name)}</div>`).join("")
                  : `<div class="muted">No dependent services.</div>`
              }</div>
            </div>
            <p class="svc-dep-note">This service depends on the following system components.</p>
            <div class="svc-dep-box">
              <div class="svc-dep-list">${
                dependencies.length
                  ? dependencies.map((name) => `<div>${ctx.ui.esc(name)}</div>`).join("")
                  : `<div class="muted">No dependencies.</div>`
              }</div>
            </div>`
          : `
            <div class="svc-field"><span>Service name:</span><div>${ctx.ui.esc(service.name)}</div></div>
            <div class="svc-field"><span>Display name:</span><div>${ctx.ui.esc(service.displayName)}</div></div>
            <div class="svc-field"><span>Description:</span><div>${ctx.ui.esc(service.description)}</div></div>
            <div class="svc-field is-wide"><span>Path to executable:</span>
              <input readonly value="${ctx.ui.esc(service.meta.imagePath)}" aria-label="Path to executable">
            </div>
            <div class="svc-field"><span>Startup type:</span><div>${ctx.ui.esc(service.startupLabel)}</div></div>
            <div class="svc-field"><span>Service status:</span>
              <div class="svc-status-value"><i class="svc-dot ${ctx.ui.esc(service.status)}"></i>${ctx.ui.esc(
                service.statusLabel,
              )}</div>
            </div>`;

      return `
        <div class="app-services svc-props" data-svc-props>
          <h2>${ctx.ui.esc(service.displayName)} Properties (Local Computer)</h2>
          <div class="svc-sub">Review the service details. Changes need an administrator.</div>
          <div class="svc-tabs" role="tablist">
            <button class="svc-tab${tab === "general" ? " sel" : ""}" data-props-tab="general" role="tab" aria-selected="${
              tab === "general"
            }">General</button>
            <button class="svc-tab${tab === "dependencies" ? " sel" : ""}" data-props-tab="dependencies" role="tab" aria-selected="${
              tab === "dependencies"
            }">Dependencies</button>
          </div>
          <div class="svc-props-body">${body}</div>
          <div class="row">
            <button class="btn" data-props-cancel>Cancel</button>
            <button class="btn primary" data-props-ok data-dialog-ok>OK</button>
          </div>
        </div>`;
    }

    function openProperties(service) {
      if (!service) return;
      const card = ctx.ui.dialog({ html: propertiesHtml(service, "general") });
      const render = (tab) => {
        card.innerHTML = propertiesHtml(service, tab);
        card.querySelectorAll("[data-props-tab]").forEach((button) => {
          button.addEventListener("click", () => render(button.dataset.propsTab));
        });
        card.querySelector("[data-props-ok]").addEventListener("click", ctx.ui.closeDialog);
        card.querySelector("[data-props-cancel]").addEventListener("click", ctx.ui.closeDialog);
      };
      render("general");
    }

    // -----------------------------------------------------------------------
    // paint
    // -----------------------------------------------------------------------

    function toolbarButton(kind, service, icon, label) {
      return `<button data-svc-action="${kind}" data-fk="tool:${kind}" title="${label}" aria-label="${label}" ${
        can(service, kind) ? "" : "disabled"
      }>${icon}</button>`;
    }

    function sortedHeader(key, label, state) {
      const active = state.sortKey === key;
      return `<button data-sort="${key}" data-fk="sort:${key}" title="Sort by ${label}">${label}${
        active ? `<span class="arrow">${state.sortDir === "asc" ? "\u25b2" : "\u25bc"}</span>` : ""
      }</button>`;
    }

    function paint() {
      const state = uiState();
      const list = rows();
      const target = machine();
      const selected = list.find((service) => service.id === state.selectedId) || list[0] || null;
      const standard = state.view === "standard";
      const focusKey = container.contains(document.activeElement) ? document.activeElement.dataset.fk : null;

      const rowMarkup = list
        .map(
          (service) => `
          <button class="svc-row${selected && service.id === selected.id ? " sel" : ""}" data-svc-row="${
            service.id
          }" data-fk="row:${service.id}" title="${ctx.ui.esc(service.description)}">
            <span class="svc-cell" title="${ctx.ui.esc(service.name)}">${ctx.ui.esc(service.name)}</span>
            <span class="svc-cell" title="${ctx.ui.esc(service.description)}">${ctx.ui.esc(service.description)}</span>
            <span class="svc-cell svc-status" title="${ctx.ui.esc(service.statusLabel)}"><i class="svc-dot ${ctx.ui.esc(
              service.status,
            )}"></i>${ctx.ui.esc(service.statusLabel)}</span>
            <span class="svc-cell" title="${ctx.ui.esc(service.startupLabel)}">${ctx.ui.esc(service.startupLabel)}</span>
            <span class="svc-cell" title="${ctx.ui.esc(service.logonAs)}">${ctx.ui.esc(service.logonAs)}</span>
          </button>`,
        )
        .join("");

      const actionButton = (kind, label) =>
        `<button class="svc-action" data-svc-action="${kind}" data-fk="pane:${kind}" ${
          can(selected, kind) ? "" : "disabled"
        }>${label}</button>`;

      const activities = (state.log || [])
        .slice(0, 3)
        .map((entry) => `<div><b>${ctx.ui.esc(entry.text)}</b>${ctx.ui.esc(entry.at)}</div>`)
        .join("");
      const lastAction = state.log?.[0];

      const root = ctx.ui.el(`
        <div class="svc-console">
          <div class="svc-menubar">
            <button data-menu="file" data-fk="menu:file">File</button>
            <button data-menu="action" data-fk="menu:action">Action</button>
            <button data-menu="view" data-fk="menu:view">View</button>
            <button data-menu="help" data-fk="menu:help">Help</button>
          </div>

          <div class="svc-toolbar">
            ${toolbarButton("start", selected, ICON_START, "Start")}
            ${toolbarButton("stop", selected, ICON_STOP, "Stop")}
            ${toolbarButton("pause", selected, ICON_PAUSE, "Pause")}
            ${toolbarButton("resume", selected, ICON_START, "Resume")}
            ${toolbarButton("restart", selected, ICON_RESTART, "Restart")}
            <span class="sep"></span>
            ${toolbarButton("refresh", selected, ctx.ui.icon("$refresh"), "Refresh")}
            ${toolbarButton("properties", selected, ctx.ui.icon("$info"), "Properties")}
          </div>

          <div class="svc-body${standard ? " is-standard" : ""}">
            <div class="svc-tree">
              <div class="svc-tree-head">Console Root</div>
              <div class="svc-tree-body">
                <button class="svc-tree-node sel" data-fk="tree:root">${ctx.ui.icon("services")}Servicing (Local)</button>
                <div class="svc-tree-leaf">${
                  target ? `${ctx.ui.esc(target.hostname)} · ${list.length} services` : "No machine assigned"
                }</div>
              </div>
              <div class="svc-views">
                <button data-view="extended" data-fk="view:extended" class="${standard ? "" : "sel"}">Extended</button>
                <button data-view="standard" data-fk="view:standard" class="${standard ? "sel" : ""}">Standard</button>
              </div>
            </div>

            <div class="svc-main">
              <div class="svc-list-title">Servicing (Local)</div>
              <div class="svc-grid">
                <div class="svc-columns">
                  ${sortedHeader("name", "Name", state)}
                  ${sortedHeader("description", "Description", state)}
                  ${sortedHeader("status", "Status", state)}
                  ${sortedHeader("startType", "Startup Type", state)}
                  ${sortedHeader("logonAs", "Log On As", state)}
                </div>
                <div class="svc-rows">
                  ${rowMarkup || `<div class="svc-empty">No services reported on this machine.</div>`}
                </div>
              </div>
            </div>

            ${
              standard
                ? ""
                : `<div class="svc-actions">
                    <h4 class="svc-actions-head">Servicing (Local)</h4>
                    <div class="svc-group">
                      <div class="svc-group-title">Actions</div>
                      ${actionButton("start", "Start")}
                      ${actionButton("stop", "Stop")}
                      ${actionButton("pause", "Pause")}
                      ${actionButton("resume", "Resume")}
                      ${actionButton("restart", "Restart")}
                      <div class="svc-sep"></div>
                      ${actionButton("refresh", "Refresh")}
                      ${actionButton("properties", "Properties")}
                      <div class="svc-sep"></div>
                      ${actionButton("help", "Help")}
                    </div>
                    <div class="svc-group">
                      <div class="svc-group-title">Recent actions</div>
                      <div class="svc-activity">${activities || `<div>No actions yet.</div>`}</div>
                    </div>
                  </div>`
            }
          </div>

          <div class="svc-statusbar">
            <span>${list.length} service${list.length === 1 ? "" : "s"}${selected ? ", 1 selected" : ""}</span>
            <span class="last">${
              lastAction ? `Last action: ${ctx.ui.esc(lastAction.text)} at ${ctx.ui.esc(lastAction.at)}` : "Ready"
            }</span>
          </div>
        </div>`);

      container.replaceChildren(root);
      if (focusKey) root.querySelector(`[data-fk="${focusKey}"]`)?.focus({ preventScroll: true });

      root.querySelectorAll("[data-menu]").forEach((button) => {
        button.addEventListener("click", () => openMenuBar(button.dataset.menu, button));
      });

      root.querySelectorAll("[data-sort]").forEach((button) => {
        button.addEventListener("click", () => {
          const current = uiState();
          const key = button.dataset.sort;
          persist({
            sortKey: key,
            sortDir: current.sortKey === key && current.sortDir === "asc" ? "desc" : "asc",
          });
          paint();
        });
      });

      root.querySelectorAll("[data-view]").forEach((button) => {
        button.addEventListener("click", () => setView(button.dataset.view));
      });

      root.querySelectorAll("[data-svc-action]").forEach((button) => {
        button.addEventListener("click", () => handle(button.dataset.svcAction, selectedService()));
      });

      const rowNodes = [...root.querySelectorAll("[data-svc-row]")];
      for (const row of rowNodes) {
        const service = list.find((entry) => entry.id === row.dataset.svcRow);
        row.addEventListener("click", () => {
          persist({ selectedId: service.id });
          paint();
          container.querySelector(`[data-svc-row="${service.id}"]`)?.focus({ preventScroll: true });
        });
        row.addEventListener("dblclick", () => openProperties(service));
        row.addEventListener("contextmenu", (event) => {
          event.preventDefault();
          event.stopPropagation();
          openContextMenu(service, event.clientX, event.clientY);
        });
        row.addEventListener("keydown", (event) => {
          const index = list.findIndex((entry) => entry.id === service.id);
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const next = list[index + (event.key === "ArrowDown" ? 1 : -1)];
            if (!next) return;
            persist({ selectedId: next.id });
            paint();
            container.querySelector(`[data-svc-row="${next.id}"]`)?.focus({ preventScroll: true });
          } else if (event.key === "Enter") {
            event.preventDefault();
            openProperties(service);
          } else if (event.key === "ContextMenu" || (event.key === "F10" && event.shiftKey)) {
            event.preventDefault();
            const rect = row.getBoundingClientRect();
            openContextMenu(service, rect.left + 24, rect.bottom - 2);
          }
        });
      }
    }

    const off = ctx.events.on("*", (event) => {
      // setUi is our own selection/sort bookkeeping; paint() already ran.
      if (event?.type === "ui:changed") return;
      paint();
    });

    instances.set(container, {
      stop: () => {
        alive = false;
        off?.();
        closeOurDialog();
      },
    });
    paint();
  },

  unmount(container) {
    instances.get(container)?.stop?.();
    instances.delete(container);
  },
};
