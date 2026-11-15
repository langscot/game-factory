// Windows Update. A Settings page, not a standalone program: the left rail is
// the Settings navigation, the breadcrumb carries the location, and the pages
// below it are the Windows Update surface. All of it is shell — the buttons
// drive a mock install loop so a technician can see the states, but nothing
// here touches the real machine, the registry or the filesystem.
//
// State lives in ctx.world.session.ui("wupdate"); the authored strings live
// next to this file in content.js. No other app is imported.

import {
  DEFAULT_UI,
  HISTORY,
  NAV_ITEMS,
  OPTIONAL_UPDATES,
  PAUSE_WEEKS,
  TODAY,
  UPDATE_DETAILS,
  addDays,
  dateValue,
  kindOf,
  sizeOf,
  titleOf,
} from "./content.js";

const instances = new WeakMap();

// The mock loops. Uploads and installs take a couple of seconds on purpose:
// the progress state is part of the page, not a loading screen to skip.
const CHECK_STEP = 4;
const CHECK_INTERVAL = 0.12;
const INSTALL_STEP = 7;
const INSTALL_INTERVAL = 0.16;
const OPTIONAL_STEP = 8;
const OPTIONAL_INTERVAL = 0.18;
const RESTART_STEP = 10;
const RESTART_INTERVAL = 0.16;

const glyph = (body) => `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

const ICONS = {
  update: glyph(`<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v4.5h-4.5"/><path d="M9 12.2l2 2 4-4"/>`),
  history: glyph(`<circle cx="12" cy="12" r="8.4"/><path d="M12 7.4V12l3.2 1.9"/><path d="M4.8 5.5v4.2h4.2"/>`),
  pause: glyph(`<rect x="6.5" y="5" width="3.6" height="14" rx="1"/><rect x="13.9" y="5" width="3.6" height="14" rx="1"/>`),
  gear: glyph(`<circle cx="12" cy="12" r="3"/><path d="M19.2 13.6a7.6 7.6 0 0 0 0-3.2l2-1.5-2-3.4-2.3 1a7.8 7.8 0 0 0-2.8-1.6L13.7 2h-3.4l-.4 2.9a7.8 7.8 0 0 0-2.8 1.6l-2.3-1-2 3.4 2 1.5a7.6 7.6 0 0 0 0 3.2l-2 1.5 2 3.4 2.3-1a7.8 7.8 0 0 0 2.8 1.6l.4 2.9h3.4l.4-2.9a7.8 7.8 0 0 0 2.8-1.6l2.3 1 2-3.4z"/>`),
  optional: glyph(`<circle cx="12" cy="12" r="8.4"/><path d="M12 7.5v9M7.5 12h9"/>`),
  warning: glyph(`<path d="M12 3.4l9 16.2H3z"/><path d="M12 9v4.4"/><circle cx="12" cy="16.6" r=".8" fill="currentColor" stroke="none"/>`),
  error: glyph(`<circle cx="12" cy="12" r="8.4"/><path d="M9.2 9.2l5.6 5.6M14.8 9.2l-5.6 5.6"/>`),
  checkCircle: glyph(`<circle cx="12" cy="12" r="8.4"/><path d="M8.2 12.2l2.5 2.5 5-5"/>`),
  shield: glyph(`<path d="M12 3.2l7 2.6v5.4c0 4.3-2.9 7.5-7 10-4.1-2.5-7-5.7-7-10V5.8z"/><path d="M9.5 12l1.7 1.7 3.3-3.3"/>`),
  restart: glyph(`<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v4.5h-4.5"/>`),
};

export default {
  id: "wupdate",
  title: "Windows Update",
  titleFor: () => "Settings",
  icon: "wupdate",
  size: [880, 620],
  desktop: true,
  pinned: true,
  order: 10,
  position: [190, 34],

  mount(container, ctx) {
    ctx.ui.styles("wupdate", css);

    let active = true;
    let cancelJob = null;

    const uiState = () => ({ ...DEFAULT_UI, ...ctx.world.session.ui("wupdate") });
    const save = (patch) => ctx.actions.setUi("wupdate", patch);
    const technician = () => ctx.world.session.current().technician;
    const machine = () => ctx.world.machines.byOwner(ctx.world.session.current().technicianId);
    const advancedState = () => ({ ...DEFAULT_UI.advanced, ...(uiState().advanced || {}) });

    const availableUpdates = () => {
      const installed = new Set(uiState().installedIds);
      return ctx.world.directoryServices
        .updates()
        .filter((update) => update.status === "available" && !installed.has(update.id));
    };

    const pendingUpdates = () => {
      const ids = new Set(uiState().pendingRestartIds);
      return ctx.world.directoryServices.updates().filter((update) => ids.has(update.id));
    };

    const optionalRemaining = () => {
      const installed = new Set(uiState().optionalInstalled);
      return OPTIONAL_UPDATES.filter((update) => !installed.has(update.id));
    };

    const isBusy = () => {
      const status = uiState().status;
      return status === "checking" || status === "downloading" || status === "installing" || status === "restarting";
    };

    const optionalBusy = () => {
      const status = uiState().optionalStatus;
      return status === "downloading" || status === "installing";
    };

    const nowText = () => `Today, ${ctx.clock.timeText()}`;

    function runProgress({ progressKey, step, interval, firstPatch = {}, patchFor, onDone }) {
      cancelJob?.();
      let value = 0;
      save({ [progressKey]: 0, ...firstPatch });

      const tick = () => {
        if (!active) return;
        value = Math.min(100, value + step);
        save({ [progressKey]: value, ...(patchFor ? patchFor(value) : {}) });
        if (value >= 100) {
          cancelJob = null;
          onDone();
          return;
        }
        cancelJob = ctx.clock.schedule(interval, tick);
      };

      cancelJob = ctx.clock.schedule(interval, tick);
    }

    function historyEntry(update, extra = {}) {
      return {
        date: TODAY,
        title: titleOf(update),
        kind: kindOf(update),
        outcome: "success",
        code: "0x0",
        ...extra,
      };
    }

    // If the window was closed mid-install the scheduled work is gone; settle
    // the saved state instead of leaving a progress bar frozen forever.
    function settleInterruptedState() {
      const state = uiState();
      if (state.status === "checking") {
        save({
          status: availableUpdates().length ? "available" : "uptodate",
          progress: 0,
          lastChecked: nowText(),
        });
      } else if (state.status === "downloading" || state.status === "installing") {
        const updates = availableUpdates();
        save({
          status: "restart",
          progress: 100,
          pendingRestartIds: updates.map((update) => update.id),
          history: [...updates.map((update) => historyEntry(update, { note: "Restart required" })), ...state.history],
        });
      } else if (state.status === "restarting") {
        const installed = new Set([...state.installedIds, ...state.pendingRestartIds]);
        save({
          status: "uptodate",
          progress: 0,
          installedIds: [...installed],
          pendingRestartIds: [],
          lastChecked: nowText(),
        });
      }
      if (state.optionalStatus === "downloading" || state.optionalStatus === "installing") {
        save({ optionalStatus: "idle", optionalProgress: 0 });
      }
    }

    // -----------------------------------------------------------------------
    // actions
    // -----------------------------------------------------------------------

    function checkForUpdates() {
      if (isBusy() || uiState().pausedUntil) return;
      runProgress({
        progressKey: "progress",
        step: CHECK_STEP,
        interval: CHECK_INTERVAL,
        firstPatch: { status: "checking", pauseMenu: false },
        patchFor: () => ({ status: "checking" }),
        onDone: () => {
          const found = availableUpdates();
          save({
            status: found.length ? "available" : "uptodate",
            progress: 0,
            lastChecked: nowText(),
          });
          ctx.ui.toast("Windows Update", found.length ? `${found.length} update found.` : "You're up to date.", "wupdate");
        },
      });
    }

    function installUpdates() {
      if (isBusy() || uiState().pausedUntil) return;
      const updates = availableUpdates();
      if (!updates.length) return;
      runProgress({
        progressKey: "progress",
        step: INSTALL_STEP,
        interval: INSTALL_INTERVAL,
        firstPatch: { status: "downloading" },
        patchFor: (value) => ({ status: value < 45 ? "downloading" : "installing" }),
        onDone: () => {
          save({
            status: "restart",
            progress: 100,
            pendingRestartIds: updates.map((update) => update.id),
            history: [...updates.map((update) => historyEntry(update, { note: "Restart required" })), ...uiState().history],
          });
          ctx.ui.toast("Windows Update", "Updates installed. A restart is required.", "wupdate");
        },
      });
    }

    function restartNow() {
      if (uiState().status !== "restart") return;
      const pending = uiState().pendingRestartIds;
      runProgress({
        progressKey: "progress",
        step: RESTART_STEP,
        interval: RESTART_INTERVAL,
        firstPatch: { status: "restarting" },
        patchFor: () => ({ status: "restarting" }),
        onDone: () => {
          const installed = new Set([...uiState().installedIds, ...pending]);
          save({
            status: "uptodate",
            progress: 0,
            installedIds: [...installed],
            pendingRestartIds: [],
            lastChecked: nowText(),
          });
          ctx.ui.toast("Windows Update", "Restart complete. This device is up to date.", "wupdate");
        },
      });
    }

    function pauseUpdates(weeks) {
      if (isBusy()) return;
      const until = addDays(TODAY, weeks * 7);
      save({ pausedUntil: until, pauseWeeks: weeks, pauseMenu: false });
      ctx.ui.toast("Windows Update", `Updates paused until ${until}.`, "wupdate");
    }

    function resumeUpdates() {
      save({ pausedUntil: "", pauseWeeks: 0, pauseMenu: false });
      ctx.ui.toast("Windows Update", "Updates resumed.", "wupdate");
    }

    function toggleOptional(id) {
      const selected = new Set(uiState().optionalSelected);
      if (selected.has(id)) selected.delete(id);
      else selected.add(id);
      save({ optionalSelected: [...selected], optionalStatus: "idle" });
    }

    function installOptional() {
      if (optionalBusy()) return;
      const state = uiState();
      const selected = new Set(state.optionalSelected);
      const updates = OPTIONAL_UPDATES.filter(
        (update) => selected.has(update.id) && !state.optionalInstalled.includes(update.id),
      );
      if (!updates.length) return;

      runProgress({
        progressKey: "optionalProgress",
        step: OPTIONAL_STEP,
        interval: OPTIONAL_INTERVAL,
        firstPatch: { optionalStatus: "downloading", optionalError: "" },
        patchFor: (value) => ({ optionalStatus: value < 40 ? "downloading" : "installing" }),
        onDone: () => {
          const ok = updates.filter((update) => !update.bad);
          const bad = updates.filter((update) => update.bad);
          const current = uiState();
          save({
            optionalStatus: bad.length ? "failed" : "done",
            optionalProgress: 100,
            optionalSelected: [],
            optionalInstalled: [...new Set([...current.optionalInstalled, ...ok.map((update) => update.id)])],
            optionalFailed: [...new Set([...current.optionalFailed, ...bad.map((update) => update.id)])],
            optionalError: bad.length
              ? `${bad[0].title} couldn't be installed. Error ${bad[0].error}.`
              : "",
            history: [
              ...updates.map((update) => ({
                date: TODAY,
                title: update.title,
                kind: "Driver update",
                outcome: update.bad ? "failed" : "success",
                code: update.bad ? update.error : "0x0",
              })),
              ...current.history,
            ],
          });
          if (bad.length) ctx.ui.toast("Windows Update", `Driver install failed: ${bad[0].error}.`, "wupdate");
          else ctx.ui.toast("Windows Update", "Optional update installed.", "wupdate");
        },
      });
    }

    function toggleAdvanced(key) {
      const current = advancedState();
      save({ advanced: { ...current, [key]: !current[key] } });
    }

    // -----------------------------------------------------------------------
    // markup
    // -----------------------------------------------------------------------

    function progressBar(value, label) {
      const percent = Math.max(0, Math.min(100, Math.round(value)));
      return `<div class="wu-progress-wrap">
        <div class="wu-progress" role="progressbar" aria-label="${ctx.ui.esc(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><i style="width:${percent}%"></i></div>
        <span class="wu-progress-text">${percent}%</span>
      </div>`;
    }

    function breadcrumb(current) {
      return `<div class="wu-crumbs">
        <span>Settings</span><span class="wu-sep">›</span><span>System</span><span class="wu-sep">›</span>
        ${
          current
            ? `<button class="wu-crumb-link" data-view="main" data-focus-key="crumb-main">Windows Update</button><span class="wu-sep">›</span><span class="wu-crumb-cur" aria-current="page">${ctx.ui.esc(current)}</span>`
            : `<span class="wu-crumb-cur" aria-current="page">Windows Update</span>`
        }
      </div>`;
    }

    const PAGE_META = {
      main: ["Windows Update", "Security, quality and driver updates for this device."],
      history: ["Update history", "Updates installed on this device, newest first. Failures keep their Windows Update error code."],
      optional: ["Optional updates", "Drivers and other updates Microsoft recommends only when you need them."],
      advanced: ["Advanced options", "Delivery, restart and update behaviour for this device."],
    };

    function header(state) {
      const [title, subtitle] = PAGE_META[state.view] || PAGE_META.main;
      const back = state.view === "main"
        ? ""
        : `<button class="wu-back" data-view="main" data-focus-key="back" aria-label="Back to Windows Update">${ctx.ui.icon("$arrowLeft")}</button>`;
      return `<div class="wu-head">
        ${breadcrumb(state.view === "main" ? "" : title)}
        <div class="wu-title-row">${back}<h1 class="wu-h1">${ctx.ui.esc(title)}</h1></div>
        <p class="wu-sub">${ctx.ui.esc(subtitle)}</p>
      </div>`;
    }

    function heroBlock(tone, iconMarkup, title, body, action = "", progress = "") {
      return `<div class="wu-hero ${tone}">
        <span class="wu-hero-ico">${iconMarkup}</span>
        <div class="wu-hero-copy">
          <h2 aria-live="polite">${title}</h2>
          <p>${body}</p>
          ${progress}
        </div>
        ${action ? `<div class="wu-hero-act">${action}</div>` : ""}
      </div>`;
    }

    function hero(state) {
      if (state.pausedUntil) {
        return heroBlock(
          "paused",
          ICONS.pause,
          "Updates paused",
          `Updates are paused until ${ctx.ui.esc(state.pausedUntil)}. Your device will keep running on the updates it already has.`,
          `<button class="wu-btn primary" data-resume data-focus-key="resume-hero">Resume updates</button>`,
        );
      }

      const count = availableUpdates().length;
      const update = count === 1 ? "update" : "updates";

      if (state.status === "checking") {
        return heroBlock(
          "busy",
          `<span class="spin">${ICONS.update}</span>`,
          "Checking for updates…",
          "Looking for security, quality and driver updates for this device.",
          `<button class="wu-btn" disabled>Checking…</button>`,
          progressBar(state.progress, "Checking for updates"),
        );
      }

      if (state.status === "downloading") {
        return heroBlock(
          "busy",
          ICONS.update,
          "Downloading updates…",
          `${count} ${update} · ${Math.round(state.progress)}% downloaded. You can keep using this device.`,
          `<button class="wu-btn" disabled>Downloading…</button>`,
          progressBar(state.progress, "Downloading updates"),
        );
      }

      if (state.status === "installing") {
        return heroBlock(
          "busy",
          ICONS.update,
          "Installing updates…",
          `${Math.round(state.progress)}% complete. Keep this device on until it finishes.`,
          `<button class="wu-btn" disabled>Installing…</button>`,
          progressBar(state.progress, "Installing updates"),
        );
      }

      if (state.status === "restarting") {
        return heroBlock(
          "busy",
          `<span class="spin">${ICONS.restart}</span>`,
          "Restarting…",
          "Finishing the update installation. This window will catch up in a moment.",
          "",
          progressBar(state.progress, "Restarting"),
        );
      }

      if (state.status === "restart") {
        return heroBlock(
          "info",
          ICONS.checkCircle,
          "Updates installed",
          "Everything that was available is installed. Restart this device to finish.",
        );
      }

      if (state.status === "available") {
        return heroBlock(
          "info",
          ICONS.update,
          `${count} ${update} available`,
          `Last checked: ${ctx.ui.esc(state.lastChecked)}. Download and install to keep this device secure.`,
          `<button class="wu-btn primary" data-install data-focus-key="install">Download &amp; install</button>`,
        );
      }

      return heroBlock(
        "ok",
        ICONS.checkCircle,
        "You're up to date",
        `Last checked: ${ctx.ui.esc(state.lastChecked)}. No new updates are available for this device.`,
        `<button class="wu-btn" data-check data-focus-key="check">Check for updates</button>`,
      );
    }

    function restartBanner() {
      return `<div class="wu-banner warn" role="status">
        <span class="wu-banner-ico">${ICONS.warning}</span>
        <div class="wu-banner-copy">
          <b>Restart required</b>
          <span>Your device needs to restart to finish installing updates.</span>
        </div>
        <button class="wu-btn primary" data-restart data-focus-key="restart">Restart now</button>
      </div>`;
    }

    function updateRow(update, { tag, disabled = false }) {
      const restart = update.requiresRestart ? " · Requires restart" : "";
      return `<div class="wu-update">
        <span class="wu-update-ico">${ICONS.update}</span>
        <div class="wu-update-copy">
          <b>${ctx.ui.esc(titleOf(update))}</b>
          <span>${ctx.ui.esc(kindOf(update))} · ${ctx.ui.esc(sizeOf(update))}${restart}</span>
        </div>
        <span class="wu-tag"${disabled ? ' style="opacity:.55"' : ""}>${ctx.ui.esc(tag)}</span>
      </div>`;
    }

    function updatesSection(state) {
      const paused = Boolean(state.pausedUntil);

      if (state.status === "restart") {
        const pending = pendingUpdates();
        return `<section class="wu-section">
          <div class="wu-section-head"><h3>Ready to finish installing</h3><span>${pending.length} ${pending.length === 1 ? "update" : "updates"}</span></div>
          <div class="wu-card">
            ${pending.map((update) => updateRow(update, { tag: "Installed" })).join("")}
          </div>
        </section>`;
      }

      if (state.status !== "available" && state.status !== "downloading" && state.status !== "installing") return "";
      const updates = availableUpdates();
      if (!updates.length) return "";

      const tag = paused ? "Paused" : state.status === "available" ? "Ready" : "In progress";
      return `<section class="wu-section">
        <div class="wu-section-head"><h3>Available updates</h3><span>${updates.length} ${updates.length === 1 ? "update" : "updates"}</span></div>
        <div class="wu-card">
          ${updates.map((update) => updateRow(update, { tag, disabled: paused })).join("")}
        </div>
        ${paused ? `<p class="wu-hint">Updates are paused. Resume updates when you are ready to install them.</p>` : ""}
      </section>`;
    }

    function pausePanel(state) {
      if (!state.pauseMenu || state.pausedUntil) return "";
      const disabled = isBusy();
      return `<div class="wu-card wu-pause-panel" role="group" aria-label="Pause updates">
        <div class="wu-pause-head">
          <div><b>Pause updates</b><span>Choose how long to pause. Updates resume automatically.</span></div>
          <button class="wu-iconbtn" data-pause-cancel aria-label="Close pause options">×</button>
        </div>
        <div class="wu-seg">
          ${PAUSE_WEEKS.map(
            (weeks) => `<button class="wu-btn" data-pause="${weeks}" data-focus-key="pause-${weeks}" ${disabled ? "disabled" : ""}>${weeks} ${weeks === 1 ? "week" : "weeks"}</button>`,
          ).join("")}
        </div>
      </div>`;
    }

    function moreOptions(state) {
      const paused = Boolean(state.pausedUntil);
      const disabled = isBusy();
      const remaining = optionalRemaining().length;
      return `<section class="wu-section">
        <div class="wu-section-head"><h3>More options</h3></div>
        <div class="wu-tiles">
          <button class="wu-tile" data-view="history" data-focus-key="tile-history">
            <span class="wu-tile-ico">${ICONS.history}</span>
            <b>Update history</b>
            <small>See what was installed and what failed</small>
          </button>
          <button class="wu-tile" ${paused ? "data-resume" : "data-pause-toggle"} data-focus-key="tile-pause" ${disabled ? "disabled" : ""}>
            <span class="wu-tile-ico">${ICONS.pause}</span>
            <b>${paused ? "Resume updates" : "Pause updates"}</b>
            <small>${paused ? `Paused until ${ctx.ui.esc(state.pausedUntil)}` : "Pause for 1, 2 or 4 weeks"}</small>
          </button>
          <button class="wu-tile" data-view="advanced" data-focus-key="tile-advanced">
            <span class="wu-tile-ico">${ICONS.gear}</span>
            <b>Advanced options</b>
            <small>Delivery, restarts and update behaviour</small>
          </button>
          <button class="wu-tile" data-view="optional" data-focus-key="tile-optional">
            <span class="wu-tile-ico">${ICONS.optional}</span>
            <b>Optional updates</b>
            <small>${remaining ? `${remaining} driver ${remaining === 1 ? "update" : "updates"} available` : "Nothing optional today"}</small>
          </button>
        </div>
      </section>`;
    }

    function note() {
      const device = machine();
      return `<div class="wu-note">${ICONS.shield}<span>Some settings are managed by Halcyon Dynamics IT.</span></div>
        <p class="wu-foot">${ctx.ui.esc(device?.hostname || "DESKTOP-8H2K9L")} · ${ctx.ui.esc(device?.os || "Windows 11 Pro 22H2")} · OS build 22621.4317</p>`;
    }

    function mainView(state) {
      const restarting = state.status === "restart";
      return `${restarting ? restartBanner() : ""}${hero(state)}${pausePanel(state)}${updatesSection(state)}${moreOptions(state)}${note()}`;
    }

    function historyRows(state) {
      const served = ctx.world.directoryServices
        .updates()
        .filter((update) => update.status === "installed")
        .map((update) => ({
          date: UPDATE_DETAILS[update.id]?.date || "—",
          title: titleOf(update),
          kind: kindOf(update),
          outcome: "success",
          code: "0x0",
        }));
      return [...(state.history || []), ...served, ...HISTORY].sort((a, b) => dateValue(b.date) - dateValue(a.date));
    }

    function historyView(state) {
      const rows = historyRows(state);
      return `${header(state)}
        <div class="wu-card">
          ${
            rows.length
              ? rows
                  .map((row) => {
                    const ok = row.outcome === "success";
                    return `<div class="wu-hist">
                      <span class="wu-hist-ico ${ok ? "ok" : "bad"}">${ok ? ctx.ui.icon("$check") : "!"}</span>
                      <div class="wu-hist-main">
                        <b>${ctx.ui.esc(row.title)}</b>
                        <span>${ctx.ui.esc(row.date)} · ${ctx.ui.esc(row.kind)}${row.note ? ` · ${ctx.ui.esc(row.note)}` : ""}</span>
                      </div>
                      <div class="wu-hist-result ${ok ? "ok" : "bad"}">
                        <b>${ok ? "Successfully installed" : "Failed to install"}</b>
                        <code>${ctx.ui.esc(row.code)}</code>
                      </div>
                    </div>`;
                  })
                  .join("")
              : `<div class="wu-empty">No update history on this device. Suspiciously clean.</div>`
          }
        </div>
        <p class="wu-foot">History covers the last 90 days. Error codes are provided for the IT ticket, not for decoration.</p>`;
    }

    function optionalRow(update, state) {
      const selected = state.optionalSelected.includes(update.id);
      const failed = state.optionalFailed.includes(update.id);
      return `<label class="wu-opt">
        <input type="checkbox" data-optional="${ctx.ui.esc(update.id)}" data-focus-key="opt-${ctx.ui.esc(update.id)}" ${selected ? "checked" : ""} ${optionalBusy() ? "disabled" : ""}>
        <span class="wu-opt-main">
          <b>${ctx.ui.esc(update.title)}</b>
          <span>${ctx.ui.esc(update.kind)} · ${ctx.ui.esc(update.size)} · Published ${ctx.ui.esc(update.published)}</span>
          <small>${ctx.ui.esc(update.note)}</small>
        </span>
        ${failed ? `<span class="wu-tag bad">Failed ${ctx.ui.esc(update.error)}</span>` : ""}
      </label>`;
    }
    function optionalView(state) {
      const rows = optionalRemaining();
      const selected = state.optionalSelected.filter((id) => rows.some((update) => update.id === id));
      const busy = optionalBusy();
      const progressCard = busy
        ? `<div class="wu-card wu-opt-progress">
            <div class="wu-update-copy">
              <b>${state.optionalStatus === "downloading" ? "Downloading optional updates…" : "Installing optional updates…"}</b>
              <span>${selected.length} ${selected.length === 1 ? "item" : "items"} selected</span>
            </div>
            ${progressBar(state.optionalProgress, "Optional update progress")}
          </div>`
        : "";
      const error = state.optionalError
        ? `<div class="wu-banner bad" role="alert">
            <span class="wu-banner-ico">${ICONS.error}</span>
            <div class="wu-banner-copy"><b>Optional update failed</b><span>${ctx.ui.esc(state.optionalError)}</span></div>
          </div>`
        : "";
      const done = state.optionalStatus === "done" && !error
        ? `<div class="wu-banner ok" role="status">
            <span class="wu-banner-ico">${ICONS.checkCircle}</span>
            <div class="wu-banner-copy"><b>Optional updates installed</b><span>No restart is needed for these drivers.</span></div>
          </div>`
        : "";

      return `${header(state)}
        ${error}${done}${progressCard}
        <div class="wu-card">
          ${rows.length ? rows.map((update) => optionalRow(update, state)).join("") : `<div class="wu-empty">No optional updates are available for this device.</div>`}
        </div>
        <div class="wu-actions-row">
          <button class="wu-btn primary" data-optional-install data-focus-key="optional-install" ${selected.length && !busy ? "" : "disabled"}>${busy ? "Installing…" : "Download &amp; install"}</button>
          <span>${selected.length ? `${selected.length} selected` : "Select an update to install"}</span>
        </div>
        <p class="wu-foot">Optional updates are not installed automatically. Drivers that fail stay in this list so they can be retried or ignored.</p>`;
    }

    function setRow(key, title, body, control) {
      return `<div class="wu-setrow">
        <div class="wu-setrow-main"><b>${ctx.ui.esc(title)}</b><span>${ctx.ui.esc(body)}</span></div>
        ${control}
      </div>`;
    }

    function switchButton(key, on, label) {
      return `<button class="wu-switch${on ? " on" : ""}" role="switch" aria-checked="${on}" aria-label="${ctx.ui.esc(label)}" data-toggle="${key}" data-focus-key="toggle-${key}"></button>`;
    }

    function advancedView(state) {
      const advanced = advancedState();
      return `${header(state)}
        <div class="wu-card">
          ${setRow(
            "otherProducts",
            "Receive updates for other Microsoft products",
            "Get updates for Office and other Microsoft products when Windows updates.",
            switchButton("otherProducts", advanced.otherProducts, "Receive updates for other Microsoft products"),
          )}
          ${setRow(
            "getUpToDate",
            "Get me up to date",
            "Get the latest updates as soon as they are available, including optional ones.",
            switchButton("getUpToDate", advanced.getUpToDate, "Get me up to date"),
          )}
          ${setRow("delivery", "Delivery optimisation", "Allow downloads from other PCs on the local network.", `<span class="wu-value">On</span>`)}
          ${setRow("hours", "Active hours", "Windows will not restart automatically during these hours.", `<span class="wu-value">08:00 – 17:00</span>`)}
          ${setRow("restart", "Restart options", "Control when a required restart happens.", `<span class="wu-value">Managed by IT</span>`)}
        </div>
        <p class="wu-foot">These options are managed by Halcyon Dynamics IT on managed devices.</p>`;
    }

    function navMarkup(state) {
      const tech = technician();
      const alert = state.status === "available" || state.status === "restart";
      return `<aside class="wu-nav">
        <label class="wu-search">
          ${ctx.ui.icon("$search")}
          <input type="search" placeholder="Find a setting" value="${ctx.ui.esc(state.search || "")}" data-search data-focus-key="search" aria-label="Find a setting" spellcheck="false">
        </label>
        <div class="wu-user">
          <span class="wu-avatar">${ctx.ui.icon("$user")}</span>
          <div><b>${ctx.ui.esc(tech?.displayName || "Morgan Hayes")}</b><span>${ctx.ui.esc(tech?.logonName || "m.hayes")}</span></div>
        </div>
        <nav class="wu-navlist" aria-label="Settings">
          ${NAV_ITEMS.map((item) => {
            const selected = item.id === "windowsupdate";
            return `<button class="wu-navitem${selected ? " sel" : ""}" data-nav="${item.id}" data-label="${ctx.ui.esc(item.label)}" data-focus-key="nav-${item.id}" ${selected ? 'aria-current="page"' : ""}>
              <span class="wu-navico">${item.icon}</span>
              <span>${ctx.ui.esc(item.label)}</span>
              ${selected && alert ? `<span class="wu-dot" aria-label="Updates available"></span>` : ""}
            </button>`;
          }).join("")}
        </nav>
        <div class="wu-navfoot">Windows 11 Pro<br>22H2 · 22621.4317</div>
      </aside>`;
    }

    function paint() {
      const state = uiState();
      const focused = container.contains(document.activeElement) ? document.activeElement?.dataset?.focusKey : null;

      container.innerHTML = "";
      const root = ctx.ui.el(`<div class="wu">${navMarkup(state)}<div class="wu-content"><div class="wu-scroll">${
        state.view === "history"
          ? historyView(state)
          : state.view === "optional"
            ? optionalView(state)
            : state.view === "advanced"
              ? advancedView(state)
              : mainView(state)
      }</div></div></div>`);
      container.append(root);

      wire(root, state);

      if (focused) {
        const target = root.querySelector(`[data-focus-key="${focused}"]`);
        if (target && !target.disabled) {
          target.focus({ preventScroll: true });
          if (target.matches("input[data-search]")) {
            const end = target.value.length;
            target.setSelectionRange?.(end, end);
          }
        }
      }
    }

    function wire(root, state) {
      const search = root.querySelector("[data-search]");
      search?.addEventListener("input", () => {
        save({ search: search.value });
      });
      search?.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          search.value = "";
          save({ search: "" });
        }
      });

      for (const button of root.querySelectorAll("[data-nav]")) {
        button.addEventListener("click", () => {
          if (button.dataset.nav === "windowsupdate") {
            save({ view: "main", pauseMenu: false });
            return;
          }
          ctx.ui.toast("Settings", `${button.dataset.label} is not part of this build. Windows Update is.`, "settings");
        });
      }

      for (const button of root.querySelectorAll("[data-view]")) {
        button.addEventListener("click", () => save({ view: button.dataset.view, pauseMenu: false }));
      }

      root.querySelector("[data-check]")?.addEventListener("click", checkForUpdates);
      root.querySelector("[data-install]")?.addEventListener("click", installUpdates);
      root.querySelector("[data-restart]")?.addEventListener("click", restartNow);

      root.querySelector("[data-pause-toggle]")?.addEventListener("click", () => {
        save({ pauseMenu: !state.pauseMenu });
      });
      root.querySelector("[data-pause-cancel]")?.addEventListener("click", () => save({ pauseMenu: false }));
      for (const button of root.querySelectorAll("[data-pause]")) {
        button.addEventListener("click", () => pauseUpdates(Number(button.dataset.pause)));
      }
      for (const button of root.querySelectorAll("[data-resume]")) {
        button.addEventListener("click", resumeUpdates);
      }

      for (const input of root.querySelectorAll("[data-optional]")) {
        input.addEventListener("change", () => toggleOptional(input.dataset.optional));
      }
      root.querySelector("[data-optional-install]")?.addEventListener("click", installOptional);

      for (const button of root.querySelectorAll("[data-toggle]")) {
        button.addEventListener("click", () => toggleAdvanced(button.dataset.toggle));
      }
    }

    settleInterruptedState();

    const offEvents = ctx.events.on("*", paint);
    instances.set(container, {
      stop: () => {
        active = false;
        cancelJob?.();
        offEvents?.();
      },
    });

    paint();
  },

  unmount(container) {
    instances.get(container)?.stop?.();
    instances.delete(container);
  },
};

const css = `
.app-wupdate { height: 100%; overflow: hidden; background: rgba(32, 32, 32, 0.42); color: var(--text); }
.app-wupdate .wu { display: grid; grid-template-columns: 228px minmax(0, 1fr); height: 100%; }
.app-wupdate button, .app-wupdate input { font: inherit; }
.app-wupdate :is(button, input):focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; border-radius: 4px; }

.app-wupdate .wu-nav { display: flex; flex-direction: column; min-height: 0; padding: 10px 8px 8px; border-right: 1px solid var(--stroke); background: rgba(255, 255, 255, 0.018); }
.app-wupdate .wu-search { display: flex; align-items: center; gap: 6px; margin: 0 4px 5px; padding: 6px 8px; border-radius: 5px; background: rgba(255, 255, 255, 0.055); border: 1px solid var(--stroke); }
.app-wupdate .wu-search:focus-within { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }
.app-wupdate .wu-search svg { width: 14px; height: 14px; color: var(--text-3); flex: none; }
.app-wupdate .wu-search input { flex: 1; min-width: 0; padding: 0; border: 0; outline: 0; background: none; color: var(--text-2); font-size: 11.5px; }
.app-wupdate .wu-search input::placeholder { color: var(--text-3); }
.app-wupdate .wu-search input::-webkit-search-cancel-button { display: none; }
.app-wupdate .wu-user { display: flex; align-items: center; gap: 9px; padding: 6px 9px 11px; }
.app-wupdate .wu-avatar { width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(180deg, #4a86c8, #2c5f95); color: #dcebff; display: grid; place-items: center; flex: none; }
.app-wupdate .wu-avatar svg { width: 16px; height: 16px; }
.app-wupdate .wu-user b { display: block; font-size: 12px; font-weight: 600; }
.app-wupdate .wu-user span { display: block; font-size: 10.5px; color: var(--text-3); }
.app-wupdate .wu-navlist { flex: 1; min-height: 0; overflow: auto; padding: 0 2px 6px; }
.app-wupdate .wu-navitem { position: relative; display: flex; align-items: center; gap: 10px; width: 100%; padding: 7px 9px 7px 12px; border-radius: 5px; text-align: left; font-size: 12.3px; color: var(--text-2); }
.app-wupdate .wu-navitem::before { content: ""; position: absolute; left: 0; top: 50%; width: 3px; height: 16px; border-radius: 2px; background: var(--accent); transform: translateY(-50%) scaleY(0); transition: transform 0.12s ease; }
.app-wupdate .wu-navitem:hover { background: var(--hover); }
.app-wupdate .wu-navitem.sel { background: rgba(255, 255, 255, 0.075); color: #fff; }
.app-wupdate .wu-navitem.sel::before { transform: translateY(-50%) scaleY(1); }
.app-wupdate .wu-navico { width: 16px; height: 16px; color: var(--text-3); flex: none; display: grid; place-items: center; }
.app-wupdate .wu-navitem.sel .wu-navico { color: var(--accent); }
.app-wupdate .wu-navico svg { width: 16px; height: 16px; }
.app-wupdate .wu-dot { width: 6px; height: 6px; margin-left: auto; border-radius: 50%; background: var(--accent); flex: none; box-shadow: 0 0 0 3px rgba(76, 194, 255, 0.12); }
.app-wupdate .wu-navfoot { padding: 7px 9px 1px; border-top: 1px solid var(--stroke); color: var(--text-3); font-size: 10px; line-height: 1.5; }

.app-wupdate .wu-content { min-width: 0; min-height: 0; display: flex; flex-direction: column; }
.app-wupdate .wu-scroll { flex: 1; min-height: 0; overflow: auto; padding: 18px 28px 26px; }
.app-wupdate .wu-head { margin-bottom: 16px; }
.app-wupdate .wu-crumbs { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 12px; font-size: 11px; color: var(--text-3); }
.app-wupdate .wu-sep { color: rgba(255, 255, 255, 0.28); }
.app-wupdate .wu-crumb-link { padding: 0; color: var(--text-3); font-size: 11px; }
.app-wupdate .wu-crumb-link:hover { color: var(--text-2); text-decoration: underline; }
.app-wupdate .wu-crumb-cur { color: var(--text-2); }
.app-wupdate .wu-title-row { display: flex; align-items: center; gap: 9px; }
.app-wupdate .wu-back { width: 28px; height: 28px; display: grid; place-items: center; margin-left: -4px; border-radius: 4px; color: var(--text-2); }
.app-wupdate .wu-back:hover { background: var(--hover); }
.app-wupdate .wu-back svg { width: 15px; height: 15px; }
.app-wupdate .wu-h1 { margin: 0 0 3px; font-size: 23px; line-height: 1.25; font-weight: 600; letter-spacing: -0.01em; }
.app-wupdate .wu-sub { margin: 0; font-size: 12px; line-height: 1.5; color: var(--text-3); }

.app-wupdate .wu-hero { display: flex; align-items: flex-start; flex-wrap: wrap; gap: 15px; padding: 18px 18px 17px; margin-bottom: 15px; border: 1px solid var(--stroke); border-radius: 8px; background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.032)); }
.app-wupdate .wu-hero-ico { width: 44px; height: 44px; border-radius: 50%; display: grid; place-items: center; flex: none; }
.app-wupdate .wu-hero-ico svg { width: 23px; height: 23px; }
.app-wupdate .wu-hero.ok .wu-hero-ico { background: rgba(108, 203, 95, 0.15); color: #6ccb5f; box-shadow: inset 0 0 0 1px rgba(108, 203, 95, 0.3); }
.app-wupdate .wu-hero.info .wu-hero-ico, .app-wupdate .wu-hero.busy .wu-hero-ico { background: rgba(76, 194, 255, 0.13); color: var(--accent); box-shadow: inset 0 0 0 1px rgba(76, 194, 255, 0.28); }
.app-wupdate .wu-hero.paused .wu-hero-ico { background: rgba(255, 255, 255, 0.07); color: var(--text-2); box-shadow: inset 0 0 0 1px var(--stroke-2); }
.app-wupdate .wu-hero-copy { flex: 1; min-width: 170px; padding-top: 2px; }
.app-wupdate .wu-hero-copy h2 { margin: 0 0 3px; font-size: 15.5px; font-weight: 600; }
.app-wupdate .wu-hero-copy p { margin: 0; color: var(--text-3); font-size: 12px; line-height: 1.5; }
.app-wupdate .wu-hero-act { display: flex; align-items: center; gap: 8px; flex: none; padding-top: 6px; margin-left: auto; }
.app-wupdate .wu-hero-ico .spin { display: block; animation: wu-spin 1.1s linear infinite; transform-origin: 50% 50%; }
@keyframes wu-spin { to { transform: rotate(360deg); } }

.app-wupdate .wu-progress-wrap { display: flex; align-items: center; gap: 9px; margin-top: 10px; }
.app-wupdate .wu-progress { flex: 1; height: 4px; border-radius: 2px; background: rgba(255, 255, 255, 0.13); overflow: hidden; }
.app-wupdate .wu-progress i { display: block; height: 100%; border-radius: 2px; background: var(--accent); transition: width 0.18s linear; }
.app-wupdate .wu-progress-text { min-width: 30px; text-align: right; font-size: 10.5px; color: var(--text-3); font-variant-numeric: tabular-nums; }

.app-wupdate .wu-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 7px 13px; border: 1px solid var(--stroke-2); border-radius: 5px; background: rgba(255, 255, 255, 0.06); color: #fff; font-size: 12px; white-space: nowrap; }
.app-wupdate .wu-btn:hover:not(:disabled) { background: rgba(255, 255, 255, 0.11); }
.app-wupdate .wu-btn.primary { border-color: transparent; background: var(--accent-strong); }
.app-wupdate .wu-btn.primary:hover:not(:disabled) { background: #1b7bc2; }
.app-wupdate .wu-btn:disabled { opacity: 0.45; cursor: default; }

.app-wupdate .wu-banner { display: flex; align-items: center; gap: 13px; padding: 13px 15px; margin-bottom: 15px; border: 1px solid; border-radius: 7px; }
.app-wupdate .wu-banner.warn { border-color: rgba(240, 179, 91, 0.35); background: rgba(240, 179, 91, 0.09); }
.app-wupdate .wu-banner.bad { border-color: rgba(255, 110, 110, 0.32); background: rgba(255, 110, 110, 0.08); }
.app-wupdate .wu-banner.ok { border-color: rgba(108, 203, 95, 0.3); background: rgba(108, 203, 95, 0.07); }
.app-wupdate .wu-banner-ico { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; flex: none; background: rgba(240, 179, 91, 0.16); color: #f0b35b; }
.app-wupdate .wu-banner-ico svg { width: 17px; height: 17px; }
.app-wupdate .wu-banner.bad .wu-banner-ico { background: rgba(255, 110, 110, 0.14); color: #ff8b8b; }
.app-wupdate .wu-banner.ok .wu-banner-ico { background: rgba(108, 203, 95, 0.15); color: #6ccb5f; }
.app-wupdate .wu-banner-copy { flex: 1; min-width: 0; }
.app-wupdate .wu-banner-copy b { display: block; font-size: 13px; font-weight: 600; }
.app-wupdate .wu-banner-copy span { display: block; margin-top: 2px; color: var(--text-3); font-size: 11.5px; line-height: 1.45; }

.app-wupdate .wu-section { margin-top: 17px; }
.app-wupdate .wu-section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin: 0 2px 8px; }
.app-wupdate .wu-section-head h3 { margin: 0; font-size: 12.5px; font-weight: 600; }
.app-wupdate .wu-section-head span { color: var(--text-3); font-size: 11px; }
.app-wupdate .wu-card { border: 1px solid var(--stroke); border-radius: 7px; background: rgba(255, 255, 255, 0.035); overflow: hidden; }

.app-wupdate .wu-update { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-bottom: 1px solid var(--stroke); }
.app-wupdate .wu-update:last-child { border-bottom: 0; }
.app-wupdate .wu-update-ico { width: 30px; height: 30px; border-radius: 6px; display: grid; place-items: center; flex: none; color: var(--accent); background: rgba(76, 194, 255, 0.11); }
.app-wupdate .wu-update-ico svg { width: 17px; height: 17px; }
.app-wupdate .wu-update-copy { flex: 1; min-width: 0; }
.app-wupdate .wu-update-copy b { display: block; font-size: 12px; font-weight: 600; line-height: 1.4; }
.app-wupdate .wu-update-copy span { display: block; margin-top: 2px; color: var(--text-3); font-size: 11px; }
.app-wupdate .wu-tag { flex: none; padding: 2px 8px; border: 1px solid var(--stroke-2); border-radius: 10px; background: rgba(255, 255, 255, 0.035); color: var(--text-2); font-size: 10px; }
.app-wupdate .wu-tag.bad { border-color: rgba(255, 110, 110, 0.32); background: rgba(255, 110, 110, 0.07); color: #ff9a9a; }

.app-wupdate .wu-tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(128px, 1fr)); gap: 9px; }
.app-wupdate .wu-tile { display: flex; flex-direction: column; align-items: flex-start; gap: 9px; min-height: 92px; padding: 12px 12px 10px; border: 1px solid var(--stroke); border-radius: 7px; background: rgba(255, 255, 255, 0.035); text-align: left; color: var(--text-2); }
.app-wupdate .wu-tile:hover:not(:disabled) { border-color: var(--stroke-2); background: rgba(255, 255, 255, 0.07); }
.app-wupdate .wu-tile:disabled { opacity: 0.5; cursor: default; }
.app-wupdate .wu-tile-ico { width: 22px; height: 22px; color: var(--accent); }
.app-wupdate .wu-tile-ico svg { width: 22px; height: 22px; }
.app-wupdate .wu-tile b { font-size: 12px; font-weight: 600; }
.app-wupdate .wu-tile small { margin-top: auto; color: var(--text-3); font-size: 10.5px; line-height: 1.35; }

.app-wupdate .wu-pause-panel { margin-top: 10px; padding: 13px 14px; border-color: rgba(76, 194, 255, 0.25); background: rgba(76, 194, 255, 0.055); }
.app-wupdate .wu-pause-head { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 11px; }
.app-wupdate .wu-pause-head b { display: block; font-size: 12.5px; font-weight: 600; }
.app-wupdate .wu-pause-head span { display: block; margin-top: 2px; color: var(--text-3); font-size: 11px; line-height: 1.45; }
.app-wupdate .wu-pause-head .wu-iconbtn { margin-left: auto; }
.app-wupdate .wu-iconbtn { width: 24px; height: 24px; display: grid; place-items: center; border-radius: 4px; color: var(--text-3); font-size: 16px; line-height: 1; }
.app-wupdate .wu-iconbtn:hover { background: var(--hover); color: #fff; }
.app-wupdate .wu-seg { display: flex; gap: 8px; }
.app-wupdate .wu-seg .wu-btn { flex: 1; }
.app-wupdate .wu-hint { margin: 9px 2px 0; color: #e0b56a; font-size: 11px; }

.app-wupdate .wu-hist { display: grid; grid-template-columns: 24px minmax(0, 1fr) 152px; gap: 10px; align-items: center; padding: 12px 14px; border-bottom: 1px solid var(--stroke); }
.app-wupdate .wu-hist:last-child { border-bottom: 0; }
.app-wupdate .wu-hist-ico { width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; font-size: 12px; font-weight: 700; }
.app-wupdate .wu-hist-ico.ok { background: rgba(108, 203, 95, 0.14); color: #6ccb5f; }
.app-wupdate .wu-hist-ico.ok svg { width: 13px; height: 13px; }
.app-wupdate .wu-hist-ico.bad { background: rgba(255, 110, 110, 0.13); color: #ff8b8b; }
.app-wupdate .wu-hist-main { min-width: 0; }
.app-wupdate .wu-hist-main b { display: block; font-size: 12px; font-weight: 500; line-height: 1.4; }
.app-wupdate .wu-hist-main span { display: block; margin-top: 2px; color: var(--text-3); font-size: 10.8px; }
.app-wupdate .wu-hist-result { text-align: right; }
.app-wupdate .wu-hist-result b { display: block; font-size: 10.5px; font-weight: 500; }
.app-wupdate .wu-hist-result.ok b { color: #8fe083; }
.app-wupdate .wu-hist-result.bad b { color: #ff9a9a; }
.app-wupdate .wu-hist-result code { display: block; margin-top: 2px; color: var(--text-3); font-family: ui-monospace, Consolas, monospace; font-size: 10.5px; }

.app-wupdate .wu-opt { display: flex; align-items: flex-start; gap: 11px; padding: 12px 14px; border-bottom: 1px solid var(--stroke); cursor: pointer; }
.app-wupdate .wu-opt:last-child { border-bottom: 0; }
.app-wupdate .wu-opt:hover { background: var(--hover); }
.app-wupdate .wu-opt input { width: 16px; height: 16px; margin: 2px 0 0; flex: none; appearance: none; -webkit-appearance: none; border: 1px solid rgba(255, 255, 255, 0.4); border-radius: 3px; background: rgba(0, 0, 0, 0.2); cursor: pointer; }
.app-wupdate .wu-opt input:hover:not(:disabled) { border-color: rgba(255, 255, 255, 0.65); }
.app-wupdate .wu-opt input:checked { border-color: transparent; background-color: var(--accent-strong); background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M3 8.5l3 3 7-7' stroke='white' stroke-width='2' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-size: 11px 11px; background-position: center; background-repeat: no-repeat; }
.app-wupdate .wu-opt input:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.app-wupdate .wu-opt input:disabled { opacity: 0.45; cursor: default; }
.app-wupdate .wu-opt-main { flex: 1; min-width: 0; }
.app-wupdate .wu-opt-main b { display: block; font-size: 12px; font-weight: 600; line-height: 1.4; }
.app-wupdate .wu-opt-main span { display: block; margin-top: 2px; color: var(--text-3); font-size: 10.8px; }
.app-wupdate .wu-opt-main small { display: block; margin-top: 5px; color: var(--text-3); font-size: 10.8px; line-height: 1.45; }
.app-wupdate .wu-actions-row { display: flex; align-items: center; gap: 12px; margin-top: 12px; }
.app-wupdate .wu-actions-row span { color: var(--text-3); font-size: 11px; }
.app-wupdate .wu-opt-progress { display: flex; flex-direction: column; gap: 2px; margin-bottom: 10px; padding: 12px 14px; }
.app-wupdate .wu-opt-progress .wu-progress-wrap { margin-top: 4px; }

.app-wupdate .wu-setrow { display: flex; align-items: center; gap: 14px; padding: 12px 14px; border-bottom: 1px solid var(--stroke); }
.app-wupdate .wu-setrow:last-child { border-bottom: 0; }
.app-wupdate .wu-setrow-main { flex: 1; min-width: 0; }
.app-wupdate .wu-setrow-main b { display: block; font-size: 12px; font-weight: 600; }
.app-wupdate .wu-setrow-main span { display: block; margin-top: 2px; color: var(--text-3); font-size: 10.8px; line-height: 1.45; }
.app-wupdate .wu-value { flex: none; color: var(--text-3); font-size: 11px; }
.app-wupdate .wu-switch { position: relative; width: 38px; height: 20px; flex: none; border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 10px; background: rgba(255, 255, 255, 0.09); transition: background 0.15s ease, border-color 0.15s ease; }
.app-wupdate .wu-switch::after { content: ""; position: absolute; top: 3px; left: 3px; width: 12px; height: 12px; border-radius: 50%; background: #fff; transition: transform 0.15s ease; }
.app-wupdate .wu-switch.on { border-color: transparent; background: var(--accent-strong); }
.app-wupdate .wu-switch.on::after { transform: translateX(18px); }

.app-wupdate .wu-empty { padding: 20px 16px; text-align: center; color: var(--text-3); font-size: 12px; }
.app-wupdate .wu-note { display: flex; align-items: center; gap: 8px; margin-top: 16px; padding: 8px 11px; border: 1px solid var(--stroke); border-radius: 5px; background: rgba(255, 255, 255, 0.02); color: var(--text-3); font-size: 10.8px; }
.app-wupdate .wu-note svg { width: 14px; height: 14px; flex: none; color: var(--text-3); }
.app-wupdate .wu-foot { margin: 13px 2px 0; color: rgba(255, 255, 255, 0.38); font-size: 10.5px; line-height: 1.5; }
`;
