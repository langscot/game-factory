// The two real dialogs on the Spool & Pray page: Add a printer and
// Printer Properties. Both are mock-only but follow the usual flow, errors
// included.

import { DISCOVERED_PRINTERS, addJob, commit, printerStatus, readState, spoolerState } from "./state.js";

const WIZARD_CSS_CLASS = "app-printers";

function dialogHost(ctx, html) {
  const card = ctx.ui.dialog({
    html: `<div class="${WIZARD_CSS_CLASS} printers-dialog">${html}</div>`,
    wire: () => {},
  });
  return card;
}

function modalGone(card) {
  return !card.isConnected || Boolean(card.closest(".modal")?.hidden);
}

// ---------------------------------------------------------------------------
// Add a printer
// ---------------------------------------------------------------------------

export function openAddPrinterWizard(ctx) {
  const card = dialogHost(ctx, `<div class="wiz" data-wiz></div>`);
  const host = card.querySelector("[data-wiz]");
  if (!host) return;

  let mode = "search";
  let searching = true;
  let selectedShare = null;
  let manualValue = "";
  let error = "";
  let install = null;

  ctx.clock.schedule(0.9, () => {
    if (modalGone(card)) return;
    searching = false;
    draw();
  });

  function installedShares() {
    return new Set(readState(ctx).printers.map((printer) => printer.shareName.toLowerCase()));
  }

  function availablePrinters() {
    const installed = installedShares();
    return DISCOVERED_PRINTERS.filter((printer) => !installed.has(printer.shareName.toLowerCase()));
  }

  function draw() {
    if (modalGone(card)) return;
    host.innerHTML = markup();
    wire();
  }

  function markup() {
    if (mode === "installing") {
      return `
        <div class="wiz-head">
          <span class="wiz-icon">${ctx.ui.icon("printer")}</span>
          <div><h2>Add a printer</h2><div class="sub">Adding ${ctx.ui.esc(install?.name || "printer")}…</div></div>
        </div>
        <div class="wiz-working"><span class="spinner"></span><div><b>Installing printer driver</b><span>Doors is copying the driver and creating the port. This can take a moment, or until you give up.</span></div></div>
        <div class="wiz-progress"><i></i></div>`;
    }

    if (mode === "manual") {
      return `
        <div class="wiz-head">
          <span class="wiz-icon">${ctx.ui.icon("printer")}</span>
          <div><h2>Add a printer</h2><div class="sub">Type a printer hostname or IP address.</div></div>
        </div>
        <div class="wiz-body">
          <label class="wiz-label" for="printers-manual-name">Printer name or address</label>
          <input id="printers-manual-name" class="wiz-input" data-name value="${ctx.ui.esc(manualValue)}" placeholder="\\\\PRINT01\\HP-Floor3" autocomplete="off" spellcheck="false">
          <p class="wiz-hint">For a shared printer, use <code>\\\\PRINT01\\share-name</code>. Example: <code>\\\\PRINT01\\Canon-Finance</code>.</p>
          ${error ? `<div class="wiz-error" role="alert"><b>Spool &amp; Pray couldn't add the printer</b><span>${ctx.ui.esc(error)}</span></div>` : ""}
          <button class="wiz-link" data-search-again>Search for printers on the network instead</button>
        </div>
        <div class="wiz-foot">
          <button class="pbtn" data-cancel>Cancel</button>
          <button class="pbtn primary" data-next>Next</button>
        </div>`;
    }

    const list = availablePrinters();
    const technicianId = ctx.world.session.current().technicianId;
    const hostname = ctx.world.machines.byOwner(technicianId)?.hostname || "this PC";
    return `
      <div class="wiz-head">
        <span class="wiz-icon">${ctx.ui.icon("printer")}</span>
        <div><h2>Add a printer</h2><div class="sub">Choose a printer to add to ${ctx.ui.esc(hostname)}.</div></div>
      </div>
      <div class="wiz-body">
        <div class="wiz-search">${
          searching
            ? `<span class="spinner"></span><span>Searching for printers on the network…</span>`
            : `<span class="wiz-search-done">${ctx.ui.icon("$check")}</span><span>Found ${list.length} printer${list.length === 1 ? "" : "s"} on the network.</span>`
        }</div>
        <div class="wiz-list" data-list>
          ${searching
            ? ""
            : list
                .map(
                  (printer) => `<button class="wiz-device${selectedShare === printer.shareName ? " sel" : ""}" data-pick="${ctx.ui.esc(printer.shareName)}">
                    <span class="wiz-device-icon">${ctx.ui.icon("printer")}</span>
                    <span class="wiz-device-text"><b>${ctx.ui.esc(printer.name)}</b><small>${ctx.ui.esc(printer.shareName)} · ${ctx.ui.esc(printer.location)}</small></span>
                  </button>`,
                )
                .join("")}
          ${!searching && !list.length ? `<div class="wiz-empty">No unused printers were found on the network.</div>` : ""}
        </div>
        ${error ? `<div class="wiz-error" role="alert"><b>Spool &amp; Pray couldn't add the printer</b><span>${ctx.ui.esc(error)}</span></div>` : ""}
        <button class="wiz-link" data-manual>The printer that I want isn't listed</button>
      </div>
      <div class="wiz-foot">
        <button class="pbtn" data-cancel>Cancel</button>
        <button class="pbtn primary" data-next ${selectedShare && !searching ? "" : "disabled"}>Next</button>
      </div>`;
  }

  function wire() {
    host.querySelector("[data-cancel]")?.addEventListener("click", () => ctx.ui.closeDialog());
    host.querySelector("[data-manual]")?.addEventListener("click", () => {
      mode = "manual";
      manualValue = "";
      error = "";
      draw();
      host.querySelector("[data-name]")?.focus();
    });
    host.querySelector("[data-search-again]")?.addEventListener("click", () => {
      mode = "search";
      error = "";
      selectedShare = null;
      manualValue = "";
      draw();
    });
    host.querySelectorAll("[data-pick]").forEach((button) =>
      button.addEventListener("click", () => {
        selectedShare = button.dataset.pick;
        error = "";
        draw();
      }),
    );
    host.querySelector("[data-next]")?.addEventListener("click", () => {
      if (mode === "manual") return submitManual();
      const found = DISCOVERED_PRINTERS.find((printer) => printer.shareName === selectedShare);
      if (found) startInstall(found);
    });
    host.querySelector("[data-name]")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        submitManual();
      }
    });
  }

  function submitManual() {
    const value = host.querySelector("[data-name]")?.value.trim() || "";
    manualValue = value;
    if (!value) {
      error = "Type a printer name or address, for example \\\\PRINT01\\HP-Floor3.";
    } else {
      const current = readState(ctx).printers;
      const duplicate = current.find(
        (printer) =>
          printer.shareName.toLowerCase() === value.toLowerCase() || printer.name.toLowerCase() === value.toLowerCase(),
      );
      if (duplicate) {
        error = `A printer named "${duplicate.name}" is already installed on this PC.`;
      } else {
        const found = DISCOVERED_PRINTERS.find(
          (printer) =>
            printer.shareName.toLowerCase() === value.toLowerCase() || printer.name.toLowerCase() === value.toLowerCase(),
        );
        if (found) {
          startInstall(found);
          return;
        }
        error =
          "Doors couldn't connect to the printer. Check the printer name and try again. Error 0x00000bcb. The specified port is unknown.";
      }
    }
    draw();
    host.querySelector("[data-name]")?.focus();
  }

  function startInstall(found) {
    install = found;
    mode = "installing";
    error = "";
    draw();
    ctx.clock.schedule(1.2, () => {
      if (modalGone(card)) return;
      if (readState(ctx).printers.some((printer) => printer.shareName.toLowerCase() === found.shareName.toLowerCase())) {
        ctx.ui.closeDialog();
        ctx.ui.toast("Spool & Pray", `${found.name} is already installed.`, "printer");
        return;
      }
      commit(ctx, (draft) => {
        let index = 101;
        while (draft.printers.some((printer) => printer.id === `prn_${index}`)) index += 1;
        draft.printers.push({
          id: `prn_${index}`,
          name: found.name,
          shareName: found.shareName,
          driver: found.driver,
          model: found.model,
          location: found.location,
          port: found.port,
          status: "ready",
          default: false,
          shared: true,
          offline: false,
          paused: false,
          error: null,
          features: [...found.features],
        });
        draft.selectedPrinterId = `prn_${index}`;
        draft.selectedDeviceId = null;
      });
      ctx.ui.closeDialog();
      ctx.ui.toast("Spool & Pray", `${found.name} was added to this PC.`, "printer");
    });
  }

  draw();
}

// ---------------------------------------------------------------------------
// Printer properties
// ---------------------------------------------------------------------------

const PORT_DESCRIPTION = {
  "PORTPROMPT:": "Local Port",
  USB001: "USB Virtual Printer Port",
};

export function openPrinterProperties(ctx, printerId) {
  const source = readState(ctx).printers.find((printer) => printer.id === printerId);
  if (!source) return;
  const card = dialogHost(ctx, `<div class="props" data-props></div>`);
  const host = card.querySelector("[data-props]");
  if (!host) return;

  let tab = "general";
  let draft = {
    ...structuredClone(source),
    priority: source.priority || "50",
    availability: source.availability || "always",
    spool: source.spool || "last",
    holdMismatched: source.holdMismatched || false,
    printSpooledFirst: source.printSpooledFirst ?? true,
    keepPrinted: source.keepPrinted || false,
    advancedFeatures: source.advancedFeatures ?? true,
  };
  const ports = [...new Set([source.port, "IP_10.14.7.31", "PORTPROMPT:", "USB001", "WSD-3f21a9b4-7710-4c1e"])];

  function draw() {
    if (modalGone(card)) return;
    host.innerHTML = markup();
    wire();
  }

  function statusLine() {
    return printerStatus(draft, spoolerState(ctx).running);
  }

  function markup() {
    const status = statusLine();
    return `
      <div class="props-head">
        <span class="props-icon">${ctx.ui.icon("printer")}</span>
        <div><h2>${ctx.ui.esc(draft.name)} Properties</h2><div class="sub">${ctx.ui.esc(draft.model)} · ${ctx.ui.esc(draft.port)}</div></div>
      </div>
      <div class="props-tabs" role="tablist">
        ${tabButton("general", "General")}
        ${tabButton("sharing", "Sharing")}
        ${tabButton("ports", "Ports")}
        ${tabButton("advanced", "Advanced")}
      </div>
      <div class="props-body">
        ${tab === "general" ? generalTab(status) : ""}
        ${tab === "sharing" ? sharingTab() : ""}
        ${tab === "ports" ? portsTab() : ""}
        ${tab === "advanced" ? advancedTab() : ""}
      </div>
      <div class="props-foot">
        <button class="pbtn" data-cancel>Cancel</button>
        <button class="pbtn" data-apply>Apply</button>
        <button class="pbtn primary" data-ok>OK</button>
      </div>`;
  }

  function tabButton(id, label) {
    return `<button role="tab" aria-selected="${tab === id}" data-tab="${id}" class="${tab === id ? "sel" : ""}">${label}</button>`;
  }

  function generalTab(status) {
    return `
      <div class="prop-general">
        <div class="prop-preview">${ctx.ui.icon("printer")}</div>
        <div class="prop-fields">
          <label>Printer name<input data-field="name" value="${ctx.ui.esc(draft.name)}" spellcheck="false"></label>
          <label>Location<input data-field="location" value="${ctx.ui.esc(draft.location || "")}" spellcheck="false"></label>
          <div class="prop-line"><span>Model</span><b>${ctx.ui.esc(draft.model)}</b></div>
          <div class="prop-line"><span>Status</span><b class="${status.kind}">${ctx.ui.esc(status.label)}${status.kind === "error" ? ` – ${ctx.ui.esc(draft.error || "")}` : ""}</b></div>
          <div class="prop-line"><span>Driver</span><b>${ctx.ui.esc(draft.driver)}</b></div>
          <label>Comment<input data-field="comment" value="${ctx.ui.esc(draft.comment || "")}" placeholder="Add a note for other users"></label>
        </div>
      </div>
      <div class="prop-features">
        <h4>Features</h4>
        <ul>${draft.features.map((feature) => `<li>${ctx.ui.esc(feature)}</li>`).join("")}</ul>
      </div>
      <div class="prop-actions">
        <button class="pbtn" data-test ${status.kind === "offline" ? "disabled" : ""}>Print Test Page</button>
        <button class="pbtn" data-preferences>Printing Preferences…</button>
      </div>`;
  }

  function sharingTab() {
    return `
      <label class="prop-check"><input type="checkbox" data-field="shared" ${draft.shared ? "checked" : ""}> Share this printer</label>
      <div class="prop-share ${draft.shared ? "" : "off"}">
        <label>Share name<input data-field="shareName" value="${ctx.ui.esc(draft.shareName || "")}" ${draft.shared ? "" : "disabled"} spellcheck="false"></label>
        <p class="prop-hint">The share name is how other people on the network see this printer. It cannot contain spaces.</p>
      </div>
      <div class="prop-actions">
        <button class="pbtn" data-drivers>Additional Drivers…</button>
      </div>
      <div class="prop-info">${ctx.ui.icon("$info")} Sharing is disabled by the Printer lockdown policy on this network.</div>`;
  }

  function portsTab() {
    return `
      <p class="prop-hint">Print to the following port(s). Documents print to the first available port.</p>
      <div class="prop-ports">
        ${ports
          .map(
            (port) => `<label class="prop-radio"><input type="radio" name="printers-port" value="${ctx.ui.esc(port)}" ${draft.port === port ? "checked" : ""}>
              <span><b>${ctx.ui.esc(port)}</b><small>${ctx.ui.esc(PORT_DESCRIPTION[port] || (port.startsWith("WSD") ? "WSD port" : "Standard TCP/IP Port"))}</small></span></label>`,
          )
          .join("")}
      </div>
      <div class="prop-actions">
        <button class="pbtn" data-add-port>Add Port…</button>
        <button class="pbtn" data-configure-port>Configure Port…</button>
      </div>`;
  }

  function advancedTab() {
    return `
      <div class="prop-grid">
        <label>Availability
          <select data-field="availability">
            <option value="always" ${draft.availability === "always" ? "selected" : ""}>Always available</option>
            <option value="work" ${draft.availability === "work" ? "selected" : ""}>Available from 09:00 to 17:00</option>
          </select>
        </label>
        <label>Priority
          <select data-field="priority">
            <option value="1" ${draft.priority === "1" ? "selected" : ""}>1 – Highest</option>
            <option value="50" ${draft.priority === "50" ? "selected" : ""}>50 – Normal</option>
            <option value="99" ${draft.priority === "99" ? "selected" : ""}>99 – Lowest</option>
          </select>
        </label>
      </div>
      <fieldset class="prop-fieldset">
        <legend>Spool settings</legend>
        <label class="prop-radio"><input type="radio" name="printers-spool" value="last" ${draft.spool === "last" ? "checked" : ""}><span><b>Start printing after last page is spooled</b><small>The whole document is ready before it reaches the printer.</small></span></label>
        <label class="prop-radio"><input type="radio" name="printers-spool" value="now" ${draft.spool === "now" ? "checked" : ""}><span><b>Start printing immediately</b><small>The printer starts as soon as the first page is ready.</small></span></label>
      </fieldset>
      <label class="prop-check"><input type="checkbox" data-field="holdMismatched" ${draft.holdMismatched ? "checked" : ""}> Hold mismatched documents</label>
      <label class="prop-check"><input type="checkbox" data-field="printSpooledFirst" ${draft.printSpooledFirst ? "checked" : ""}> Print spooled documents first</label>
      <label class="prop-check"><input type="checkbox" data-field="keepPrinted" ${draft.keepPrinted ? "checked" : ""}> Keep printed documents</label>
      <label class="prop-check"><input type="checkbox" data-field="advancedFeatures" ${draft.advancedFeatures ? "checked" : ""}> Enable advanced printing features</label>
      <div class="prop-actions">
        <button class="pbtn" data-defaults>Printing Defaults…</button>
        <button class="pbtn" data-processor>Print Processor…</button>
        <button class="pbtn" data-separator>Separator Page…</button>
      </div>`;
  }

  function collect() {
    for (const input of host.querySelectorAll("[data-field]")) {
      const field = input.dataset.field;
      if (input.type === "checkbox") draft[field] = input.checked;
      else draft[field] = input.value;
    }
    const port = host.querySelector('input[name="printers-port"]:checked');
    if (port) draft.port = port.value;
    const spool = host.querySelector('input[name="printers-spool"]:checked');
    if (spool) draft.spool = spool.value;
  }

  function save(close) {
    collect();
    if (!draft.name.trim()) {
      ctx.ui.toast("Spool & Pray", "The printer name cannot be empty.", "printer");
      return;
    }
    commit(ctx, (state) => {
      const printer = state.printers.find((item) => item.id === source.id);
      if (!printer) return;
      Object.assign(printer, {
        name: draft.name.trim(),
        location: draft.location,
        comment: draft.comment,
        shared: draft.shared,
        shareName: draft.shareName,
        port: draft.port,
        priority: draft.priority,
        availability: draft.availability,
        spool: draft.spool,
        holdMismatched: draft.holdMismatched,
        printSpooledFirst: draft.printSpooledFirst,
        keepPrinted: draft.keepPrinted,
        advancedFeatures: draft.advancedFeatures,
      });
    });
    if (close) ctx.ui.closeDialog();
    else ctx.ui.toast("Spool & Pray", "Printer properties saved.", "printer");
  }

  function wire() {
    host.querySelectorAll("[data-tab]").forEach((button) =>
      button.addEventListener("click", () => {
        collect();
        tab = button.dataset.tab;
        draw();
      }),
    );
    host.querySelector("[data-cancel]")?.addEventListener("click", () => ctx.ui.closeDialog());
    host.querySelector("[data-ok]")?.addEventListener("click", () => save(true));
    host.querySelector("[data-apply]")?.addEventListener("click", () => save(false));
    host.querySelector("[data-field='shared']")?.addEventListener("change", () => {
      collect();
      draw();
    });
    host.querySelector("[data-test]")?.addEventListener("click", () => {
      collect();
      save(false);
      printTestPage(ctx, readState(ctx).printers.find((printer) => printer.id === source.id) || draft);
    });
    for (const node of host.querySelectorAll("[data-preferences], [data-drivers], [data-add-port], [data-configure-port], [data-defaults], [data-processor], [data-separator]")) {
      node.addEventListener("click", () =>
        ctx.ui.toast("Spool & Pray", "That dialog is managed by Halcyon Dynamics IT.", "printer"),
      );
    }
  }

  draw();
}

// ---------------------------------------------------------------------------
// Shared mock action
// ---------------------------------------------------------------------------

export function printTestPage(ctx, printer) {
  const spooler = spoolerState(ctx);
  if (!spooler.running) {
    ctx.ui.toast("Spool & Pray", "The Print Spooler service is stopped. The test page was not sent.", "printer");
    return null;
  }
  if (printer.offline) {
    ctx.ui.toast("Spool & Pray", "This printer is offline. Choose Use Printer Online, then try again.", "printer");
    return null;
  }

  const job = addJob(ctx, { printerId: printer.id, document: "Test Page", pages: 1, status: "printing" });
  ctx.ui.toast("Spool & Pray", `Test page sent to ${printer.name}.`, "printer");

  const finish = () => {
    const current = readState(ctx).jobs.find((record) => record.id === job.id);
    if (!current || current.status === "cancelled") return;
    if (current.status === "paused") {
      ctx.clock.schedule(1, finish);
      return;
    }
    commit(ctx, (draft) => {
      const record = draft.jobs.find((item) => item.id === job.id);
      if (record && record.status !== "cancelled") record.status = "complete";
    });
    ctx.ui.toast("Spool & Pray", "Test page completed successfully.", "printer");
  };
  ctx.clock.schedule(1.6, finish);
  return job;
}
