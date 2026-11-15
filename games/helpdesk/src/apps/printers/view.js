// The Devices and Printers page and its print-queue window. Both are views of
// session.ui.printers; every button commits a change and the ui:changed event
// paints the page again.

import { openAddPrinterWizard, openPrinterProperties, printTestPage } from "./dialogs.js";
import { commit, jobStatus, pendingJobs, printerStatus, readState, spoolerState } from "./state.js";

const ARROW_BACK = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10.5 3L5.5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ARROW_FORWARD = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const PLUS = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;
const MINUS = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;
const GEAR = `<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="2.2" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M8 1.8v1.6M8 12.6v1.6M1.8 8h1.6M12.6 8h1.6M3.6 3.6l1.1 1.1M11.3 11.3l1.1 1.1M12.4 3.6l-1.1 1.1M4.7 11.3l-1.1 1.1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`;
const PRINT = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 5V2.5h7V5" fill="none" stroke="currentColor" stroke-width="1.1"/><rect x="2.2" y="5" width="11.6" height="6" rx="1.3" fill="none" stroke="currentColor" stroke-width="1.1"/><path d="M4.5 9.5h7v4h-7z" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>`;
const DOC = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 1.8h5.4L12 4.4v9.8H4z" fill="#eef3fa" stroke="#8ca0b8" stroke-width=".9"/><path d="M9.4 1.8v2.6H12" fill="#c7d6e6"/><path d="M5.8 7h4.4M5.8 9.2h4.4M5.8 11.4h3" stroke="#8ca0b8" stroke-width=".8" stroke-linecap="round"/></svg>`;

const DEVICE_ART = {
  computer: `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="5" y="7" width="38" height="26" rx="2.4" fill="#4a90d9"/><rect x="8" y="10" width="32" height="20" rx="1" fill="#dceeff"/><path d="M18 38h12M24 33v5" stroke="#7a8b9e" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  monitor: `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="5" y="8" width="38" height="25" rx="2.4" fill="#4a90d9"/><rect x="8" y="11" width="32" height="19" rx="1" fill="#dceeff"/><path d="M17 38h14M24 33v5" stroke="#7a8b9e" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  keyboard: `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="4" y="15" width="40" height="20" rx="3" fill="#6f7d8c"/><g fill="#dbe5ef"><rect x="8" y="19" width="5" height="3.4" rx=".8"/><rect x="15" y="19" width="5" height="3.4" rx=".8"/><rect x="22" y="19" width="5" height="3.4" rx=".8"/><rect x="29" y="19" width="5" height="3.4" rx=".8"/><rect x="36" y="19" width="4" height="3.4" rx=".8"/><rect x="8" y="24.4" width="4" height="3.4" rx=".8"/><rect x="14" y="24.4" width="18" height="3.4" rx=".8"/><rect x="34" y="24.4" width="6" height="3.4" rx=".8"/><rect x="12" y="29.8" width="24" height="2.6" rx=".8"/></g></svg>`,
  mouse: `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="14" y="7" width="20" height="34" rx="10" fill="#6f7d8c"/><path d="M24 8v13" stroke="#dbe5ef" stroke-width="1.6"/><rect x="22" y="11" width="4" height="7" rx="2" fill="#dbe5ef"/></svg>`,
};

function ownerName(ctx, ownerId) {
  return ctx.world.people.get(ownerId)?.displayName || "m.hayes";
}

function selectedPrinter(state) {
  return state.printers.find((printer) => printer.id === state.selectedPrinterId) || null;
}

function printerJobs(state, printerId) {
  return state.jobs.filter((job) => job.printerId === printerId);
}

// ---------------------------------------------------------------------------
// page
// ---------------------------------------------------------------------------

function tileMarkup(ctx, state, printer, spoolerRunning) {
  const status = printerStatus(printer, spoolerRunning);
  const pending = pendingJobs(state, printer.id).length;
  const detail =
    status.kind === "ready"
      ? pending
        ? `${pending} document${pending === 1 ? "" : "s"} pending`
        : status.detail
      : pending
        ? `${status.detail} · ${pending} pending`
        : status.detail;
  return `
    <button class="tile${printer.id === state.selectedPrinterId ? " sel" : ""}${printer.default ? " default" : ""}"
      data-tile="printer" data-printer="${ctx.ui.esc(printer.id)}" data-name="${ctx.ui.esc(printer.name.toLowerCase())}"
      aria-label="${ctx.ui.esc(printer.name)} – ${ctx.ui.esc(status.label)}${printer.default ? ", default printer" : ""}">
      ${printer.default ? `<span class="tile-check" title="Default printer">${ctx.ui.icon("$check")}</span>` : ""}
      <span class="tile-art">${ctx.ui.icon("printer")}</span>
      <span class="tile-name">${ctx.ui.esc(printer.name)}</span>
      <span class="tile-state ${status.kind}">${ctx.ui.esc(status.label)}</span>
      <span class="tile-detail">${ctx.ui.esc(detail)}</span>
    </button>`;
}

function deviceMarkup(ctx, state, device) {
  return `
    <button class="tile device${device.id === state.selectedDeviceId ? " sel" : ""}" data-tile="device"
      data-device="${ctx.ui.esc(device.id)}" data-name="${ctx.ui.esc(device.name.toLowerCase())}"
      aria-label="${ctx.ui.esc(device.name)} – ${ctx.ui.esc(device.status)}">
      <span class="tile-art">${DEVICE_ART[device.kind.toLowerCase()] || DEVICE_ART.computer}</span>
      <span class="tile-name">${ctx.ui.esc(device.name)}</span>
      <span class="tile-state ready">Ready</span>
      <span class="tile-detail">${ctx.ui.esc(device.kind)} – ${ctx.ui.esc(device.detail)}</span>
    </button>`;
}

export function renderApp(container, ctx) {
  const state = readState(ctx);
  if (!state.initialized) return;
  const spooler = spoolerState(ctx);
  const printer = selectedPrinter(state);
  const device = state.devices.find((item) => item.id === state.selectedDeviceId) || null;
  const status = printer ? printerStatus(printer, spooler.running) : null;
  const busiest = printer ? pendingJobs(state, printer.id).length : 0;

  container.innerHTML = `
    <div class="cp">
      <div class="cp-address">
        <span class="cp-nav">
          <button disabled aria-label="Back">${ARROW_BACK}</button>
          <button disabled aria-label="Forward">${ARROW_FORWARD}</button>
        </span>
        <span class="cp-crumbs">
          <span class="crumb-icon">${ctx.ui.icon("printer")}</span>
          Control Panel <i>›</i> Hardware and Sound <i>›</i> <b>Devices and Printers</b>
        </span>
        <label class="cp-search">${ctx.ui.icon("$search")}
          <input data-search placeholder="Search Devices and Printers" aria-label="Search Devices and Printers" autocomplete="off">
        </label>
      </div>

      <div class="cp-command" role="toolbar" aria-label="Devices and Printers commands">
        <button class="cp-btn" data-add-printer>${PLUS}<span>Add a printer</span></button>
        <button class="cp-btn" data-add-device>${PLUS}<span>Add a device</span></button>
        <span class="cp-sep"></span>
        <button class="cp-btn" data-open-queue ${printer ? "" : "disabled"}>${PRINT}<span>See what's printing</span></button>
        <button class="cp-btn" data-properties ${printer ? "" : "disabled"}>${GEAR}<span>Printer properties</span></button>
        <button class="cp-btn" data-default ${printer && !printer.default ? "" : "disabled"}>${ctx.ui.icon("$check")}<span>Set as default</span></button>
        <span class="cp-sep"></span>
        <button class="cp-btn" data-remove ${printer || device ? "" : "disabled"}>${MINUS}<span>Remove device</span></button>
      </div>

      <div class="cp-main">
        <section class="cp-section">
          <h3>Printers <span>${state.printers.length}</span></h3>
          <div class="tile-grid" data-printer-grid>
            ${state.printers.map((item) => tileMarkup(ctx, state, item, spooler.running)).join("")}
          </div>
        </section>
        <section class="cp-section">
          <h3>Devices <span>${state.devices.length}</span></h3>
          <div class="tile-grid" data-device-grid>
            ${state.devices.map((item) => deviceMarkup(ctx, state, item)).join("")}
          </div>
        </section>
        <p class="cp-note">Printers and devices are managed by Halcyon Dynamics IT. Right-click a printer for more options.</p>
      </div>

      <div class="cp-statusbar">
        <span class="cp-selection">
          ${
            printer
              ? `<b>${ctx.ui.esc(printer.name)}</b><span class="${status.kind}">${ctx.ui.esc(status.label)}</span>
                 <span>${busiest ? `${busiest} document${busiest === 1 ? "" : "s"} in queue` : ctx.ui.esc(status.detail)}</span>`
              : device
                ? `<b>${ctx.ui.esc(device.name)}</b><span class="ready">Ready</span><span>${ctx.ui.esc(device.kind)}</span>`
                : `<span>Ready</span>`
          }
        </span>
        <span class="spooler ${spooler.running ? "ok" : "bad"}">
          Print Spooler: ${spooler.running ? "Running" : "Stopped"}
        </span>
      </div>
    </div>
    ${state.queueOpen && printer ? queueMarkup(ctx, state, printer, spooler) : ""}`;

  wirePage(container, ctx, printer, device);
  if (state.queueOpen && printer) wireQueue(container, ctx, printer);
}

function wirePage(container, ctx, printer, device) {
  const search = container.querySelector("[data-search]");
  search?.addEventListener("input", () => {
    const term = search.value.trim().toLowerCase();
    for (const tile of container.querySelectorAll(".tile")) {
      tile.hidden = Boolean(term) && !tile.dataset.name.includes(term);
    }
  });

  for (const tile of container.querySelectorAll('[data-tile="printer"]')) {
    const record = readState(ctx).printers.find((item) => item.id === tile.dataset.printer);
    tile.addEventListener("click", () => {
      commit(ctx, (draft) => {
        draft.selectedPrinterId = tile.dataset.printer;
        draft.selectedDeviceId = null;
      });
    });
    tile.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      openPrinterMenu(ctx, record, event.clientX, event.clientY);
    });
  }

  for (const tile of container.querySelectorAll('[data-tile="device"]')) {
    tile.addEventListener("click", () => {
      commit(ctx, (draft) => {
        draft.selectedDeviceId = tile.dataset.device;
        draft.selectedPrinterId = null;
      });
    });
  }

  container.querySelector("[data-add-printer]")?.addEventListener("click", () => openAddPrinterWizard(ctx));
  container.querySelector("[data-add-device]")?.addEventListener("click", () =>
    ctx.ui.alert("Add a device", "Windows cannot find any new devices.\n\nMake sure the device is turned on and discoverable, then try again."),
  );
  container.querySelector("[data-open-queue]")?.addEventListener("click", () => {
    if (!printer) return;
    commit(ctx, (draft) => {
      draft.queueOpen = true;
      draft.selectedJobId = null;
    });
  });
  container.querySelector("[data-properties]")?.addEventListener("click", () => {
    if (printer) openPrinterProperties(ctx, printer.id);
  });
  container.querySelector("[data-default]")?.addEventListener("click", () => {
    if (!printer || printer.default) return;
    commit(ctx, (draft) => {
      for (const item of draft.printers) item.default = item.id === printer.id;
    });
    ctx.ui.toast("Devices and Printers", `${printer.name} is now the default printer.`, "printer");
  });
  container.querySelector("[data-remove]")?.addEventListener("click", () => {
    const name = printer?.name || device?.name || "this device";
    ctx.ui.alert("Remove device", `${name} is managed by Halcyon Dynamics IT.\n\nRemoving a managed device needs a change request. Open a ticket with Facilities.`);
  });
}

function openPrinterMenu(ctx, printer, x, y) {
  if (!printer) return;
  const running = spoolerState(ctx).running;
  ctx.ui.menu(x, y, [
    {
      label: "See what's printing",
      icon: "doc",
      onClick: () => commit(ctx, (draft) => { draft.queueOpen = true; draft.selectedJobId = null; }),
    },
    { label: "Printer properties", icon: "settings", onClick: () => openPrinterProperties(ctx, printer.id) },
    { separator: true },
    {
      label: printer.default ? "Default printer" : "Set as default printer",
      checked: printer.default,
      disabled: printer.default,
      onClick: () => {
        commit(ctx, (draft) => {
          for (const item of draft.printers) item.default = item.id === printer.id;
        });
        ctx.ui.toast("Devices and Printers", `${printer.name} is now the default printer.`, "printer");
      },
    },
    {
      label: printer.offline ? "Use Printer Online" : "Use Printer Offline",
      checked: printer.offline,
      disabled: !running,
      onClick: () =>
        commit(ctx, (draft) => {
          const item = draft.printers.find((record) => record.id === printer.id);
          if (item) item.offline = !item.offline;
        }),
    },
    { separator: true },
    { label: "Print test page", icon: "printer", disabled: !running || printer.offline, onClick: () => printTestPage(ctx, printer) },
    { label: "Remove device", icon: "bin", danger: true, onClick: () => ctx.ui.alert("Remove device", "This device is managed by Halcyon Dynamics IT. Open a ticket with Facilities to remove it.") },
  ]);
}

// ---------------------------------------------------------------------------
// queue window
// ---------------------------------------------------------------------------

function queueMarkup(ctx, state, printer, spooler) {
  const jobs = printerJobs(state, printer.id);
  const status = printerStatus(printer, spooler.running);
  const selected = state.jobs.find((job) => job.id === state.selectedJobId) || null;
  const canPause = selected && !["paused", "cancelled", "complete", "error"].includes(selected.status);
  const canResume = selected?.status === "paused";
  const canCancel = selected && !["cancelled", "complete"].includes(selected.status);
  const canDelete = Boolean(selected);
  const banner = !spooler.running
    ? `<div class="q-banner error"><b>Printer offline</b><span>The Print Spooler service is stopped. Restart it in Services, then try again.</span></div>`
    : printer.offline
      ? `<div class="q-banner offline"><b>Use Printer Offline</b><span>This printer is set to work offline. Queued documents will wait.</span></div>`
      : printer.status === "error"
        ? `<div class="q-banner error"><b>Printer error</b><span>${ctx.ui.esc(printer.error || "The printer needs attention.")}</span></div>`
        : printer.paused
          ? `<div class="q-banner warn"><b>Printing paused</b><span>Documents will stay in the queue until printing resumes.</span></div>`
          : "";

  const rows = jobs
    .map((job) => {
      const view = jobStatus(job.status);
      return `<tr class="job${job.id === state.selectedJobId ? " sel" : ""}${job.status === "cancelled" ? " dead" : ""}"
          data-job="${ctx.ui.esc(job.id)}" tabindex="0" aria-selected="${job.id === state.selectedJobId}">
          <td class="doc">${DOC}<span>${ctx.ui.esc(job.document)}</span></td>
          <td><span class="pill ${view.kind}">${ctx.ui.esc(view.label)}</span></td>
          <td>${ctx.ui.esc(ownerName(ctx, job.ownerId))}</td>
          <td class="num">${job.pages}</td>
          <td>${ctx.ui.esc(job.submittedAt)}</td>
        </tr>`;
    })
    .join("");

  return `
    <div class="q-layer">
      <div class="qwin" role="dialog" aria-label="${ctx.ui.esc(printer.name)} print queue">
        <div class="q-titlebar">
          <span class="q-icon">${ctx.ui.icon("printer")}</span>
          <span class="q-title">${ctx.ui.esc(printer.name)}</span>
          <button class="q-close" data-qclose aria-label="Close print queue">×</button>
        </div>
        <div class="q-menubar">
          <button data-qmenu>Printer</button>
          <button data-qmenu-about>File</button>
          <button data-qmenu-about>View</button>
          <button data-qmenu-about>Help</button>
        </div>
        <div class="q-toolbar" role="toolbar" aria-label="Queue commands">
          <button data-qact="pause" title="Pause printing" aria-label="Pause printing" ${canPause ? "" : "disabled"}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="5" y="4" width="3.4" height="12" rx="1" fill="currentColor"/><rect x="11.6" y="4" width="3.4" height="12" rx="1" fill="currentColor"/></svg>
          </button>
          <button data-qact="resume" title="Resume printing" aria-label="Resume printing" ${canResume ? "" : "disabled"}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 3.6l10 6.4-10 6.4z" fill="currentColor"/></svg>
          </button>
          <span class="q-sep"></span>
          <button data-qact="cancel" title="Cancel document" aria-label="Cancel document" ${canCancel ? "" : "disabled"}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
          <button data-qact="delete" title="Delete document" aria-label="Delete document" ${canDelete ? "" : "disabled"}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 6h12M6 6l1 10h6l1-10M8 4h4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
        </div>
        ${banner}
        <div class="q-table">
          <table>
            <thead><tr><th>Document Name</th><th>Status</th><th>Owner</th><th class="num">Pages</th><th>Submitted</th></tr></thead>
            <tbody>${rows || `<tr class="empty"><td colspan="5">No documents in the queue.</td></tr>`}</tbody>
          </table>
        </div>
        <div class="q-statusbar">
          <span>${jobs.length} document${jobs.length === 1 ? "" : "s"} in queue</span>
          <span>${ctx.ui.esc(status.label)}</span>
        </div>
      </div>
    </div>`;
}

function wireQueue(container, ctx, printer) {
  container.querySelector("[data-qclose]")?.addEventListener("click", () => closeQueue(ctx));
  container.querySelectorAll("[data-qmenu-about]").forEach((button) =>
    button.addEventListener("click", () => ctx.ui.alert("Print queue", "This menu is not needed to work a job. Use the toolbar, or the Printer menu.")),
  );
  container.querySelector("[data-qmenu]")?.addEventListener("click", (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    openQueueMenu(ctx, printer, rect.left, rect.bottom + 2);
  });

  for (const row of container.querySelectorAll("[data-job]")) {
    const select = () => {
      commit(ctx, (draft) => {
        draft.selectedJobId = row.dataset.job;
      });
    };
    row.addEventListener("click", select);
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        select();
      }
    });
  }

  container.querySelectorAll("[data-qact]").forEach((button) => {
    button.addEventListener("click", () => {
      const job = readState(ctx).jobs.find((item) => item.id === readState(ctx).selectedJobId);
      if (!job) return;
      const action = button.dataset.qact;
      if (action === "pause") {
        commit(ctx, (draft) => {
          const item = draft.jobs.find((record) => record.id === job.id);
          if (item && !["paused", "cancelled", "complete"].includes(item.status)) item.status = "paused";
        });
      } else if (action === "resume") {
        commit(ctx, (draft) => {
          const item = draft.jobs.find((record) => record.id === job.id);
          if (item?.status === "paused") item.status = "queued";
        });
      } else if (action === "cancel") {
        commit(ctx, (draft) => {
          const item = draft.jobs.find((record) => record.id === job.id);
          if (item && !["cancelled", "complete"].includes(item.status)) item.status = "cancelled";
        });
        ctx.ui.toast("Devices and Printers", `${job.document} was cancelled.`, "printer");
      } else if (action === "delete") {
        commit(ctx, (draft) => {
          draft.jobs = draft.jobs.filter((record) => record.id !== job.id);
          draft.selectedJobId = null;
        });
      }
    });
  });
}

function openQueueMenu(ctx, printer, x, y) {
  const state = readState(ctx);
  const jobs = pendingJobs(state, printer.id);
  const running = spoolerState(ctx).running;
  ctx.ui.menu(x, y, [
    {
      label: printer.paused ? "Resume Printing" : "Pause Printing",
      disabled: !running,
      onClick: () => {
        commit(ctx, (draft) => {
          const item = draft.printers.find((record) => record.id === printer.id);
          if (!item) return;
          item.paused = !item.paused;
          for (const job of draft.jobs) {
            if (job.printerId !== printer.id) continue;
            if (item.paused && (job.status === "printing" || job.status === "queued")) job.status = "paused";
            if (!item.paused && job.status === "paused") job.status = "queued";
          }
        });
      },
    },
    {
      label: "Cancel All Documents",
      disabled: !jobs.length,
      onClick: async () => {
        const count = pendingJobs(readState(ctx), printer.id).length;
        const confirmed = await ctx.ui.confirm(
          "Cancel All Documents",
          `Cancel all ${count} document${count === 1 ? "" : "s"} for ${printer.name}?`,
        );
        if (!confirmed) return;
        commit(ctx, (draft) => {
          draft.jobs = draft.jobs.filter(
            (job) => job.printerId !== printer.id || job.status === "complete" || job.status === "cancelled",
          );
          draft.selectedJobId = null;
        });
        ctx.ui.toast("Devices and Printers", "All documents were cancelled.", "printer");
      },
    },
    { separator: true },
    {
      label: printer.offline ? "Use Printer Online" : "Use Printer Offline",
      checked: printer.offline,
      disabled: !running,
      onClick: () =>
        commit(ctx, (draft) => {
          const item = draft.printers.find((record) => record.id === printer.id);
          if (item) item.offline = !item.offline;
        }),
    },
    {
      label: "Print Test Page",
      disabled: !running || printer.offline,
      onClick: () => printTestPage(ctx, printer),
    },
    { label: "Properties…", onClick: () => openPrinterProperties(ctx, printer.id) },
    { separator: true },
    { label: "Close", onClick: () => closeQueue(ctx) },
  ]);
}

export function closeQueue(ctx) {
  commit(ctx, (draft) => {
    draft.queueOpen = false;
    draft.selectedJobId = null;
  });
}
