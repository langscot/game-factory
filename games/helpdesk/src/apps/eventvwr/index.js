// Event Viewer — the eventvwr.msc snap-in, rebuilt as a shell. The tree, list,
// Actions pane, filter dialog and Event Properties dialog are all here; the
// window owns no data. The rows are the authored log in content/eventlog.js
// plus the live world audit log, so an account reset during the shift really
// does turn up in Security.
//
// This is a mock console. Nothing reads the machine, the registry or a file.

import { LOGS, EVENTS } from "../../content/eventlog.js";

const LEVELS = [
  { id: "error", label: "Error" },
  { id: "warning", label: "Warning" },
  { id: "info", label: "Information" },
];

const LEVEL_ICONS = {
  error:
    '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="#e5484d"/><path d="M5.4 5.4l5.2 5.2M10.6 5.4l-5.2 5.2" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/></svg>',
  warning:
    '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5l6.9 12.3H1.1z" fill="#f0b429" stroke="#f0b429" stroke-linejoin="round"/><path d="M8 5.3v4.3" stroke="#2b1d00" stroke-width="1.6" stroke-linecap="round"/><circle cx="8" cy="11.7" r=".95" fill="#2b1d00"/></svg>',
  info:
    '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="#2f7ad6"/><path d="M8 7v4.2" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/><circle cx="8" cy="4.8" r="1" fill="#fff"/></svg>',
};

const FOLDER_ICON =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 4.2A1.2 1.2 0 0 1 2.7 3h3.1l1.2 1.4h6.3a1.2 1.2 0 0 1 1.2 1.2v6.2a1.2 1.2 0 0 1-1.2 1.2H2.7a1.2 1.2 0 0 1-1.2-1.2z" fill="#d9a441"/></svg>';

const LOG_ICON =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2.5" y="1.5" width="11" height="13" rx="1.3" fill="#e8eef7"/><rect x="2.5" y="1.5" width="11" height="2.4" rx="1.2" fill="#2f7ad6"/><g stroke="#8fa6c4" stroke-width="1" stroke-linecap="round"><path d="M4.6 6h6.8M4.6 8.2h6.8M4.6 10.4h4.6"/></g></svg>';

const COLUMNS = ["Level", "Date and Time", "Source", "Event ID", "Task Category"];

// Audit codes the world already emits get the same source and task text the
// real Windows provider would use, so live events do not look like a changelog.
const TASK_BY_CODE = {
  4624: "Logon",
  4625: "Logon",
  4634: "Logoff",
  4647: "Logoff",
  4672: "Special Logon",
  4720: "User Account Management",
  4722: "User Account Management",
  4724: "User Account Management",
  4725: "User Account Management",
  4728: "Security Group Management",
  4729: "Security Group Management",
  4740: "User Account Management",
  4767: "User Account Management",
  4670: "Authorization Policy Change",
  4657: "Registry",
  7036: "None",
  2004: "None",
  2005: "None",
  2001: "None",
  2002: "None",
  27: "None",
  22: "None",
  20001: "None",
  11707: "None",
  11724: "None",
};

const SOURCE_BY_CODE = {
  7036: "Service Control Manager",
  27: "Microsoft-Windows-Dhcp-Client",
  22: "Microsoft-Windows-Dhcp-Client",
  20001: "Microsoft-Windows-Kernel-PnP",
  11707: "MsiInstaller",
  11724: "MsiInstaller",
  2004: "Microsoft-Windows-Search",
  2005: "ITServiceDesk",
  2001: "ITServiceDesk",
  2002: "ITServiceDesk",
};

const ALL_LEVELS = LEVELS.map((level) => level.id);

export default {
  id: "eventvwr",
  title: "Event Viewer",
  icon: "eventviewer",
  size: [1040, 640],
  desktop: true,
  pinned: true,
  order: 6,
  position: [112, 42],

  mount(container, ctx) {
    ctx.ui.styles("eventvwr", css);

    const uiState = () => ctx.world.session.ui("eventvwr");
    const logById = (logId) => LOGS.find((log) => log.id === logId) || LOGS[0];
    const levelLabel = (level) => LEVELS.find((item) => item.id === level)?.label || "Information";

    const currentLogId = () => {
      const stored = uiState().log;
      return LOGS.some((log) => log.id === stored) ? stored : "application";
    };

    const defaultFilter = () => ({ levels: [...ALL_LEVELS], eventIds: "", query: "" });

    const filterFor = (logId) => {
      const stored = (uiState().filters || {})[logId];
      if (!stored) return defaultFilter();
      const levels = Array.isArray(stored.levels)
        ? stored.levels.filter((level) => ALL_LEVELS.includes(level))
        : [...ALL_LEVELS];
      return {
        levels: levels.length ? levels : [...ALL_LEVELS],
        eventIds: typeof stored.eventIds === "string" ? stored.eventIds : "",
        query: typeof stored.query === "string" ? stored.query : "",
      };
    };

    const clearedFor = (logId) => {
      const marker = (uiState().cleared || {})[logId];
      return marker && Number.isFinite(marker.seq) ? marker : null;
    };

    const datePrefix = () => String(ctx.world.meta().createdAt || "15/11/2026 08:45").split(" ")[0];

    const logForCategory = (category) => {
      const id = String(category || "System").toLowerCase();
      return LOGS.some((log) => log.id === id) ? id : "system";
    };

    const personLogon = (personId) => {
      const person = personId ? ctx.world.people.get(personId) : null;
      return person ? `HALCYON\\${person.logonName}` : "SYSTEM";
    };

    const liveRecord = (event) => {
      const subject = event.subjectId ? ctx.world.people.get(event.subjectId) : null;
      const machine = subject ? ctx.world.machines.byOwner(subject.id) : null;
      const machineHost = machine?.hostname || "DESKTOP-8H2K9L";
      const stamp = /^\d{2}:\d{2}$/.test(String(event.at || "")) ? `${event.at}:00` : event.at || "09:00:00";
      return {
        key: `live:${event.id}`,
        log: logForCategory(event.category),
        level: ALL_LEVELS.includes(event.level) ? event.level : "info",
        time: `${datePrefix()} ${stamp}`,
        source:
          SOURCE_BY_CODE[event.code] ||
          (String(event.category) === "Security" ? "Microsoft-Windows-Security-Auditing" : "ITServiceDesk"),
        eventId: event.code,
        taskCategory: TASK_BY_CODE[event.code] || (String(event.category) === "Security" ? "User Account Management" : "None"),
        keywords: event.level === "warning" ? "Audit Failure" : "Classic",
        opcode: "Info",
        user: personLogon(event.actorId),
        computer: machineHost,
        general: event.message || event.type,
        data: {
          ...(event.data || {}),
          EventType: event.type,
          SubjectUserName: subject ? subject.logonName : "SYSTEM",
          SubjectDomainName: "HALCYON",
          Day: String(event.day),
        },
      };
    };

    const allRecords = (logId) => {
      const marker = clearedFor(logId);
      const rows = [];
      if (!marker) {
        for (const event of EVENTS) {
          if (event.log === logId) rows.push({ ...event, key: `authored:${event.id}` });
        }
      }
      for (const event of ctx.world.audit.all()) {
        if (logForCategory(event.category) !== logId) continue;
        if (marker && event.seq <= marker.seq) continue;
        rows.push(liveRecord(event));
      }
      rows.sort((a, b) => b.time.localeCompare(a.time));
      const total = rows.length;
      rows.forEach((row, index) => {
        row.recordId = total - index;
      });
      return rows;
    };

    const parseEventIds = (raw) =>
      String(raw || "")
        .split(/[,\s]+/)
        .map((part) => Number(part))
        .filter((value) => Number.isInteger(value) && value > 0);

    const searchText = (row) =>
      [row.source, row.taskCategory, row.general, row.computer, row.user, row.eventId, levelLabel(row.level)]
        .join(" ")
        .toLowerCase();

    const visibleRows = () => {
      const logId = currentLogId();
      const filter = filterFor(logId);
      const ids = parseEventIds(filter.eventIds);
      const query = filter.query.trim().toLowerCase();
      return allRecords(logId).filter((row) => {
        if (filter.levels.length && !filter.levels.includes(row.level)) return false;
        if (ids.length && !ids.includes(Number(row.eventId))) return false;
        if (query && !searchText(row).includes(query)) return false;
        return true;
      });
    };

    const filterParts = (filter) => {
      const parts = [];
      if (filter.levels.length !== ALL_LEVELS.length) {
        parts.push(`Level: ${LEVELS.filter((level) => filter.levels.includes(level.id)).map((level) => level.label).join(", ")}`);
      }
      if (filter.eventIds.trim()) parts.push(`Event ID: ${filter.eventIds.trim()}`);
      if (filter.query.trim()) parts.push(`Text: "${filter.query.trim()}"`);
      return parts;
    };

    const isFiltered = (filter) => filterParts(filter).length > 0;

    const selectedRecord = (rows) =>
      rows.find((row) => row.key === uiState().selectedId) || rows[0] || null;

    // -----------------------------------------------------------------------
    // shell
    // -----------------------------------------------------------------------

    container.innerHTML = "";
    const root = ctx.ui.el(`
      <div class="ev">
        <div class="ev-menu" role="menubar">
          <button type="button" role="menuitem" data-menu="file">File</button>
          <button type="button" role="menuitem" data-menu="action">Action</button>
          <button type="button" role="menuitem" data-menu="view">View</button>
          <button type="button" role="menuitem" data-menu="help">Help</button>
        </div>
        <div class="ev-main">
          <div class="ev-tree" role="tree" aria-label="Console tree"></div>
          <div class="ev-pane">
            <div class="ev-listhead"></div>
            <div class="ev-list" role="grid" aria-label="Events">
              <div class="ev-cols" role="row">${COLUMNS.map((column) => `<span role="columnheader">${column}</span>`).join("")}</div>
              <div class="ev-rows" role="rowgroup"></div>
            </div>
            <div class="ev-status"></div>
          </div>
          <aside class="ev-actions" aria-label="Actions"></aside>
        </div>
        <div class="ev-overlay" hidden></div>
      </div>`);
    container.append(root);

    const treeHost = root.querySelector(".ev-tree");
    const listHead = root.querySelector(".ev-listhead");
    const rowsHost = root.querySelector(".ev-rows");
    const statusHost = root.querySelector(".ev-status");
    const actionsHost = root.querySelector(".ev-actions");
    const overlay = root.querySelector(".ev-overlay");

    const treeOpen = { custom: false, windows: true, apps: false };
    let overlayState = null;
    let restoreFocus = null;

    for (const button of root.querySelectorAll("[data-menu]")) {
      button.addEventListener("click", (event) => openAppMenu(button.dataset.menu, event.currentTarget));
    }

    root.addEventListener("keydown", (event) => {
      if (event.key !== "F5" || event.defaultPrevented || !overlay.hidden) return;
      event.preventDefault();
      refreshLog();
    });

    // -----------------------------------------------------------------------
    // painting
    // -----------------------------------------------------------------------

    function paint() {
      const logId = currentLogId();
      const log = logById(logId);
      const filter = filterFor(logId);
      const rows = visibleRows();
      const selected = selectedRecord(rows);
      const filtered = isFiltered(filter);

      paintTree(logId);
      paintList(log, rows, selected, filtered);
      paintActions(log, selected);
      paintStatus(log, rows.length, filter, filtered);
    }

    function paintTree(logId) {
      const marker = clearedFor(logId);
      const hadFocus = treeHost.contains(document.activeElement);
      treeHost.innerHTML = `
        <div class="ev-trow root">${ctx.ui.icon("$monitor")}<span class="ev-tlabel">Event Viewer (Local)</span></div>
        <button type="button" class="ev-trow group" role="treeitem" aria-expanded="${treeOpen.custom}" data-tree="custom">
          <span class="tw">${treeOpen.custom ? "▾" : "▸"}</span>${FOLDER_ICON}<span class="ev-tlabel">Custom Views</span>
        </button>
        ${treeOpen.custom ? '<div class="ev-tnone">No custom views saved.</div>' : ""}
        <button type="button" class="ev-trow group" role="treeitem" aria-expanded="${treeOpen.windows}" data-tree="windows">
          <span class="tw">${treeOpen.windows ? "▾" : "▸"}</span>${FOLDER_ICON}<span class="ev-tlabel">Windows Logs</span>
        </button>
        ${
          treeOpen.windows
            ? LOGS.map(
                (log) => `
              <button type="button" class="ev-trow leaf${log.id === logId ? " sel" : ""}" role="treeitem"
                aria-selected="${log.id === logId}" data-log="${log.id}">
                <span class="tw"></span>${LOG_ICON}<span class="ev-tlabel">${log.name}</span>
                ${marker && log.id === logId ? '<span class="ev-cleared-tag">cleared</span>' : ""}
              </button>`,
              ).join("")
            : ""
        }
        <button type="button" class="ev-trow group" role="treeitem" aria-expanded="${treeOpen.apps}" data-tree="apps">
          <span class="tw">${treeOpen.apps ? "▾" : "▸"}</span>${FOLDER_ICON}<span class="ev-tlabel">Applications and Services Logs</span>
        </button>
        ${treeOpen.apps ? '<div class="ev-tnone">No published logs in this mock console.</div>' : ""}`;

      for (const node of treeHost.querySelectorAll("[data-tree]")) {
        node.addEventListener("click", () => {
          const key = node.dataset.tree;
          treeOpen[key] = !treeOpen[key];
          paintTree(currentLogId());
          treeHost.querySelector(`[data-tree="${key}"]`)?.focus();
        });
      }
      for (const node of treeHost.querySelectorAll("[data-log]")) {
        node.addEventListener("click", () => selectLog(node.dataset.log));
      }
      if (hadFocus) treeHost.querySelector(`[data-log="${logId}"]`)?.focus();
    }

    function paintList(log, rows, selected, filtered) {
      const marker = clearedFor(log.id);
      const hadRowFocus = Boolean(document.activeElement?.closest?.(".ev-row"));
      listHead.innerHTML = `
        <span class="ev-title">${ctx.ui.esc(log.name)}</span>
        ${filtered ? '<span class="ev-filterchip">Filtered</span>' : ""}
        <span class="ev-count">Number of events: ${rows.length}</span>`;

      rowsHost.innerHTML = "";
      if (!rows.length) {
        const empty = ctx.ui.el(`<div class="ev-empty">
          <div>${
            marker ? "The log is empty." : filtered ? "No events match the current filter." : "There are no events in this log."
          }</div>
          ${filtered ? '<button type="button" class="ev-link" data-clear-filter>Clear filter</button>' : ""}
        </div>`);
        empty.querySelector("[data-clear-filter]")?.addEventListener("click", clearFilter);
        rowsHost.append(empty);
        return;
      }

      for (const row of rows) {
        const isSelected = selected?.key === row.key;
        const button = ctx.ui.el(`<button type="button" class="ev-row${isSelected ? " sel" : ""}" role="row"
          aria-selected="${isSelected}" data-key="${ctx.ui.esc(row.key)}">
          <span class="ev-lvl">${LEVEL_ICONS[row.level] || LEVEL_ICONS.info}<span>${levelLabel(row.level)}</span></span>
          <span class="ev-time">${ctx.ui.esc(row.time)}</span>
          <span class="ev-src" title="${ctx.ui.esc(row.source)}">${ctx.ui.esc(row.source)}</span>
          <span class="ev-id">${ctx.ui.esc(row.eventId)}</span>
          <span class="ev-task" title="${ctx.ui.esc(row.taskCategory)}">${ctx.ui.esc(row.taskCategory)}</span>
        </button>`);
        button.addEventListener("click", () => ctx.actions.setUi("eventvwr", { selectedId: row.key }));
        button.addEventListener("dblclick", () => openProperties(row));
        button.addEventListener("keydown", (event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          openProperties(row);
        });
        rowsHost.append(button);
      }

      if (hadRowFocus && selected) {
        [...rowsHost.querySelectorAll(".ev-row")].find((node) => node.dataset.key === selected.key)?.focus();
      }
    }

    function paintActions(log, selected) {
      const focusedAct = document.activeElement?.closest?.("[data-act]")?.dataset.act;
      actionsHost.innerHTML = `
        <div class="ev-acthead">Actions</div>
        <div class="ev-actgroup">${ctx.ui.esc(log.name)}</div>
        <button type="button" data-act="filter">Filter Current Log...</button>
        <button type="button" data-act="clear">Clear Log...</button>
        <button type="button" data-act="refresh">Refresh</button>
        <div class="ev-actgroup">Event</div>
        <button type="button" data-act="props"${selected ? "" : " disabled"}>Event Properties...</button>
        <button type="button" data-act="copy"${selected ? "" : " disabled"}>Copy Details</button>
        <div class="ev-actnote">Mock console. Nothing here read the real machine.</div>`;

      actionsHost.querySelector('[data-act="filter"]').addEventListener("click", openFilter);
      actionsHost.querySelector('[data-act="clear"]').addEventListener("click", clearLog);
      actionsHost.querySelector('[data-act="refresh"]').addEventListener("click", refreshLog);
      actionsHost.querySelector('[data-act="props"]').addEventListener("click", openSelectedProperties);
      actionsHost.querySelector('[data-act="copy"]').addEventListener("click", copySelectedDetails);
      if (focusedAct) actionsHost.querySelector(`[data-act="${focusedAct}"]:not(:disabled)`)?.focus();
    }

    function paintStatus(log, count, filter, filtered) {
      const summary = filterParts(filter).join(" · ");
      const refreshedAt = uiState().refreshedAt;
      statusHost.innerHTML = `
        <span>${ctx.ui.esc(log.name)}</span>
        <span class="sep">|</span>
        <span>${count} event${count === 1 ? "" : "s"}</span>
        ${
          filtered
            ? `<span class="sep">|</span><span class="ev-filterstate" title="${ctx.ui.esc(summary)}">${ctx.ui.esc(summary)}</span>
               <button type="button" class="ev-link" data-clear-filter>Clear filter</button>`
            : ""
        }
        ${refreshedAt ? `<span class="ev-refreshed">Refreshed ${ctx.ui.esc(refreshedAt)}</span>` : ""}`;
      statusHost.querySelector("[data-clear-filter]")?.addEventListener("click", clearFilter);
    }

    // -----------------------------------------------------------------------
    // actions
    // -----------------------------------------------------------------------

    function selectLog(logId) {
      if (logId === currentLogId()) return;
      ctx.actions.setUi("eventvwr", { log: logId, selectedId: null });
    }

    function clearFilter() {
      const filters = { ...(uiState().filters || {}) };
      delete filters[currentLogId()];
      ctx.actions.setUi("eventvwr", { filters, selectedId: null });
    }

    function refreshLog() {
      const log = logById(currentLogId());
      const count = visibleRows().length;
      ctx.actions.setUi("eventvwr", { refreshedAt: ctx.clock.timeText() });
      ctx.ui.toast("Event Viewer", `${log.name} log refreshed. ${count} event${count === 1 ? "" : "s"}.`, "eventviewer");
    }

    async function clearLog() {
      const log = logById(currentLogId());
      const yes = await ctx.ui.confirm(
        "Clear Log",
        `Clear the ${log.name} log?\n\nThe seeded and recorded events in this mock console will go. Events raised after this point will still arrive.`,
        { ok: "Clear", cancel: "Cancel" },
      );
      if (!yes) return;
      const seq = ctx.world.audit.all().reduce((max, event) => Math.max(max, Number(event.seq) || 0), 0);
      const cleared = { ...(uiState().cleared || {}), [log.id]: { seq, at: ctx.clock.timeText() } };
      closeOverlay();
      ctx.actions.setUi("eventvwr", { cleared, selectedId: null });
      ctx.ui.toast("Event Viewer", `The ${log.name} log was cleared.`, "eventviewer");
    }

    function openSelectedProperties() {
      const record = selectedRecord(visibleRows());
      if (record) openProperties(record);
    }

    function copySelectedDetails() {
      const record = selectedRecord(visibleRows());
      if (!record) return;
      copyText(detailsText(record)).then((ok) => toastCopy(ok, false));
    }

    // -----------------------------------------------------------------------
    // menus
    // -----------------------------------------------------------------------

    function openAppMenu(kind, button) {
      const rect = button.getBoundingClientRect();
      const x = rect.left;
      const y = rect.bottom + 2;
      const hasSelection = Boolean(selectedRecord(visibleRows()));

      if (kind === "file") {
        ctx.ui.menu(x, y, [
          { label: "Save All Events As...", disabled: true },
          { separator: true },
          { label: "Exit", onClick: () => ctx.window.close() },
        ]);
        return;
      }

      if (kind === "action") {
        ctx.ui.menu(x, y, [
          { label: "Refresh", icon: "$refresh", shortcut: "F5", onClick: refreshLog },
          { label: "Filter Current Log...", onClick: openFilter },
          { separator: true },
          { label: "Clear Log...", icon: "$trash", onClick: clearLog },
          { separator: true },
          { label: "Event Properties...", disabled: !hasSelection, onClick: openSelectedProperties },
          { label: "Copy Details", icon: "$copy", disabled: !hasSelection, onClick: copySelectedDetails },
        ]);
        return;
      }

      if (kind === "view") {
        ctx.ui.menu(x, y, [
          { label: "Add/Remove Columns...", disabled: true },
          { separator: true },
          { label: "Filter Current Log...", onClick: openFilter },
          { label: "Refresh", icon: "$refresh", shortcut: "F5", onClick: refreshLog },
        ]);
        return;
      }

      ctx.ui.menu(x, y, [
        {
          label: "About Event Viewer",
          onClick: () =>
            ctx.ui.alert(
              "Event Viewer",
              "Microsoft Management Console — eventvwr.msc\n\nA mock Event Viewer shell for the Halcyon helpdesk desktop. The events are seeded content and the live world audit trail; no local logs are read.",
            ),
        },
      ]);
    }

    // -----------------------------------------------------------------------
    // overlay
    // -----------------------------------------------------------------------

    function showOverlay(html, focusSelector) {
      if (!restoreFocus) restoreFocus = document.activeElement;
      overlayState = overlayState || {};
      overlay.hidden = false;
      overlay.innerHTML = `<div class="ev-scrim"></div>${html}`;
      const target = focusSelector ? overlay.querySelector(focusSelector) : null;
      (target || overlay.querySelector("button, input, select")).focus();
    }

    function closeOverlay() {
      overlay.hidden = true;
      overlay.innerHTML = "";
      overlayState = null;
      const target = restoreFocus;
      restoreFocus = null;
      if (target && target.isConnected) target.focus();
    }

    overlay.addEventListener("keydown", (event) => {
      if (overlay.hidden) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeOverlay();
        return;
      }
      if (event.key !== "Tab") return;
      const focusables = [...overlay.querySelectorAll("button:not(:disabled), input:not(:disabled), select")].filter(
        (node) => node.offsetParent !== null,
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    function openFilter() {
      const logId = currentLogId();
      const filter = filterFor(logId);
      const counts = { error: 0, warning: 0, info: 0 };
      for (const row of allRecords(logId)) counts[row.level] = (counts[row.level] || 0) + 1;

      overlayState = { kind: "filter", logId };
      showOverlay(
        `<div class="ev-dialog ev-filter" role="dialog" aria-modal="true" aria-labelledby="ev-filter-title">
          <div class="ev-dlgtitle" id="ev-filter-title">Filter Current Log</div>
          <form class="ev-form">
            <div class="ev-dlgbody">
              <fieldset>
                <legend>Event level:</legend>
                <div class="ev-levels">
                  ${LEVELS.map(
                    (level) => `<label><input type="checkbox" name="level" value="${level.id}"${
                      filter.levels.includes(level.id) ? " checked" : ""
                    }>${LEVEL_ICONS[level.id]}<span>${level.label} (${counts[level.id] || 0})</span></label>`,
                  ).join("")}
                </div>
              </fieldset>
              <div class="ev-field">
                <label for="ev-event-ids">Event ID:</label>
                <input id="ev-event-ids" data-event-ids value="${ctx.ui.esc(filter.eventIds)}" placeholder="e.g. 4625, 4724" spellcheck="false">
              </div>
              <div class="ev-field">
                <label for="ev-query">Contains text:</label>
                <input id="ev-query" data-query value="${ctx.ui.esc(filter.query)}" placeholder="source, description, computer..." spellcheck="false">
              </div>
              <div class="ev-hint">Separate event IDs with commas. Leave a field blank to ignore it.</div>
              <div class="ev-err" data-error hidden></div>
            </div>
            <div class="ev-dlgfoot">
              <button type="button" class="btn" data-reset>Clear</button>
              <span class="spacer"></span>
              <button type="button" class="btn" data-cancel>Cancel</button>
              <button type="submit" class="btn primary">OK</button>
            </div>
          </form>
        </div>`,
        "[data-event-ids]",
      );

      const form = overlay.querySelector("form");
      const error = form.querySelector("[data-error]");
      form.querySelector("[data-cancel]").addEventListener("click", closeOverlay);
      form.querySelector("[data-reset]").addEventListener("click", () => {
        for (const box of form.querySelectorAll('input[name="level"]')) box.checked = true;
        form.querySelector("[data-event-ids]").value = "";
        form.querySelector("[data-query]").value = "";
        error.hidden = true;
        form.querySelector("[data-event-ids]").focus();
      });
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const levels = [...form.querySelectorAll('input[name="level"]:checked')].map((box) => box.value);
        const eventIds = form.querySelector("[data-event-ids]").value.trim();
        const query = form.querySelector("[data-query]").value.trim();
        const showError = (message) => {
          error.textContent = message;
          error.hidden = false;
        };
        if (!levels.length) return showError("Pick at least one event level.");
        if (eventIds && !/^[0-9,\s]+$/.test(eventIds)) return showError("Event ID must be a number or a comma-separated list.");
        const ids = parseEventIds(eventIds);
        if (eventIds && !ids.length) return showError("Event ID must be a number or a comma-separated list.");
        const filters = {
          ...(uiState().filters || {}),
          [logId]: { levels, eventIds: ids.join(", "), query },
        };
        closeOverlay();
        ctx.actions.setUi("eventvwr", { filters, selectedId: null });
      });
    }

    function openProperties(record) {
      overlayState = { kind: "props", record, tab: "general" };
      paintProperties();
    }

    function paintProperties(focusTab = false) {
      const state = overlayState;
      if (!state || state.kind !== "props") return;
      const record = state.record;
      const tab = state.tab;
      const log = logById(record.log);
      const fields = [
        ["Log Name", log.name],
        ["Source", record.source],
        ["Event ID", String(record.eventId)],
        ["Task Category", record.taskCategory],
        ["Level", levelLabel(record.level)],
        ["Keywords", record.keywords || "Classic"],
        ["User", record.user || "N/A"],
        ["Computer", record.computer],
        ["OpCode", record.opcode || "Info"],
        ["Logged", record.time],
      ];

      showOverlay(
        `<div class="ev-dialog ev-props" role="dialog" aria-modal="true" aria-labelledby="ev-props-title">
          <div class="ev-dlgtitle" id="ev-props-title">Event Properties</div>
          <div class="ev-tabs" role="tablist">
            <button type="button" class="ev-tab${tab === "general" ? " sel" : ""}" role="tab"
              aria-selected="${tab === "general"}" data-tab="general">General</button>
            <button type="button" class="ev-tab${tab === "details" ? " sel" : ""}" role="tab"
              aria-selected="${tab === "details"}" data-tab="details">Details</button>
          </div>
          <div class="ev-prophead">
            ${LEVEL_ICONS[record.level] || LEVEL_ICONS.info}
            <b>${ctx.ui.esc(record.source)}</b>
            <span>${ctx.ui.esc(record.eventId)} · ${ctx.ui.esc(levelLabel(record.level))}</span>
          </div>
          <div class="ev-dlgbody ev-propsbody">
            ${
              tab === "general"
                ? `<div class="ev-fields">
                    ${fields
                      .map(
                        ([label, value]) =>
                          `<div><i>${ctx.ui.esc(label)}:</i><span title="${ctx.ui.esc(value)}">${ctx.ui.esc(value)}</span></div>`,
                      )
                      .join("")}
                  </div>
                  <div class="ev-desc">${ctx.ui.esc(record.general)}</div>`
                : `<div class="ev-detbar"><span>View: XML View</span><span class="muted">Read-only mock XML</span></div>
                   <pre class="ev-xml">${ctx.ui.esc(eventXml(record))}</pre>`
            }
          </div>
          <div class="ev-dlgfoot">
            <span class="ev-footnote">Event ${ctx.ui.esc(record.eventId)} · ${ctx.ui.esc(record.time)}</span>
            <span class="spacer"></span>
            <button type="button" class="btn" data-copy>${tab === "details" ? "Copy XML" : "Copy Details"}</button>
            <button type="button" class="btn primary" data-close>Close</button>
          </div>
        </div>`,
        focusTab ? `[data-tab="${tab}"]` : "[data-copy]",
      );
      for (const button of overlay.querySelectorAll("[data-tab]")) {
        button.addEventListener("click", () => {
          if (!overlayState || overlayState.kind !== "props") return;
          overlayState.tab = button.dataset.tab;
          paintProperties(true);
        });
      }
      overlay.querySelector("[data-close]").addEventListener("click", closeOverlay);
      overlay.querySelector("[data-copy]").addEventListener("click", () => {
        const xml = tab === "details";
        copyText(xml ? eventXml(record) : detailsText(record)).then((ok) => toastCopy(ok, xml));
      });
    }

    // -----------------------------------------------------------------------
    // text
    // -----------------------------------------------------------------------

    function detailsText(record) {
      return [
        `Log Name:      ${logById(record.log).name}`,
        `Source:        ${record.source}`,
        `Date:          ${record.time}`,
        `Event ID:      ${record.eventId}`,
        `Task Category: ${record.taskCategory}`,
        `Level:         ${levelLabel(record.level)}`,
        `Keywords:      ${record.keywords || "Classic"}`,
        `User:          ${record.user || "N/A"}`,
        `Computer:      ${record.computer}`,
        "",
        "Description:",
        record.general,
      ].join("\n");
    }

    function eventXml(record) {
      const levelCode = { error: 2, warning: 3, info: 4 }[record.level] || 4;
      const keywords = record.keywords?.startsWith("Audit") ? "0x8020000000000000" : "0x8080000000000000";
      const data = Object.entries(record.data || {})
        .map(([key, value]) => `    <Data Name="${ctx.ui.esc(key)}">${ctx.ui.esc(value)}</Data>`)
        .join("\n");
      return `<Event xmlns="http://schemas.microsoft.com/win/2004/08/events/event">
  <System>
    <Provider Name="${ctx.ui.esc(record.source)}" Guid="{00000000-0000-0000-0000-000000000000}" />
    <EventID Qualifiers="0">${ctx.ui.esc(record.eventId)}</EventID>
    <Version>0</Version>
    <Level>${levelCode}</Level>
    <Task>0</Task>
    <Opcode>0</Opcode>
    <Keywords>${keywords}</Keywords>
    <TimeCreated SystemTime="${ctx.ui.esc(isoTime(record.time))}" />
    <EventRecordID>${ctx.ui.esc(record.recordId ?? 0)}</EventRecordID>
    <Correlation />
    <Execution ProcessID="0x2f60" ThreadID="0x1a4c" />
    <Channel>${ctx.ui.esc(logById(record.log).name)}</Channel>
    <Computer>${ctx.ui.esc(record.computer)}</Computer>
    <Security UserID="S-1-5-18" />
  </System>
  <EventData>
${data}
  </EventData>
</Event>`;
    }

    function isoTime(time) {
      const match = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/.exec(String(time));
      if (!match) return String(time);
      return `${match[3]}-${match[2]}-${match[1]}T${match[4]}:${match[5]}:${match[6]}.0000000Z`;
    }

    async function copyText(text) {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          return true;
        }
      } catch {
        // Fall through to the old selection trick; clipboard permissions differ.
      }
      try {
        const area = document.createElement("textarea");
        area.value = text;
        area.style.cssText = "position:fixed;left:-9999px;top:0";
        document.body.append(area);
        area.select();
        const ok = document.execCommand("copy");
        area.remove();
        return ok;
      } catch {
        return false;
      }
    }

    function toastCopy(ok, xml) {
      ctx.ui.toast(
        "Event Viewer",
        ok ? (xml ? "Event XML copied." : "Event details copied.") : "The clipboard is not available in this browser.",
        "eventviewer",
      );
    }

    // -----------------------------------------------------------------------
    // wiring
    // -----------------------------------------------------------------------

    ctx.events.on("*", () => paint());
    paint();
  },

  unmount(container) {
    container.innerHTML = "";
  },
};

const css = `
.app-eventvwr .ev { position: relative; display: flex; flex-direction: column; height: 100%; min-height: 0; background: #202020; color: var(--text-2); font-size: 12px; }
.app-eventvwr .ev-menu { flex: none; display: flex; height: 26px; padding: 0 5px; background: #2b2b2b; border-bottom: 1px solid var(--stroke); }
.app-eventvwr .ev-menu button { padding: 0 9px; height: 100%; font-size: 12px; color: var(--text-2); }
.app-eventvwr .ev-menu button:hover { background: var(--hover); }
.app-eventvwr .ev-main { flex: 1; min-height: 0; display: flex; }
.app-eventvwr .ev-tree { flex: none; width: 232px; overflow: auto; padding: 5px 0; background: #252525; border-right: 1px solid var(--stroke); }
.app-eventvwr .ev-pane { flex: 1; min-width: 0; display: flex; flex-direction: column; background: #212121; }
.app-eventvwr .ev-listhead { flex: none; display: flex; align-items: center; gap: 8px; padding: 7px 10px; background: #262626; border-bottom: 1px solid var(--stroke); }
.app-eventvwr .ev-title { font-size: 12.5px; font-weight: 600; color: #fff; }
.app-eventvwr .ev-filterchip { font-size: 9.5px; letter-spacing: 0.06em; text-transform: uppercase; color: #bfe6ff; border: 1px solid rgba(76, 194, 255, 0.45); border-radius: 8px; padding: 0 6px; }
.app-eventvwr .ev-count { margin-left: auto; font-size: 11px; color: var(--text-3); }
.app-eventvwr .ev-list { flex: 1; min-height: 0; overflow: auto; }
.app-eventvwr .ev-cols, .app-eventvwr .ev-row { display: grid; grid-template-columns: 100px 140px minmax(130px, 1fr) 68px minmax(108px, 0.9fr); gap: 8px; align-items: center; min-width: 600px; }
.app-eventvwr .ev-cols { position: sticky; top: 0; z-index: 2; padding: 6px 10px; background: #292929; border-bottom: 1px solid var(--stroke-2); font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-3); }
.app-eventvwr .ev-row { width: 100%; height: 24px; padding: 0 10px; text-align: left; border-bottom: 1px solid rgba(255, 255, 255, 0.035); font-size: 11.5px; color: var(--text-2); }
.app-eventvwr .ev-row:hover { background: var(--hover); }
.app-eventvwr .ev-row.sel { background: #0d4f8b; color: #fff; }
.app-eventvwr .ev-row:focus-visible { outline: 1px solid var(--accent); outline-offset: -1px; }
.app-eventvwr .ev-lvl { display: flex; align-items: center; gap: 6px; min-width: 0; }
.app-eventvwr .ev-lvl svg { width: 14px; height: 14px; flex: none; }
.app-eventvwr .ev-time, .app-eventvwr .ev-id { font-variant-numeric: tabular-nums; }
.app-eventvwr .ev-src, .app-eventvwr .ev-task { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.app-eventvwr .ev-empty { padding: 38px 20px; text-align: center; font-size: 12.5px; color: var(--text-3); }
.app-eventvwr .ev-status { flex: none; display: flex; align-items: center; gap: 8px; min-height: 23px; padding: 3px 9px; background: #252525; border-top: 1px solid var(--stroke); font-size: 11px; color: var(--text-3); }
.app-eventvwr .ev-status .sep { opacity: 0.35; }
.app-eventvwr .ev-status .ev-filterstate { max-width: 330px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; color: #bfe6ff; }
.app-eventvwr .ev-status .ev-refreshed { margin-left: auto; white-space: nowrap; }
.app-eventvwr .ev-link { font-size: 11px; color: var(--accent); text-decoration: underline; padding: 0 2px; }
.app-eventvwr .ev-link:hover { color: #9added; }

.app-eventvwr .ev-trow { display: flex; align-items: center; gap: 6px; width: 100%; height: 22px; padding: 0 8px; text-align: left; font-size: 11.5px; color: var(--text-2); white-space: nowrap; }
.app-eventvwr .ev-trow.root { padding-left: 8px; color: #fff; font-weight: 600; cursor: default; }
.app-eventvwr .ev-trow.root svg { color: var(--accent); }
.app-eventvwr .ev-trow.group { padding-left: 18px; }
.app-eventvwr .ev-trow.leaf { padding-left: 36px; }
.app-eventvwr .ev-trow:hover { background: var(--hover); }
.app-eventvwr .ev-trow.leaf.sel { background: #0d4f8b; color: #fff; }
.app-eventvwr .ev-trow:focus-visible { outline: 1px solid var(--accent); outline-offset: -1px; }
.app-eventvwr .ev-trow .tw { width: 9px; flex: none; font-size: 9px; color: var(--text-3); }
.app-eventvwr .ev-trow svg { width: 13px; height: 13px; flex: none; }
.app-eventvwr .ev-trow .ev-tlabel { min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.app-eventvwr .ev-tnone { padding: 2px 8px 4px 44px; font-size: 10.5px; font-style: italic; color: var(--text-3); }
.app-eventvwr .ev-cleared-tag { margin-left: auto; font-size: 9px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--text-3); border: 1px solid var(--stroke-2); border-radius: 7px; padding: 0 5px; }

.app-eventvwr .ev-actions { flex: none; width: 196px; overflow: auto; padding-bottom: 12px; background: #252525; border-left: 1px solid var(--stroke); }
.app-eventvwr .ev-acthead { padding: 7px 11px 6px; background: #2b2b2b; border-bottom: 1px solid var(--stroke); font-size: 12px; font-weight: 600; color: #fff; }
.app-eventvwr .ev-actgroup { padding: 10px 11px 5px; font-size: 10.5px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-3); border-bottom: 1px solid rgba(255, 255, 255, 0.045); margin-bottom: 3px; }
.app-eventvwr .ev-actions button { display: block; width: 100%; padding: 3px 12px 3px 22px; text-align: left; font-size: 11.5px; color: #7fc4ff; }
.app-eventvwr .ev-actions button:hover:not(:disabled) { background: var(--hover); text-decoration: underline; }
.app-eventvwr .ev-actions button:disabled { color: rgba(255, 255, 255, 0.28); cursor: default; }
.app-eventvwr .ev-actnote { margin: 14px 12px 0; padding-top: 10px; border-top: 1px solid var(--stroke); font-size: 10px; line-height: 1.45; color: var(--text-3); }

.app-eventvwr .ev-overlay { position: absolute; inset: 0; z-index: 30; display: grid; place-items: center; }
.app-eventvwr .ev-scrim { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.46); }
.app-eventvwr .ev-dialog { position: relative; display: flex; flex-direction: column; width: 480px; max-width: calc(100% - 28px); max-height: calc(100% - 28px); background: #2b2b2b; border: 1px solid var(--stroke-2); border-radius: 8px; box-shadow: 0 34px 80px -24px #000; overflow: hidden; }
.app-eventvwr .ev-dialog.ev-props { width: 620px; }
.app-eventvwr .ev-dlgtitle { flex: none; padding: 11px 14px 9px; background: #323232; border-bottom: 1px solid var(--stroke); font-size: 13px; font-weight: 600; color: #fff; }
.app-eventvwr .ev-dlgbody { padding: 13px 14px; overflow: auto; }
.app-eventvwr .ev-dlgfoot { flex: none; display: flex; align-items: center; gap: 8px; padding: 10px 14px; background: #2f2f2f; border-top: 1px solid var(--stroke); }
.app-eventvwr .ev-dlgfoot .spacer { margin-left: auto; }
.app-eventvwr .ev-dlgfoot .btn { min-width: 76px; padding: 5px 12px; }
.app-eventvwr .ev-footnote { font-size: 10.5px; color: var(--text-3); }
.app-eventvwr .ev-form { display: flex; flex-direction: column; min-height: 0; }
.app-eventvwr .ev-form fieldset { margin: 0 0 12px; padding: 7px 11px 10px; border: 1px solid var(--stroke-2); border-radius: 4px; }
.app-eventvwr .ev-form legend { padding: 0 5px; font-size: 11.5px; color: var(--text-2); }
.app-eventvwr .ev-levels { display: flex; flex-wrap: wrap; gap: 6px 18px; }
.app-eventvwr .ev-levels label { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-2); }
.app-eventvwr .ev-levels svg { width: 13px; height: 13px; }
.app-eventvwr input[type="checkbox"] { accent-color: var(--accent-strong); }
.app-eventvwr .ev-field { display: grid; grid-template-columns: 96px 1fr; align-items: center; gap: 8px; margin-bottom: 9px; font-size: 12px; }
.app-eventvwr .ev-field input { width: 100%; padding: 5px 8px; background: rgba(0, 0, 0, 0.28); border: 1px solid var(--stroke-2); border-radius: 4px; outline: 0; font-size: 12px; color: var(--text); }
.app-eventvwr .ev-field input:focus { border-color: var(--accent); }
.app-eventvwr .ev-hint { margin-left: 104px; font-size: 10.5px; color: var(--text-3); }
.app-eventvwr .ev-err { margin-top: 10px; padding: 7px 9px; background: rgba(248, 113, 113, 0.1); border: 1px solid rgba(248, 113, 113, 0.4); border-radius: 4px; font-size: 11.5px; color: #fbcaca; }
.app-eventvwr .ev-err[hidden] { display: none; }

.app-eventvwr .ev-tabs { flex: none; display: flex; gap: 2px; padding: 8px 10px 0; background: #2f2f2f; border-bottom: 1px solid var(--stroke); }
.app-eventvwr .ev-tab { padding: 6px 14px; border: 1px solid transparent; border-bottom: 0; border-radius: 5px 5px 0 0; font-size: 12px; color: var(--text-3); }
.app-eventvwr .ev-tab:hover { color: var(--text-2); }
.app-eventvwr .ev-tab.sel { background: #262626; border-color: var(--stroke); color: #fff; }
.app-eventvwr .ev-prophead { flex: none; display: flex; align-items: center; gap: 9px; padding: 10px 14px; border-bottom: 1px solid var(--stroke); background: rgba(255, 255, 255, 0.02); }
.app-eventvwr .ev-prophead svg { width: 20px; height: 20px; flex: none; }
.app-eventvwr .ev-prophead b { font-size: 12.5px; font-weight: 600; color: #fff; }
.app-eventvwr .ev-prophead span { font-size: 11.5px; color: var(--text-3); }
.app-eventvwr .ev-propsbody { display: flex; flex-direction: column; min-height: 0; padding: 0; }
.app-eventvwr .ev-fields { flex: none; display: grid; gap: 1px; padding: 10px 14px 4px; user-select: text; }
.app-eventvwr .ev-fields div { display: grid; grid-template-columns: 96px 1fr; gap: 8px; font-size: 11.5px; }
.app-eventvwr .ev-fields i { font-style: normal; color: var(--text-3); }
.app-eventvwr .ev-fields span { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; color: var(--text-2); }
.app-eventvwr .ev-desc { margin: 9px 14px 14px; padding: 9px 11px; max-height: 250px; overflow: auto; background: rgba(0, 0, 0, 0.18); border: 1px solid var(--stroke); border-radius: 4px; white-space: pre-wrap; font-size: 11.5px; line-height: 1.45; color: var(--text-2); user-select: text; }
.app-eventvwr .ev-detbar { flex: none; display: flex; align-items: center; justify-content: space-between; padding: 7px 14px; border-bottom: 1px solid var(--stroke); font-size: 11px; color: var(--text-3); }
.app-eventvwr .ev-xml { flex: 1; min-height: 0; max-height: 360px; margin: 0; padding: 12px 14px; overflow: auto; background: #1b1b1b; white-space: pre; font: 11px/1.5 Consolas, "Cascadia Mono", "Courier New", monospace; color: #d6e2f0; user-select: text; }
`;
