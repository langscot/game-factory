// Software Center — the Microsoft Configuration Manager client (SCClient.exe).
// It is not a Windows built-in: it is the app SCCM installs so staff can install
// what IT deployed to them. This build is the shell only. Applications go
// through the world's real install/remove actions; updates and requests are
// mock state in session.ui because the world has no action for them yet.

import {
  APP_META,
  DEFAULT_OPTIONS,
  HOURS,
  OS_DEPLOYMENTS,
  formatSize,
  updateClassName,
} from "./content.js";
import { css } from "./styles.js";

const instances = new WeakMap();
const DOWNLOAD_SHARE = 0.55;
const HISTORY_LIMIT = 40;
const MIN_JOB_SECONDS = 2.6;

const TABS = [
  { id: "applications", label: "Applications" },
  { id: "updates", label: "Updates" },
  { id: "operating-systems", label: "Operating Systems" },
  { id: "status", label: "Installation Status" },
  { id: "options", label: "Options" },
];

const FILTERS = [
  { id: "all", label: "All" },
  { id: "available", label: "Available" },
  { id: "installed", label: "Installed" },
];

export default {
  id: "softwarecenter",
  title: "Software Center",
  icon: "softwarecenter",
  size: [920, 680],
  desktop: true,
  pinned: true,
  order: 11,
  position: [130, 36],

  mount(container, ctx) {
    ctx.ui.styles("softwarecenter", css);

    const esc = ctx.ui.esc;
    const uiState = () => ctx.world.session.ui("softwarecenter");
    let active = true;
    let job = null;

    // -----------------------------------------------------------------------
    // world projections
    // -----------------------------------------------------------------------

    const machine = () => ctx.world.machines.byOwner(ctx.world.session.current().technicianId);
    const hostname = () => machine()?.hostname || "THIS-PC";
    const clockText = () => ctx.clock.timeText();

    function decorate(software) {
      const meta = APP_META[software.id] || {};
      return {
        ...software,
        publisher: meta.publisher || "Unknown publisher",
        category: meta.category || "Application",
        color: meta.color || "#44546a",
        initials: meta.initials || software.name.slice(0, 2),
        description: meta.description || "Deployed by Halcyon Dynamics IT.",
      };
    }

    function catalogue() {
      return ctx.world.directoryServices.softwareCatalogue().map(decorate);
    }

    function installedIds() {
      const target = machine();
      return new Set(target?.software || []);
    }

    function installedApps() {
      const ids = installedIds();
      return catalogue().filter((app) => ids.has(app.id));
    }

    function history() {
      return uiState().history || [];
    }

    function requests() {
      return uiState().requests || [];
    }

    function options() {
      return { ...DEFAULT_OPTIONS, ...(uiState().options || {}) };
    }

    function updateRows() {
      const sessionUpdates = uiState().updates || {};
      return ctx.world.directoryServices.updates().map((update) => ({
        ...update,
        classification: updateClassName(update),
        installed: update.status === "installed" || sessionUpdates[update.id] === "installed",
        installing: Boolean(job && job.kind === "update" && job.updateIds.includes(update.id)),
      }));
    }

    const jobPercent = () =>
      job ? Math.min(100, Math.round((job.elapsed / job.total) * 100)) : 0;
    const phaseLabel = () => (job?.phase === "installing" ? "Installing" : "Downloading");

    // -----------------------------------------------------------------------
    // writes
    // -----------------------------------------------------------------------

    function addHistory(entry) {
      ctx.actions.setUi("softwarecenter", {
        history: [entry, ...history()].slice(0, HISTORY_LIMIT),
      });
    }

    function installApp(app) {
      if (!app.approved) {
        requestApp(app);
        return;
      }
      if (job) {
        ctx.ui.toast("Software Center", "Another installation is already in progress.", "softwarecenter");
        return;
      }
      job = {
        kind: "application",
        softwareId: app.id,
        name: app.name,
        phase: "downloading",
        elapsed: 0,
        total: Math.max(MIN_JOB_SECONDS, ctx.clock.delayFor("installSoftware") * 0.55),
      };
      // Selecting the app puts its progress bar in the details pane as well as
      // the status line. setUi repaints, so no extra paint() here.
      ctx.actions.setUi("softwarecenter", { selectedId: app.id });
    }

    function uninstallApp(app) {
      if (job) {
        ctx.ui.toast("Software Center", "Wait for the current installation to finish first.", "softwarecenter");
        return;
      }
      const target = machine();
      if (!target) {
        ctx.ui.toast("Software Center", "No managed device found.", "softwarecenter");
        return;
      }
      const result = ctx.actions.removeSoftware(target.id, app.id);
      if (!result.ok) {
        ctx.ui.toast("Software Center", `Could not uninstall ${app.name}: ${result.reason}.`, "softwarecenter");
        return;
      }
      addHistory({
        name: app.name,
        kind: "Application",
        status: "Uninstalled",
        at: clockText(),
        day: ctx.session.day(),
      });
      ctx.ui.toast("Software Center", `${app.name} was removed from ${target.hostname}.`, "softwarecenter");
    }

    function requestApp(app) {
      if (requests().some((entry) => entry.softwareId === app.id)) {
        ctx.ui.toast("Software Center", `${app.name} has already been requested.`, "softwarecenter");
        return;
      }
      const request = {
        softwareId: app.id,
        name: app.name,
        status: "Submitted",
        at: clockText(),
        day: ctx.session.day(),
      };
      ctx.actions.setUi("softwarecenter", { requests: [request, ...requests()] });
      ctx.ui.toast("Software Center", `Request for ${app.name} sent to the IT Service Desk.`, "softwarecenter");
    }

    function installUpdates(pending) {
      if (!pending.length) return;
      if (job) {
        ctx.ui.toast("Software Center", "Another installation is already in progress.", "softwarecenter");
        return;
      }
      job = {
        kind: "update",
        updateIds: pending.map((update) => update.id),
        updateRows: pending.map((update) => ({ id: update.id, title: update.title })),
        name: pending.length === 1 ? pending[0].title : `${pending.length} software updates`,
        phase: "downloading",
        elapsed: 0,
        total: Math.max(MIN_JOB_SECONDS + 0.4, ctx.clock.delayFor("installSoftware") * 0.75),
      };
      paint();
    }

    function finishJob() {
      const finished = job;
      job = null;

      if (finished.kind === "update") {
        const updates = { ...(uiState().updates || {}) };
        for (const id of finished.updateIds) updates[id] = "installed";
        const at = clockText();
        const day = ctx.session.day();
        const rows = finished.updateRows.map((update) => ({
          name: update.title,
          kind: "Update",
          status: "Installed",
          at,
          day,
        }));
        ctx.actions.setUi("softwarecenter", {
          updates,
          history: [...rows, ...history()].slice(0, HISTORY_LIMIT),
        });
        ctx.ui.toast(
          "Software Center",
          `${finished.updateRows.length} update${finished.updateRows.length === 1 ? "" : "s"} installed.`,
          "softwarecenter",
        );
        return;
      }

      const target = machine();
      const result = target
        ? ctx.actions.installSoftware(target.id, finished.softwareId)
        : { ok: false, reason: "no-managed-device" };
      const at = clockText();
      const day = ctx.session.day();

      if (!result.ok && result.reason !== "already-installed") {
        addHistory({
          name: finished.name,
          kind: "Application",
          status: "Failed",
          at,
          day,
        });
        ctx.ui.toast(
          "Software Center",
          `Could not install ${finished.name}: ${String(result.reason).replace(/-/g, " ")}.`,
          "softwarecenter",
        );
        paint();
        return;
      }

      addHistory({
        name: finished.name,
        kind: "Application",
        status: "Installed",
        at,
        day,
      });
      ctx.ui.toast("Software Center", `${finished.name} is installed on ${target.hostname}.`, "softwarecenter");
    }

    // The clock pauses while the tab is hidden, so progress freezes with it.
    function tick(dt) {
      if (!active || !job) return;
      job.elapsed += dt;

      const nextPhase = job.elapsed < job.total * DOWNLOAD_SHARE ? "downloading" : "installing";
      if (nextPhase !== job.phase) {
        job.phase = nextPhase;
        paint();
        return;
      }

      if (job.elapsed >= job.total) {
        finishJob();
        return;
      }

      updateJobBar();
    }

    // Per-frame DOM updates keep the install animation cheap: only the bars and
    // labels change, the tiles and tables are left alone.
    function updateJobBar() {
      const percent = jobPercent();
      container.querySelectorAll("[data-job-bar]").forEach((node) => {
        node.style.width = `${percent}%`;
      });
      container.querySelectorAll("[data-job-pct]").forEach((node) => {
        node.textContent = job ? `${percent}%` : "";
      });
      container.querySelectorAll("[data-job-label]").forEach((node) => {
        node.textContent = job ? `${phaseLabel()} ${job.name}` : "Ready";
      });
      container.querySelectorAll("[data-job-status-text]").forEach((node) => {
        node.textContent = job ? `${phaseLabel()} · ${percent}%` : "";
      });
      container.querySelectorAll("[data-job-dot]").forEach((node) => {
        node.classList.toggle("busy", Boolean(job));
      });
    }

    // -----------------------------------------------------------------------
    // paint
    // -----------------------------------------------------------------------

    function paint() {
      if (!active) return;
      const ui = uiState();
      const tab = TABS.some((entry) => entry.id === ui.tab) ? ui.tab : "applications";
      const percent = jobPercent();
      // Selecting a card repaints the tab. Keep the grid where the user left
      // it so the card they clicked does not jump out of view.
      const previousGridScroll = container.querySelector(".sc-apps-main")?.scrollTop ?? 0;

      container.innerHTML = "";
      const root = ctx.ui.el(`
        <div class="sc">
          <header class="sc-head">
            <div class="sc-head-row">
              <span class="sc-logo">${ctx.ui.icon("softwarecenter")}</span>
              <div>
                <div class="sc-title">Software Center</div>
                <div class="sc-sub">Microsoft Configuration Manager · SCClient.exe</div>
              </div>
              <div class="sc-device">${esc(hostname())}<small>Halcyon Dynamics IT · Managed device</small></div>
            </div>
            <div class="sc-tabs" role="tablist" aria-label="Software Center sections">
              ${TABS.map(
                (entry) =>
                  `<button class="sc-tab${entry.id === tab ? " sel" : ""}" role="tab" aria-selected="${
                    entry.id === tab
                  }" data-tab="${entry.id}">${entry.label}</button>`,
              ).join("")}
            </div>
          </header>
          <div class="sc-main" role="tabpanel"></div>
          <footer class="sc-foot">
            <span class="sc-dot${job ? " busy" : ""}" data-job-dot></span>
            <span data-job-label>${job ? `${phaseLabel()} ${esc(job.name)}` : "Ready"}</span>
            <span class="sc-bar"${job ? "" : " hidden"}><i data-job-bar style="width:${percent}%"></i></span>
            <span data-job-pct>${job ? `${percent}%` : ""}</span>
            <span class="grow"></span>
            <span>Last checked ${esc(clockText())} · Software Center 5.0.8912.1000</span>
          </footer>
        </div>`);

      container.append(root);

      for (const button of root.querySelectorAll("[data-tab]")) {
        button.addEventListener("click", () => {
          ctx.actions.setUi("softwarecenter", { tab: button.dataset.tab });
        });
        button.addEventListener("keydown", (event) => {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
          event.preventDefault();
          const index = TABS.findIndex((entry) => entry.id === button.dataset.tab);
          const step = event.key === "ArrowRight" ? 1 : -1;
          const next = TABS[(index + step + TABS.length) % TABS.length];
          ctx.actions.setUi("softwarecenter", { tab: next.id });
          container.querySelector(`[data-tab="${next.id}"]`)?.focus();
        });
      }

      const main = root.querySelector(".sc-main");
      if (tab === "applications") {
        main.classList.add("sc-main-apps");
        renderApplications(main, ui);
        const grid = main.querySelector(".sc-apps-main");
        if (grid) grid.scrollTop = previousGridScroll;
      } else if (tab === "updates") renderUpdates(main);
      else if (tab === "operating-systems") renderOperatingSystems(main);
      else if (tab === "status") renderStatus(main);
      else renderOptions(main);
    }

    function statusPill(app, installed) {
      const busy = job?.kind === "application" && job.softwareId === app.id;
      if (!app.approved) return { className: "blocked", text: "Not approved" };
      if (busy) return { className: "busy", text: phaseLabel() };
      if (installed) return { className: "installed", text: "Installed" };
      return { className: "available", text: "Available" };
    }

    function actionButton(app, installed) {
      const requested = requests().some((entry) => entry.softwareId === app.id);
      const busy = job?.kind === "application" && job.softwareId === app.id;
      if (!app.approved) {
        return `<button class="sc-btn ghost" data-request="${app.id}"${
          requested ? " disabled" : ""
        }>${requested ? "Requested" : "Request"}</button>`;
      }
      if (busy) return `<button class="sc-btn primary" disabled>${phaseLabel()}…</button>`;
      if (installed) return `<button class="sc-btn ghost" data-uninstall="${app.id}">Uninstall</button>`;
      return `<button class="sc-btn primary" data-install="${app.id}">Install</button>`;
    }

    function cardHtml(app, installed, selected) {
      const pill = statusPill(app, installed);
      return `
        <div class="sc-card${selected ? " sel" : ""}${app.approved ? "" : " muted"}"
             role="button" tabindex="0" aria-selected="${selected}"
             data-select="${app.id}" aria-label="${esc(app.name)}">
          <div class="sc-card-top">
            <span class="sc-appicon" style="--tile:${app.color}">${esc(app.initials)}</span>
            <span class="sc-card-name"><b>${esc(app.name)}</b><span>${esc(app.publisher)}</span></span>
          </div>
          <div class="sc-meta"><span>Version ${esc(app.version)}</span><span>${formatSize(app.sizeMb)}</span></div>
          <div class="sc-card-foot">
            <span class="sc-pill ${pill.className}">${pill.text}</span>
            ${actionButton(app, installed)}
          </div>
        </div>`;
    }

    function detailHtml(app, installed) {
      const pill = statusPill(app, installed);
      const percent = jobPercent();
      const busy = job?.kind === "application" && job.softwareId === app.id;
      return `
        <div class="sc-detail-icon" style="--tile:${app.color}">${esc(app.initials)}</div>
        <div class="sc-detail-status"><span class="sc-pill ${pill.className}">${pill.text}</span></div>
        <h2>${esc(app.name)}</h2>
        <div class="sc-detail-pub">${esc(app.publisher)}</div>
        <div class="sc-actions">${actionButton(app, installed)}</div>
        <div class="sc-kv"><span>Version</span><b>${esc(app.version)}</b></div>
        <div class="sc-kv"><span>Size</span><b>${formatSize(app.sizeMb)}</b></div>
        <div class="sc-kv"><span>Category</span><b>${esc(app.category)}</b></div>
        <div class="sc-kv"><span>Language</span><b>English (United States)</b></div>
        <div class="sc-kv"><span>Deployed by</span><b>Halcyon Dynamics IT</b></div>
        ${
          busy
            ? `<div class="sc-detail-progress">
                <div class="sc-kv"><span data-job-label>${phaseLabel()} ${esc(job.name)}</span><b data-job-pct>${percent}%</b></div>
                <div class="sc-bar"><i data-job-bar style="width:${percent}%"></i></div>
              </div>`
            : ""
        }
        <p class="sc-desc">${esc(app.description)}</p>
        ${
          app.approved
            ? ""
            : `<div class="sc-detail-note">This application is not deployed to ${esc(
                hostname(),
              )}. Send a request and the IT Service Desk will review it.</div>`
        }`;
    }

    function renderApplications(main, ui) {
      const all = catalogue();
      const approved = all.filter((app) => app.approved);
      const blocked = all.filter((app) => !app.approved);
      const ids = installedIds();
      const filter = FILTERS.some((entry) => entry.id === ui.filter) ? ui.filter : "all";
      const visible = approved.filter((app) =>
        filter === "all" ? true : filter === "installed" ? ids.has(app.id) : !ids.has(app.id),
      );
      const visibleIds = new Set([...visible.map((app) => app.id), ...blocked.map((app) => app.id)]);
      const selectedId = visibleIds.has(ui.selectedId)
        ? ui.selectedId
        : visible[0]?.id || blocked[0]?.id || null;
      const selected = all.find((app) => app.id === selectedId) || null;

      main.innerHTML = `
        <div class="sc-apps">
          <div class="sc-apps-main">
            <div class="sc-toolbar">
              <div>
                <h2 class="sc-h">Applications</h2>
                <div class="sc-hint">Software deployed to ${esc(hostname())} by Halcyon Dynamics IT.</div>
              </div>
              <div class="sc-filters" role="group" aria-label="Filter applications">
                ${FILTERS.map(
                  (entry) =>
                    `<button class="sc-filter${entry.id === filter ? " sel" : ""}" data-filter="${entry.id}">${
                      entry.label
                    }</button>`,
                ).join("")}
              </div>
            </div>
            ${
              visible.length
                ? `<div class="sc-grid">${visible
                    .map((app) => cardHtml(app, ids.has(app.id), app.id === selectedId))
                    .join("")}</div>`
                : `<div class="sc-empty">${
                    filter === "installed"
                      ? "Nothing installed from Software Center yet."
                      : "Everything approved is already installed on this device."
                  }</div>`
            }
            ${
              blocked.length
                ? `<div class="sc-section-title">Not available in Software Center</div>
                   <div class="sc-grid">${blocked
                     .map((app) => cardHtml(app, ids.has(app.id), app.id === selectedId))
                     .join("")}</div>`
                : ""
            }
          </div>
          <aside class="sc-detail" aria-label="Application details">
            ${selected ? detailHtml(selected, ids.has(selected.id)) : `<div class="sc-empty">Select an application.</div>`}
          </aside>
        </div>`;

      wireAppActions(main);
      for (const button of main.querySelectorAll("[data-filter]")) {
        button.addEventListener("click", () => {
          ctx.actions.setUi("softwarecenter", { filter: button.dataset.filter });
        });
      }
      for (const card of main.querySelectorAll("[data-select]")) {
        card.addEventListener("click", (event) => {
          if (event.target.closest("button")) return;
          ctx.actions.setUi("softwarecenter", { selectedId: card.dataset.select });
        });
        card.addEventListener("keydown", (event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          const id = card.dataset.select;
          ctx.actions.setUi("softwarecenter", { selectedId: id });
          container.querySelector(`[data-select="${id}"]`)?.focus();
        });
      }
    }

    function wireAppActions(main) {
      const all = catalogue();
      for (const button of main.querySelectorAll("[data-install]")) {
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          const app = all.find((entry) => entry.id === button.dataset.install);
          if (app) installApp(app);
        });
      }
      for (const button of main.querySelectorAll("[data-uninstall]")) {
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          const app = all.find((entry) => entry.id === button.dataset.uninstall);
          if (app) uninstallApp(app);
        });
      }
      for (const button of main.querySelectorAll("[data-request]")) {
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          const app = all.find((entry) => entry.id === button.dataset.request);
          if (app) requestApp(app);
        });
      }
    }

    function renderUpdates(main) {
      const updates = updateRows();
      const pending = updates.filter((update) => !update.installed);
      main.innerHTML = `
        <div class="sc-page">
          <div class="sc-toolbar">
            <div>
              <h2 class="sc-h">Software Updates</h2>
              <div class="sc-hint">${pending.length} update${
                pending.length === 1 ? "" : "s"
              } available for ${esc(hostname())}.</div>
            </div>
            <button class="sc-btn primary" data-install-all${pending.length && !job ? "" : " disabled"}>Install All</button>
          </div>
          <div class="sc-table-wrap">
            <table class="sc-table">
              <thead><tr><th>Update</th><th>Classification</th><th>Restart</th><th class="num">Size</th><th>Status</th></tr></thead>
              <tbody>
                ${updates
                  .map((update) => {
                    const pill = update.installed
                      ? { className: "installed", text: "Installed" }
                      : update.installing
                        ? { className: "busy", text: "Installing" }
                        : { className: "available", text: "Available" };
                    return `<tr>
                      <td class="nm">${esc(update.title)}<span class="sub">${esc(update.id.toUpperCase())}</span></td>
                      <td>${esc(update.classification)}</td>
                      <td>${update.requiresRestart ? "Required" : "Not required"}</td>
                      <td class="num">${formatSize(update.sizeMb)}</td>
                      <td><span class="sc-pill ${pill.className}">${pill.text}</span></td>
                    </tr>`;
                  })
                  .join("")}
              </tbody>
            </table>
          </div>
          <p class="sc-note">Updates install during the maintenance window. A restart may be required to finish the installation.</p>
        </div>`;
      main.querySelector("[data-install-all]")?.addEventListener("click", () => installUpdates(pending));
    }

    function renderOperatingSystems(main) {
      main.innerHTML = `
        <div class="sc-page">
          <h2 class="sc-h">Operating Systems</h2>
          <div class="sc-hint">Task sequences deployed to ${esc(hostname())} by Halcyon Dynamics IT.</div>
          ${OS_DEPLOYMENTS.map(
            (deployment) => `
            <div class="sc-os">
              <span class="sc-os-icon">OS</span>
              <div class="sc-os-body">
                <h3>${esc(deployment.name)}</h3>
                <p>${esc(deployment.description)}</p>
                <p>${esc(deployment.type)} · Version ${esc(deployment.version)} · ${formatSize(
                  deployment.sizeMb,
                )}</p>
              </div>
              <div class="sc-os-side">
                <span class="sc-pill ${deployment.status === "Required" ? "busy" : "available"}">${esc(
                  deployment.status,
                )}</span>
                <button class="sc-btn ghost" data-os="${deployment.id}">Details</button>
              </div>
            </div>`,
          ).join("")}
          <p class="sc-note">Operating system deployments are approved and scheduled by IT. This device is not targeted for reimaging.</p>
        </div>`;

      for (const button of main.querySelectorAll("[data-os]")) {
        button.addEventListener("click", () => {
          const deployment = OS_DEPLOYMENTS.find((entry) => entry.id === button.dataset.os);
          if (!deployment) return;
          ctx.ui.alert(
            deployment.name,
            `${deployment.description}\n\nType: ${deployment.type}\nVersion: ${deployment.version}\nSize: ${formatSize(
              deployment.sizeMb,
            )}\nStatus: ${deployment.status}\n\nDeployments run in the IT maintenance window. Nothing starts from Software Center.`,
          );
        });
      }
    }

    function timeLabel(entry) {
      const day = entry.day === ctx.session.day() ? "Today" : `Day ${entry.day ?? "?"}`;
      return `${day} · ${entry.at || "—"}`;
    }

    function renderStatus(main) {
      const recent = history();
      const current = installedApps();
      const pendingRequests = requests();
      const percent = jobPercent();

      main.innerHTML = `
        <div class="sc-page">
          <h2 class="sc-h">Installation Status</h2>
          <div class="sc-hint">Installations and requests recorded for ${esc(hostname())}.</div>

          <div class="sc-section-title">In progress</div>
          ${
            job
              ? `<div class="sc-table-wrap"><table class="sc-table">
                  <thead><tr><th>Application</th><th>Type</th><th>Status</th><th class="num">Progress</th></tr></thead>
                  <tbody><tr>
                    <td class="nm">${esc(job.name)}</td>
                    <td>${job.kind === "update" ? "Update" : "Application"}</td>
                    <td><span class="sc-pill busy" data-job-status-text>${phaseLabel()} · ${percent}%</span></td>
                    <td class="num">${percent}%</td>
                  </tr></tbody>
                </table></div>`
              : `<div class="sc-empty">No installation is running.</div>`
          }

          <div class="sc-section-title">Recent activity</div>
          ${
            recent.length
              ? `<div class="sc-table-wrap"><table class="sc-table">
                  <thead><tr><th>Application</th><th>Type</th><th>Status</th><th class="num">Time</th></tr></thead>
                  <tbody>${recent
                    .map((entry) => {
                      const className =
                        entry.status === "Installed"
                          ? "installed"
                          : entry.status === "Failed"
                            ? "failed"
                            : "neutral";
                      return `<tr>
                        <td class="nm">${esc(entry.name)}</td>
                        <td>${esc(entry.kind)}</td>
                        <td><span class="sc-pill ${className}">${esc(entry.status)}</span></td>
                        <td class="num">${esc(timeLabel(entry))}</td>
                      </tr>`;
                    })
                    .join("")}</tbody>
                </table></div>`
              : `<div class="sc-empty">No recent activity.</div>`
          }

          <div class="sc-section-title">Requests</div>
          ${
            pendingRequests.length
              ? `<div class="sc-table-wrap"><table class="sc-table">
                  <thead><tr><th>Application</th><th>Status</th><th class="num">Requested</th></tr></thead>
                  <tbody>${pendingRequests
                    .map(
                      (entry) => `<tr>
                        <td class="nm">${esc(entry.name)}</td>
                        <td><span class="sc-pill neutral">${esc(entry.status)}</span></td>
                        <td class="num">${esc(timeLabel(entry))}</td>
                      </tr>`,
                    )
                    .join("")}</tbody>
                </table></div>`
              : `<div class="sc-empty">No requests submitted.</div>`
          }

          <div class="sc-section-title">Installed on this device</div>
          ${
            current.length
              ? `<div class="sc-table-wrap"><table class="sc-table">
                  <thead><tr><th>Application</th><th>Version</th><th class="num">Size</th><th>Status</th></tr></thead>
                  <tbody>${current
                    .map(
                      (app) => `<tr>
                        <td class="nm">${esc(app.name)}</td>
                        <td>${esc(app.version)}</td>
                        <td class="num">${formatSize(app.sizeMb)}</td>
                        <td><span class="sc-pill installed">Installed</span></td>
                      </tr>`,
                    )
                    .join("")}</tbody>
                </table></div>`
              : `<div class="sc-empty">No managed software is installed.</div>`
          }
        </div>`;
    }

    function renderOptions(main) {
      const current = options();
      main.innerHTML = `
        <div class="sc-page sc-opt">
          <h2 class="sc-h">Options</h2>
          <div class="sc-hint">How Software Center behaves on ${esc(hostname())}.</div>

          <section class="sc-block">
            <h3>Computer maintenance</h3>
            <label class="sc-check"><input type="checkbox" data-opt="autoInstall"${
              current.autoInstall ? " checked" : ""
            }> Automatically install required applications and updates</label>
            <label class="sc-check"><input type="checkbox" data-opt="outsideHours"${
              current.outsideHours ? " checked" : ""
            }> Install and restart outside my working hours</label>
            <div class="sc-hours">
              <span>Working hours</span>
              <select data-opt="workingStart" aria-label="Working hours start">
                ${HOURS.map(
                  (hour) => `<option value="${hour}"${hour === current.workingStart ? " selected" : ""}>${hour}</option>`,
                ).join("")}
              </select>
              <span>to</span>
              <select data-opt="workingEnd" aria-label="Working hours end">
                ${HOURS.map(
                  (hour) => `<option value="${hour}"${hour === current.workingEnd ? " selected" : ""}>${hour}</option>`,
                ).join("")}
              </select>
            </div>
          </section>

          <section class="sc-block">
            <h3>Restart behaviour</h3>
            <label class="sc-check"><input type="radio" name="sc-restart" value="prompt" data-opt="restart"${
              current.restart === "prompt" ? " checked" : ""
            }> Prompt me before restarting</label>
            <label class="sc-check"><input type="radio" name="sc-restart" value="auto" data-opt="restart"${
              current.restart === "auto" ? " checked" : ""
            }> Restart automatically outside working hours</label>
            <label class="sc-check"><input type="radio" name="sc-restart" value="never" data-opt="restart"${
              current.restart === "never" ? " checked" : ""
            }> Never restart automatically</label>
          </section>

          <section class="sc-block">
            <h3>Notifications</h3>
            <label class="sc-check"><input type="checkbox" data-opt="notifyNew"${
              current.notifyNew ? " checked" : ""
            }> Show a notification when new software is available</label>
          </section>

          <div class="sc-row"><button class="sc-btn ghost" data-reset-options>Restore policy defaults</button></div>

          <div class="sc-about">
            Software Center 5.0.8912.1000<br>
            Configuration Manager client 5.00.9128.1000<br>
            Site HAL · Management point ccm.halcyon.co<br>
            Settings are stored on this device and applied by Halcyon Dynamics IT policy.
          </div>
        </div>`;

      for (const input of main.querySelectorAll("[data-opt]")) {
        input.addEventListener("change", () => {
          const key = input.dataset.opt;
          const value = input.type === "checkbox" ? input.checked : input.value;
          ctx.actions.setUi("softwarecenter", {
            options: { ...options(), [key]: value },
          });
        });
      }

      main.querySelector("[data-reset-options]")?.addEventListener("click", () => {
        ctx.actions.setUi("softwarecenter", { options: { ...DEFAULT_OPTIONS } });
        ctx.ui.toast("Software Center", "Policy defaults restored.", "softwarecenter");
      });
    }

    // -----------------------------------------------------------------------
    // wiring
    // -----------------------------------------------------------------------

    const offTick = ctx.clock.onTick(tick);
    const offEvents = ctx.events.on("*", paint);
    ctx.onDispose(() => {
      active = false;
      offTick?.();
      offEvents?.();
    });
    instances.set(container, { stop: () => (active = false) });

    paint();
  },

  unmount(container) {
    instances.get(container)?.stop?.();
    instances.delete(container);
  },
};
