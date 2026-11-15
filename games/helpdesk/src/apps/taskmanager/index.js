// Task Manager, rebuilt as a Windows 11 shell. The open windows are real
// (ctx.ui.windows()); everything else on the Processes tab is seeded mock data.
// The app owns no world state: selection, tab, filters and startup toggles go
// through actions.setUi("taskmanager", …), and End task asks the platform to
// close the window it belongs to.

import {
  createModel,
  defaultStartupState,
  formatBoot,
  formatCpu,
  formatDisk,
  formatMbps,
  formatMemory,
  formatNet,
  formatPercent,
  formatUptime,
  ETHERNET_SCALE,
} from "./model.js";
import { css } from "./styles.js";

const TABS = [
  { id: "processes", label: "Processes" },
  { id: "performance", label: "Performance" },
  { id: "startup", label: "Startup apps" },
  { id: "details", label: "Details" },
  { id: "services", label: "Services" },
];

const SECTIONS = [
  { key: "apps", label: "Apps" },
  { key: "background", label: "Background processes" },
  { key: "system", label: "Windows processes" },
];

// How often the figures move, in visible-clock seconds.
const REFRESH_SECONDS = { high: 0.35, normal: 0.8, low: 1.6 };

const ICONS = {
  run: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="1.7" y="2.6" width="12.6" height="9.4" rx="1.4"/><path d="M1.7 5.3h12.6" stroke-width="1"/><path d="M8 7.4v4M6 9.4h4" stroke-linecap="round"/></svg>`,
  collapse: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6.2l4-3.2 4 3.2M4 9.8l4 3.2 4-3.2"/></svg>`,
  expand: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4.4l4 3.2 4-3.2M4 11.6l4-3.2 4 3.2"/></svg>`,
  cpu: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="6.2" y="6.2" width="11.6" height="11.6" rx="1.6"/><rect x="9.4" y="9.4" width="5.2" height="5.2" rx="0.8" fill="currentColor" stroke="none" opacity=".7"/><path d="M9 2.8v3.4M12 2.8v3.4M15 2.8v3.4M9 17.8v3.4M12 17.8v3.4M15 17.8v3.4M2.8 9h3.4M2.8 12h3.4M2.8 15h3.4M17.8 9h3.4M17.8 12h3.4M17.8 15h3.4" stroke-linecap="round"/></svg>`,
  memory: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="2.8" y="7.2" width="18.4" height="9.6" rx="1.5"/><path d="M6 10.2v3.6M9 10.2v3.6M12 10.2v3.6M15 10.2v3.6M18 10.2v3.6" stroke-linecap="round"/><path d="M6.5 16.8v2.4M17.5 16.8v2.4" stroke-linecap="round"/></svg>`,
  disk: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="2.8" y="5.2" width="18.4" height="13.6" rx="1.8"/><path d="M2.8 14.6h18.4"/><circle cx="17.4" cy="11.2" r="1" fill="currentColor" stroke="none"/><circle cx="7.2" cy="17" r=".9" fill="currentColor" stroke="none"/></svg>`,
  ethernet: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"><path d="M4.2 7.4h11.2a4.4 4.4 0 0 1 0 8.8H7.6"/><path d="M7.6 4.6v6.4H4.2V4.6zM7.6 12.8v6.4H4.2v-6.4z"/></svg>`,
};

const SEARCH_ICON = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="7" cy="7" r="4.3"/><path d="M10.2 10.2L14 14"/></svg>`;

const METRICS = [
  {
    id: "cpu",
    label: "CPU",
    icon: ICONS.cpu,
    max: 100,
    big: "Utilisation",
    value: (snap) => formatPercent(snap.cpu),
    subtitle: (model) => model.tier.cpu,
  },
  {
    id: "memory",
    label: "Memory",
    icon: ICONS.memory,
    max: 100,
    big: "In use",
    value: (snap) => formatPercent(snap.memory),
    subtitle: (model) => `${model.totalMemoryGB}.0 GB DDR4`,
  },
  {
    id: "disk",
    label: "Disk 0 (C:)",
    icon: ICONS.disk,
    max: 100,
    big: "Active time",
    value: (snap) => formatPercent(snap.disk),
    subtitle: () => "NVMe SSD · 476 GB",
  },
  {
    id: "ethernet",
    label: "Ethernet",
    icon: ICONS.ethernet,
    max: ETHERNET_SCALE,
    big: "Throughput",
    value: (snap) => formatMbps(snap.ethernet),
    subtitle: (model) => model.networkName,
  },
];

const RUN_ALIASES = {
  taskmgr: "taskmanager",
  "task manager": "taskmanager",
  calc: "calculator",
  mspaint: "notepad",
  control: "settings",
  "control panel": "settings",
};

const esc = (value) => String(value ?? "").replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);

const statusClass = (status) => (status === "Suspended" ? "susp" : status === "Stopped" ? "stop" : "");

function statusMarkup(status) {
  return `<span class="tm-status ${statusClass(status)}"><i></i>${esc(status)}</span>`;
}

function cellsMarkup() {
  return `
    <span class="tm-cell" data-f="cpu"></span>
    <span class="tm-cell" data-f="mem"></span>
    <span class="tm-cell" data-f="disk"></span>
    <span class="tm-cell" data-f="net"></span>`;
}

function servicePid(service) {
  let hash = 0;
  for (let i = 0; i < service.id.length; i += 1) hash = (Math.imul(hash, 31) + service.id.charCodeAt(i)) >>> 0;
  return 900 + (hash % 3200);
}

// ---------------------------------------------------------------------------
// canvas graphs
// ---------------------------------------------------------------------------

function fitCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  if (rect.width < 2 || rect.height < 2) return null;
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  const width = Math.round(rect.width * ratio);
  const height = Math.round(rect.height * ratio);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const g = canvas.getContext("2d");
  g.setTransform(ratio, 0, 0, ratio, 0, 0);
  g.clearRect(0, 0, rect.width, rect.height);
  return { g, width: rect.width, height: rect.height };
}

function drawChart(canvas, values, { max, grid }) {
  const fit = fitCanvas(canvas);
  if (!fit || values.length < 2) return;
  const { g, width, height } = fit;

  g.fillStyle = "#1a1b1e";
  g.fillRect(0, 0, width, height);

  if (grid) {
    g.strokeStyle = "rgba(255, 255, 255, 0.055)";
    g.lineWidth = 1;
    for (let i = 1; i < 4; i += 1) {
      const y = Math.round((height / 4) * i) + 0.5;
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(width, y);
      g.stroke();
    }
    for (let i = 1; i < 10; i += 1) {
      const x = Math.round((width / 10) * i) + 0.5;
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, height);
      g.stroke();
    }
  }

  const top = 6;
  const bottom = 4;
  const plot = Math.max(2, height - top - bottom);
  const point = (value, index) => [
    (index / (values.length - 1)) * width,
    top + (1 - Math.max(0, Math.min(1, value / max))) * plot,
  ];

  g.beginPath();
  g.moveTo(0, height);
  values.forEach((value, index) => {
    const [x, y] = point(value, index);
    g.lineTo(x, y);
  });
  g.lineTo(width, height);
  g.closePath();
  const fill = g.createLinearGradient(0, 0, 0, height);
  fill.addColorStop(0, "rgba(76, 194, 255, 0.38)");
  fill.addColorStop(1, "rgba(76, 194, 255, 0.02)");
  g.fillStyle = fill;
  g.fill();

  g.beginPath();
  values.forEach((value, index) => {
    const [x, y] = point(value, index);
    if (index === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  });
  g.strokeStyle = "#4cc2ff";
  g.lineWidth = grid ? 1.6 : 1.2;
  g.lineJoin = "round";
  g.stroke();

  if (grid) {
    const [x, y] = point(values[values.length - 1], values.length - 1);
    g.beginPath();
    g.arc(Math.min(x, width - 2), y, 2.2, 0, Math.PI * 2);
    g.fillStyle = "#bfeaff";
    g.fill();
  }
}

// ---------------------------------------------------------------------------

export default {
  id: "taskmanager",
  title: "Task Manager",
  icon: "taskmgr",
  size: [920, 620],
  desktop: true,
  pinned: true,
  order: 9,
  position: [330, 80],

  mount(container, ctx) {
    ctx.ui.styles("taskmanager", css);

    const saved = ctx.world.session.ui("taskmanager") || {};
    const model = createModel(ctx);
    const collapsed = new Set(Array.isArray(saved.collapsed) ? saved.collapsed : []);
    const stopped = new Set(Array.isArray(saved.stopped) ? saved.stopped : []);
    const startup = { ...defaultStartupState(), ...(saved.startup || {}) };

    const state = {
      tab: TABS.some((tab) => tab.id === saved.tab) ? saved.tab : "processes",
      selection: typeof saved.selection === "string" ? saved.selection : null,
      search: typeof saved.search === "string" ? saved.search : "",
      perf: METRICS.some((metric) => metric.id === saved.perf) ? saved.perf : "cpu",
      refresh: Object.hasOwn(REFRESH_SECONDS, saved.refresh) ? saved.refresh : "normal",
    };

    let active = true;
    let viewRefs = null;
    let pendingRender = null;
    let lastSignature = "";

    container.innerHTML = "";
    const root = ctx.ui.el(`
      <div class="tm">
        <div class="tm-top">
          <div class="tm-tabs" role="tablist" data-tabs></div>
          <div class="tm-tools">
            <button class="tm-run" data-run title="Run new task">${ICONS.run}<span>Run new task</span></button>
            <button class="tm-iconbtn" data-gear title="Settings" aria-label="Settings">${ctx.ui.icon("settings")}</button>
            <button class="tm-iconbtn" data-collapse title="Collapse all" aria-label="Collapse all">${ICONS.collapse}</button>
          </div>
        </div>
        <div class="tm-view" data-view></div>
      </div>`);
    container.append(root);

    const view = root.querySelector("[data-view]");
    const tabsEl = root.querySelector("[data-tabs]");
    const gearBtn = root.querySelector("[data-gear]");
    const collapseBtn = root.querySelector("[data-collapse]");

    for (const tab of TABS) {
      const button = document.createElement("button");
      button.className = "tm-tab";
      button.type = "button";
      button.dataset.tab = tab.id;
      button.setAttribute("role", "tab");
      button.textContent = tab.label;
      button.addEventListener("click", () => setTab(tab.id));
      tabsEl.append(button);
    }

    root.querySelector("[data-run]").addEventListener("click", openRunDialog);
    gearBtn.addEventListener("click", openSettingsMenu);
    collapseBtn.addEventListener("click", toggleCollapseAll);

    // -----------------------------------------------------------------------
    // state helpers
    // -----------------------------------------------------------------------

    function persist() {
      ctx.actions.setUi("taskmanager", {
        tab: state.tab,
        selection: state.selection,
        search: state.search,
        perf: state.perf,
        refresh: state.refresh,
        collapsed: [...collapsed],
        startup: { ...startup },
        stopped: [...stopped],
      });
    }

    function windowSignature() {
      return ctx.ui.windows()
        .map((win) => `${win.id}:${win.minimized ? 1 : 0}:${win.title}`)
        .join("|");
    }

    function updateTabs() {
      for (const button of tabsEl.querySelectorAll("[data-tab]")) {
        button.classList.toggle("sel", button.dataset.tab === state.tab);
        button.setAttribute("aria-selected", String(button.dataset.tab === state.tab));
      }
      updateCollapseButton();
    }

    function setTab(tabId) {
      if (state.tab === tabId) return;
      state.tab = tabId;
      persist();
      updateTabs();
      renderView();
    }

    function updateCollapseButton() {
      const appIds = model.collect(stopped).apps.map((group) => group.id);
      const allCollapsed = appIds.length > 0 && appIds.every((id) => collapsed.has(id));
      collapseBtn.innerHTML = allCollapsed ? ICONS.expand : ICONS.collapse;
      collapseBtn.title = allCollapsed ? "Expand all" : "Collapse all";
      collapseBtn.setAttribute("aria-label", collapseBtn.title);
      collapseBtn.disabled = state.tab !== "processes" || appIds.length === 0;
    }

    function toggleCollapseAll() {
      const groups = model.collect(stopped);
      const ids = groups.apps.map((group) => group.id);
      const allCollapsed = ids.length > 0 && ids.every((id) => collapsed.has(id));
      if (allCollapsed) {
        for (const id of ids) collapsed.delete(id);
      } else {
        for (const id of ids) collapsed.add(id);
      }
      persist();
      updateCollapseButton();
      if (state.tab === "processes") renderProcesses();
    }

    // -----------------------------------------------------------------------
    // views
    // -----------------------------------------------------------------------

    function renderView() {
      viewRefs = null;
      if (state.tab === "processes") renderProcesses();
      else if (state.tab === "performance") renderPerformance();
      else if (state.tab === "startup") renderStartup();
      else if (state.tab === "details") renderDetails();
      else renderServices();
      updateTabs();
    }

    function rowsFor(groups) {
      return groups.apps.length + groups.background.length + groups.system.length;
    }

    function findSelected(groups) {
      for (const section of SECTIONS) {
        for (const group of groups[section.key]) {
          if (group.id === state.selection) return { group, process: group.processes[0] };
          for (const process of group.processes) {
            if (process.id === state.selection) return { group, process };
          }
        }
      }
      return null;
    }

    function selectionExists(groups) {
      return Boolean(findSelected(groups));
    }

    // --- Processes ---------------------------------------------------------

    function renderProcesses() {
      const groups = model.collect(stopped);
      const page = ctx.ui.el(`<div class="tm-page tm-proc"></div>`);
      const subbar = ctx.ui.el(`
        <div class="tm-subbar">
          <label class="tm-search">${SEARCH_ICON}<input type="search" data-search placeholder="Search processes" aria-label="Search processes"></label>
          <button class="tm-end" data-end type="button">End task</button>
        </div>`);
      const scroll = ctx.ui.el(`<div class="tm-scroll"></div>`);
      const table = ctx.ui.el(`<div class="tm-table"></div>`);
      const footer = ctx.ui.el(`
        <div class="tm-footer">
          <span>Processes: <b data-foot="count"></b></span>
          <span>CPU <b data-foot="cpu"></b></span>
          <span>Memory <b data-foot="mem"></b></span>
          <span>Disk <b data-foot="disk"></b></span>
          <span>Network <b data-foot="net"></b></span>
          <span class="spacer">Windows 11 Pro · 22H2</span>
        </div>`);

      const searchInput = subbar.querySelector("[data-search]");
      searchInput.value = state.search;
      const endButton = subbar.querySelector("[data-end]");

      const head = ctx.ui.el(`
        <div class="tm-head-row">
          <span>Name</span><span>Status</span><span class="tm-cell">CPU</span><span class="tm-cell">Memory</span><span class="tm-cell">Disk</span><span class="tm-cell">Network</span>
        </div>`);
      table.append(head);

      const refs = { kind: "processes", groups, sections: [], rows: [], count: rowsFor(groups), footer: {}, endButton };
      for (const key of ["count", "cpu", "mem", "disk", "net"]) refs.footer[key] = footer.querySelector(`[data-foot="${key}"]`);

      const matches = (text, query) => !query || text.includes(query);
      const query = () => state.search.trim().toLowerCase();

      const applyFilter = () => {
        const term = query();
        let anything = false;
        for (const section of refs.sections) {
          let sectionVisible = false;
          for (const block of section.blocks) {
            const match = matches(block.searchText, term);
            block.row.hidden = !match;
            if (match) sectionVisible = true;
            for (const child of block.children) {
              child.row.hidden = !match || collapsed.has(block.group.id);
            }
          }
          section.head.hidden = !sectionVisible;
          if (sectionVisible) anything = true;
        }
        refs.empty.hidden = anything;
      };

      for (const section of SECTIONS) {
        const list = groups[section.key];
        if (!list.length) continue;
        const sectionHead = ctx.ui.el(`<div class="tm-section">${esc(section.label)}<span class="count">${list.length}</span></div>`);
        const blockRefs = [];
        table.append(sectionHead);

        for (const group of list) {
          const closed = collapsed.has(group.id);
          const chevron = group.single
            ? `<span class="tm-chev blank"></span>`
            : `<button class="tm-chev${closed ? " closed" : ""}" type="button" data-chev aria-label="Toggle group" aria-expanded="${String(!closed)}">${ctx.ui.icon("$chevronDown")}</button>`;

          const row = ctx.ui.el(`
            <div class="tm-row tm-group${state.selection === group.id ? " sel" : ""}" tabindex="0" role="option" data-key="${esc(group.id)}" aria-selected="${String(state.selection === group.id)}">
              <span class="tm-name">${chevron}${ctx.ui.icon(group.icon)}<span class="tm-label">${esc(group.name)}</span></span>
              ${statusMarkup(group.status)}
              ${cellsMarkup()}
            </div>`);
          row.addEventListener("click", (event) => {
            if (event.target.closest("[data-chev]")) return;
            select(group.id);
          });
          row.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            select(group.id);
          });

          const children = [];
          const chevronButton = row.querySelector("[data-chev]");
          if (chevronButton) {
            chevronButton.addEventListener("click", (event) => {
              event.stopPropagation();
              if (collapsed.has(group.id)) collapsed.delete(group.id);
              else collapsed.add(group.id);
              persist();
              const isClosed = collapsed.has(group.id);
              chevronButton.classList.toggle("closed", isClosed);
              chevronButton.setAttribute("aria-expanded", String(!isClosed));
              applyFilter();
            });
          }

          table.append(row);
          refs.rows.push({
            row,
            processes: group.processes,
            cells: {
              cpu: row.querySelector('[data-f="cpu"]'),
              mem: row.querySelector('[data-f="mem"]'),
              disk: row.querySelector('[data-f="disk"]'),
              net: row.querySelector('[data-f="net"]'),
            },
          });

          if (!group.single) {
            for (const process of group.processes) {
              const child = ctx.ui.el(`
                <div class="tm-row tm-child${state.selection === process.id ? " sel" : ""}" tabindex="0" role="option" data-key="${esc(process.id)}" aria-selected="${String(state.selection === process.id)}"${closed ? " hidden" : ""}>
                  <span class="tm-name tm-indent">${ctx.ui.icon(process.icon)}<span class="tm-label">${esc(process.name)}</span></span>
                  ${statusMarkup(process.status)}
                  ${cellsMarkup()}
                </div>`);
              child.addEventListener("click", () => select(process.id));
              child.addEventListener("keydown", (event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                select(process.id);
              });
              table.append(child);
              children.push({ row: child, process });
              refs.rows.push({
                row: child,
                processes: [process],
                cells: {
                  cpu: child.querySelector('[data-f="cpu"]'),
                  mem: child.querySelector('[data-f="mem"]'),
                  disk: child.querySelector('[data-f="disk"]'),
                  net: child.querySelector('[data-f="net"]'),
                },
              });
            }
          }

          blockRefs.push({
            group,
            row,
            children,
            searchText: [group.name, ...group.processes.map((process) => process.name)].join(" ").toLowerCase(),
          });
        }
        refs.sections.push({ head: sectionHead, blocks: blockRefs });
      }

      const empty = ctx.ui.el(`<div class="tm-empty" hidden>No processes match that search.</div>`);
      table.append(empty);
      refs.empty = empty;
      scroll.append(table);

      page.append(subbar, scroll, footer);
      view.replaceChildren(page);

      endButton.disabled = !selectionExists(groups);
      endButton.addEventListener("click", () => void endSelected());
      searchInput.addEventListener("input", () => {
        state.search = searchInput.value;
        persist();
        applyFilter();
      });

      viewRefs = refs;
      applyFilter();
      updateProcessFigures();
    }

    function select(key) {
      state.selection = key;
      persist();
      if (!viewRefs) return;
      for (const row of viewRefs.rows || []) row.row.classList.toggle("sel", row.row.dataset.key === key);
      if (viewRefs.endButton) viewRefs.endButton.disabled = !selectionExists(viewRefs.groups);
    }

    function updateProcessFigures() {
      if (!active || !viewRefs || (viewRefs.kind !== "processes" && viewRefs.kind !== "details")) return;
      const snapshot = model.perf.latest();

      for (const ref of viewRefs.rows) {
        const figures = model.aggregate(ref.processes);
        if (ref.cells.cpu) ref.cells.cpu.textContent = formatCpu(figures.cpu);
        if (ref.cells.mem) ref.cells.mem.textContent = formatMemory(figures.memMB);
        if (ref.cells.disk) ref.cells.disk.textContent = formatDisk(figures.diskMBps);
        if (ref.cells.net) ref.cells.net.textContent = formatNet(figures.netMbps);
      }

      if (viewRefs.kind === "processes" && viewRefs.footer.count) {
        const inUseGB = (snapshot.memory / 100) * model.totalMemoryGB;
        viewRefs.footer.count.textContent = String(viewRefs.count);
        viewRefs.footer.cpu.textContent = formatPercent(snapshot.cpu);
        viewRefs.footer.mem.textContent = `${formatPercent(snapshot.memory)} (${inUseGB.toFixed(1)} GB)`;
        viewRefs.footer.disk.textContent = formatPercent(snapshot.disk);
        viewRefs.footer.net.textContent = formatMbps(snapshot.ethernet);
      }
    }

    async function endSelected() {
      const groups = model.collect(stopped);
      const target = findSelected(groups);
      if (!target) return;
      const { group, process } = target;
      const name = group.single ? group.name : process.name;

      if (process.kind === "system" || process.kind === "service") {
        const confirmed = await ctx.ui.confirm(
          "Task Manager",
          `If you end a system process, the system might become unstable or stop responding.\n\nAre you sure you want to end ${name}?`,
          { ok: "End process" },
        );
        if (confirmed) {
          await ctx.ui.alert("Task Manager", "The operation could not be completed.\n\nAccess is denied.");
        }
        return;
      }

      if (group.windowId) {
        const self = group.windowId === ctx.window.id;
        if (self) {
          ctx.ui.toast("Task Manager", "Ending Task Manager…", "taskmgr");
          ctx.ui.endWindow(group.windowId);
          return;
        }
        ctx.ui.endWindow(group.windowId);
        state.selection = null;
        persist();
        ctx.ui.toast("Task Manager", `${name} has been ended.`, "taskmgr");
        renderView();
        return;
      }

      stopped.add(process.id);
      state.selection = null;
      persist();
      ctx.ui.toast("Task Manager", `${name} has been ended.`, "taskmgr");
      renderView();
    }

    // --- Performance -------------------------------------------------------

    function renderPerformance() {
      const groups = model.collect(stopped);
      const count = rowsFor(groups);
      const selected = METRICS.find((metric) => metric.id === state.perf) || METRICS[0];
      const page = ctx.ui.el(`<div class="tm-page tm-perf"></div>`);
      const nav = ctx.ui.el(`<div class="tm-perf-nav" role="tablist" aria-label="Performance categories"></div>`);
      const main = ctx.ui.el(`<div class="tm-perf-main"></div>`);

      const items = [];
      for (const metric of METRICS) {
        const item = ctx.ui.el(`
          <button class="tm-perf-item${metric.id === selected.id ? " sel" : ""}" type="button" data-metric="${metric.id}" role="tab" aria-selected="${String(metric.id === selected.id)}">
            <span class="ico">${metric.icon}</span>
            <span class="meta"><b>${esc(metric.label)}</b><small data-value="${metric.id}"></small></span>
            <canvas class="tm-spark" data-spark="${metric.id}"></canvas>
          </button>`);
        item.addEventListener("click", () => {
          state.perf = metric.id;
          persist();
          renderPerformance();
        });
        nav.append(item);
        items.push({ metric, canvas: item.querySelector("[data-spark]"), value: item.querySelector(`[data-value="${metric.id}"]`) });
      }

      const detail = ctx.ui.el(`
        <div>
          <div class="tm-perf-head">
            <div>
              <h2>${esc(selected.label)}</h2>
              <p>${esc(selected.subtitle(model))}</p>
            </div>
            <div class="tm-perf-big"><b data-perf-value>—</b><span>${esc(selected.big)}</span></div>
          </div>
          <canvas class="tm-chart" data-chart></canvas>
          <div class="tm-stats" data-stats></div>
        </div>`);
      main.append(detail);

      const statsEls = [];
      const statsFor = (snapshot) => performanceStats(selected, snapshot, model, count);
      for (const [label] of statsFor(model.perf.latest())) {
        const stat = ctx.ui.el(`<div class="tm-stat"><span>${esc(label)}</span><b></b></div>`);
        statsEls.push(stat.querySelector("b"));
        detail.querySelector("[data-stats]").append(stat);
      }

      page.append(nav, main);
      view.replaceChildren(page);

      viewRefs = {
        kind: "performance",
        items,
        detail: {
          metric: selected,
          canvas: detail.querySelector("[data-chart]"),
          value: detail.querySelector("[data-perf-value]"),
          stats: statsEls,
        },
        count,
      };
      drawPerformance();
    }

    function performanceStats(metric, snapshot, model, count) {
      const total = model.totalMemoryGB;
      const inUse = (snapshot.memory / 100) * total;
      if (metric.id === "cpu") {
        return [
          ["Utilisation", formatPercent(snapshot.cpu)],
          ["Speed", model.tier.speed],
          ["Processes", String(count)],
          ["Up time", formatUptime(model.uptimeSeconds())],
          ["Cores", String(model.tier.cores)],
          ["Logical processors", String(model.tier.cores * 2)],
        ];
      }
      if (metric.id === "memory") {
        return [
          ["In use", `${inUse.toFixed(1)} GB`],
          ["Available", `${(total - inUse).toFixed(1)} GB`],
          ["Committed", `${(inUse + 2.2).toFixed(1)} / ${(total + 4).toFixed(1)} GB`],
          ["Cached", `${(total * 0.16).toFixed(1)} GB`],
          ["Speed", "3200 MHz"],
          ["Slots used", "2 of 2"],
        ];
      }
      if (metric.id === "disk") {
        return [
          ["Active time", formatPercent(snapshot.disk)],
          ["Read speed", `${(snapshot.disk * 0.62).toFixed(1)} MB/s`],
          ["Write speed", `${(snapshot.disk * 0.24).toFixed(1)} MB/s`],
          ["Average response", `${(0.05 + snapshot.disk / 22).toFixed(2)} ms`],
          ["Capacity", "476 GB"],
          ["Type", "NVMe SSD"],
        ];
      }
      return [
        ["Receive", formatMbps(snapshot.ethernet * 0.72)],
        ["Send", formatMbps(snapshot.ethernet * 0.28)],
        ["Adapter", model.networkName],
        ["IPv4 address", model.ipv4],
        ["Link speed", "1.0 Gbps"],
        ["Connection", "Connected"],
      ];
    }

    function drawPerformance() {
      if (!active || !viewRefs || viewRefs.kind !== "performance") return;
      const snapshot = model.perf.latest();

      for (const item of viewRefs.items) {
        drawChart(item.canvas, model.perf.history[item.metric.id], {
          max: item.metric.max,
          grid: false,
        });
        item.value.textContent = item.metric.value(snapshot);
      }

      const detail = viewRefs.detail;
      drawChart(detail.canvas, model.perf.history[detail.metric.id], { max: detail.metric.max, grid: true });
      detail.value.textContent = detail.metric.value(snapshot);
      const stats = performanceStats(detail.metric, snapshot, model, viewRefs.count);
      stats.forEach(([, value], index) => {
        if (detail.stats[index]) detail.stats[index].textContent = value;
      });
    }

    // --- Startup apps ------------------------------------------------------

    function renderStartup() {
      const rows = model.startupRows(startup);
      const page = ctx.ui.el(`
        <div class="tm-page tm-start">
          <div class="tm-start-head">
            <h2>Startup apps</h2>
            <span class="boot" data-boot>Last BIOS time: ${formatBoot(model.bootSeconds(startup))}</span>
          </div>
          <div class="tm-scroll">
            <div class="tm-table tm-startup">
              <div class="tm-head-row">
                <span>Name</span><span>Publisher</span><span>Status</span><span>Startup impact</span><span></span>
              </div>
              <div data-start-rows></div>
            </div>
          </div>
          <p class="tm-note">Startup apps are managed by IT. Changes apply at the next sign-in.</p>
        </div>`);

      const list = page.querySelector("[data-start-rows]");
      const bootEl = page.querySelector("[data-boot]");
      for (const app of rows) {
        const impact = app.seconds >= 1.8 ? "high" : app.seconds >= 0.8 ? "medium" : "low";
        const filled = impact === "high" ? 3 : impact === "medium" ? 2 : 1;
        const initial = esc(app.name.replace(/^Microsoft\s+/i, "").charAt(0) || "?");
        const row = ctx.ui.el(`
          <div class="tm-row" data-start="${esc(app.id)}">
            <span class="tm-start-name">
              <span class="tm-apptile" style="background:${esc(app.color)}">${initial}</span>
              <span class="words"><b>${esc(app.name)}</b></span>
            </span>
            <span class="tm-cell" style="text-align:left">${esc(app.publisher)}</span>
            <span data-status>${app.enabled ? "Enabled" : "Disabled"}</span>
            <span class="tm-impact ${impact}">${[0, 1, 2].map((index) => `<i class="${index < filled ? "on" : ""}"></i>`).join("")}${impact[0].toUpperCase()}${impact.slice(1)}</span>
            <span>
              <label class="tm-switch">
                <input type="checkbox" data-startup="${esc(app.id)}" aria-label="Enable ${esc(app.name)} at startup"${app.enabled ? " checked" : ""}>
                <span class="track"></span>
              </label>
            </span>
          </div>`);
        const input = row.querySelector("input");
        const status = row.querySelector("[data-status]");
        input.addEventListener("change", () => {
          startup[app.id] = input.checked;
          persist();
          status.textContent = input.checked ? "Enabled" : "Disabled";
          bootEl.textContent = `Last BIOS time: ${formatBoot(model.bootSeconds(startup))}`;
        });
        list.append(row);
      }

      view.replaceChildren(page);
      viewRefs = { kind: "startup" };
    }

    // --- Details -----------------------------------------------------------

    function renderDetails() {
      const groups = model.collect(stopped);
      const flat = [];
      for (const section of SECTIONS) {
        for (const group of groups[section.key]) {
          for (const process of group.processes) flat.push(process);
        }
      }
      flat.sort((a, b) => a.name.localeCompare(b.name));

      const page = ctx.ui.el(`<div class="tm-page tm-details-page"></div>`);
      const scroll = ctx.ui.el(`<div class="tm-scroll"></div>`);
      const table = ctx.ui.el(`
        <div class="tm-table tm-details">
          <div class="tm-head-row">
            <span>Name</span><span class="tm-cell">PID</span><span>Status</span><span>User name</span><span class="tm-cell">CPU</span><span class="tm-cell">Memory</span><span class="tm-cell">Disk</span><span class="tm-cell">Network</span>
          </div>
        </div>`);

      const refs = { kind: "details", groups, rows: [] };
      for (const process of flat) {
        const row = ctx.ui.el(`
          <div class="tm-row" data-key="${esc(process.id)}">
            <span class="tm-name">${ctx.ui.icon(process.icon)}<span class="tm-label">${esc(process.name)}</span></span>
            <span class="tm-cell">${process.pid}</span>
            ${statusMarkup(process.status)}
            <span class="tm-cell" style="text-align:left">${esc(process.user)}</span>
            ${cellsMarkup()}
          </div>`);
        table.append(row);
        refs.rows.push({
          row,
          processes: [process],
          cells: {
            cpu: row.querySelector('[data-f="cpu"]'),
            mem: row.querySelector('[data-f="mem"]'),
            disk: row.querySelector('[data-f="disk"]'),
            net: row.querySelector('[data-f="net"]'),
          },
        });
      }
      if (!flat.length) table.append(ctx.ui.el(`<div class="tm-empty">No processes. That is either very good or very bad.</div>`));

      scroll.append(table);
      page.append(scroll);
      view.replaceChildren(page);
      viewRefs = refs;
      updateProcessFigures();
    }

    // --- Services ----------------------------------------------------------

    function renderServices() {
      const services = model.services();
      const page = ctx.ui.el(`<div class="tm-page tm-service-page"></div>`);
      const scroll = ctx.ui.el(`<div class="tm-scroll"></div>`);
      const table = ctx.ui.el(`
        <div class="tm-table tm-services">
          <div class="tm-head-row">
            <span>Name</span><span class="tm-cell">PID</span><span>Description</span><span>Status</span><span>Group</span>
          </div>
        </div>`);

      for (const service of services) {
        const running = service.status === "running";
        table.append(ctx.ui.el(`
          <div class="tm-row">
            <span class="tm-name">${ctx.ui.icon("settings")}<span class="tm-label">${esc(service.name)}</span></span>
            <span class="tm-cell">${servicePid(service)}</span>
            <span class="tm-cell" style="text-align:left">${esc(service.displayName)}</span>
            ${statusMarkup(running ? "Running" : "Stopped")}
            <span class="tm-cell" style="text-align:left">${service.startType === "automatic" ? "Automatic" : "Manual"}</span>
          </div>`));
      }
      if (!services.length) table.append(ctx.ui.el(`<div class="tm-empty">No services found.</div>`));

      scroll.append(table);
      page.append(scroll);
      view.replaceChildren(page);
      viewRefs = { kind: "services" };
    }

    // -----------------------------------------------------------------------
    // header controls
    // -----------------------------------------------------------------------

    function openRunDialog() {
      ctx.ui.dialog({
        html: `
          <h2>Create new task</h2>
          <p>Type the name of a program, folder, document, or Internet resource, and Windows will open it for you.</p>
          <label style="display:block;font-size:12px;color:var(--text-3);margin-top:12px">Open:
            <input data-run-input placeholder="notepad" autocomplete="off" spellcheck="false"
              style="display:block;width:100%;margin-top:4px;padding:6px 8px;border:1px solid var(--stroke-2);border-radius:4px;background:rgba(255,255,255,.06);color:var(--text);font-size:12.5px;outline:none">
          </label>
          <label style="display:flex;align-items:center;gap:7px;margin-top:12px;font-size:12px;color:var(--text-2)">
            <input type="checkbox" data-run-elevated style="accent-color:#4cc2ff"> Create this task with administrative privileges
          </label>
          <div class="row">
            <button class="btn" type="button" data-run-cancel>Cancel</button>
            <button class="btn primary" type="button" data-run-ok>OK</button>
          </div>`,
        wire: (node) => {
          const input = node.querySelector("[data-run-input]");
          const elevated = node.querySelector("[data-run-elevated]");
          const submit = () => {
            const raw = input.value.trim();
            if (!raw) {
              input.focus();
              return;
            }
            ctx.ui.closeDialog();
            const cleaned = raw.replace(/^"|"$/g, "").replace(/\.exe$/i, "").trim().toLowerCase();
            const appId = RUN_ALIASES[cleaned] || cleaned;
            const handle = ctx.open(appId);
            if (handle) {
              ctx.ui.toast("Task Manager", `Started ${raw}${elevated.checked ? " with elevated privileges" : ""}.`, "taskmgr");
            } else {
              ctx.ui.alert(
                "Task Manager",
                `Windows cannot find '${raw}'. Make sure you typed the name correctly, and then try again.`,
              );
            }
          };
          node.querySelector("[data-run-cancel]").addEventListener("click", () => ctx.ui.closeDialog());
          node.querySelector("[data-run-ok]").addEventListener("click", submit);
          input.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          });
          input.focus();
        },
      });
    }

    function openSettingsMenu() {
      const rect = gearBtn.getBoundingClientRect();
      const refreshItem = (id, label) => ({
        label,
        checked: state.refresh === id,
        onClick: () => {
          state.refresh = id;
          persist();
          if (state.tab === "processes" || state.tab === "details") updateProcessFigures();
        },
      });
      ctx.ui.menu(rect.left, rect.bottom + 4, [
        {
          label: "Refresh rate",
          submenu: [refreshItem("high", "High"), refreshItem("normal", "Normal"), refreshItem("low", "Low")],
        },
        { separator: true },
        {
          label: "Reset startup apps",
          onClick: () => {
            for (const key of Object.keys(startup)) delete startup[key];
            Object.assign(startup, defaultStartupState());
            persist();
            if (state.tab === "startup") renderView();
          },
        },
        {
          label: "Reset Task Manager layout",
          onClick: () => {
            state.tab = "processes";
            state.selection = null;
            state.search = "";
            state.perf = "cpu";
            collapsed.clear();
            persist();
            renderView();
          },
        },
        { separator: true },
        { label: "Version 11.0.22621", disabled: true },
      ]);
    }

    // -----------------------------------------------------------------------
    // clock + events
    // -----------------------------------------------------------------------

    let drawAccumulator = 0;
    let figureAccumulator = 0;
    let signatureAccumulator = 0;

    const offTick = ctx.clock.onTick((dt) => {
      if (!active) return;
      model.advance(dt);

      if (state.tab === "performance") {
        drawAccumulator += dt;
        if (drawAccumulator >= 0.1) {
          drawAccumulator = 0;
          drawPerformance();
        }
      }

      if (state.tab === "processes" || state.tab === "details") {
        figureAccumulator += dt;
        if (figureAccumulator >= (REFRESH_SECONDS[state.refresh] || 0.8)) {
          figureAccumulator = 0;
          updateProcessFigures();
        }
      }

      signatureAccumulator += dt;
      if (signatureAccumulator >= 0.4) {
        signatureAccumulator = 0;
        const signature = windowSignature();
        if (signature !== lastSignature) {
          lastSignature = signature;
          if (state.tab === "processes" || state.tab === "details" || state.tab === "performance") renderView();
        }
      }
    });

    const offEvents = ctx.events.on("*", (event) => {
      if (!active || !event || String(event.type || "").startsWith("ui:")) return;
      if (!["processes", "details", "services", "performance"].includes(state.tab)) return;
      pendingRender?.();
      pendingRender = ctx.clock.schedule(0.15, () => {
        pendingRender = null;
        if (active) renderView();
      });
    });

    function onKeyDown(event) {
      if (event.key !== "Delete") return;
      if (state.tab !== "processes") return;
      if (!root.contains(document.activeElement)) return;
      if (!state.selection) return;
      event.preventDefault();
      void endSelected();
    }
    container.addEventListener("keydown", onKeyDown);

    ctx.onDispose(() => {
      active = false;
      offTick();
      offEvents();
      pendingRender?.();
      container.removeEventListener("keydown", onKeyDown);
    });

    lastSignature = windowSignature();
    updateTabs();
    renderView();
  },
};
