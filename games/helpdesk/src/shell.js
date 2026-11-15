// The shell: desktop icons, taskbar, Start, flyouts, context menus, toasts,
// task view, Alt+Tab and the lock screen. Apps live in apps.js.

import { icon } from "./icons.js";
import { initMenus, openMenu, closeMenu, menuOpen } from "./menu.js";
import { APPS } from "./apps.js";
import {
  initWindows,
  windowList,
  openWindow,
  focusWindow,
  minimiseWindow,
  taskbarClick,
  getWindow,
  relayout,
} from "./wm.js";
import { applyPrefs } from "./prefs.js";

const ICONS = [
  { id: "helpdesk", label: "Ticket Desk", app: "helpdesk" },
  { id: "mail", label: "Mail", app: "mail" },
  { id: "handbook", label: "Policy Handbook", app: "handbook" },
  { id: "directory", label: "Staff Directory", app: "directory" },
  { id: "explorer", label: "This PC", app: "explorer" },
  { id: "notepad", label: "Notepad", app: "notepad" },
  { id: "calc", label: "Calculator", app: "calc" },
  { id: "settings", label: "Settings", app: "settings" },
  { id: "bin", label: "Recycle Bin", app: "bin" },
];

const PINNED = ["explorer", "calc"];
const PINNED_START = ["helpdesk", "mail", "handbook", "directory", "explorer", "notepad", "calc", "settings", "taskmgr", "bin"];

const $ = (sel) => document.querySelector(sel);

const els = {};
let api = null;
let selectedIcon = null;
let altTab = null;

// ---------------------------------------------------------------------------

export function initShell(appApi) {
  api = appApi;
  els.desktop = $("#desktop");
  els.icons = $("#icons");
  els.taskbar = $("#taskbar");
  els.tbApps = $("#tbApps");
  els.start = $("#start");
  els.startGrid = $("#startGrid");
  els.startRecent = $("#startRecent");
  els.startSearch = $("#startSearch");
  els.quick = $("#quick");
  els.calendar = $("#calendar");
  els.trustPanel = $("#trustPanel");
  els.ctxLayer = $("#ctxLayer");
  els.toasts = $("#toasts");
  els.taskview = $("#taskview");
  els.lock = $("#lock");

  applyPrefs();
  initMenus(els.ctxLayer);
  initWindows({
    stage: $("#windows"),
    onChange: () => {
      renderTaskbar();
      if (els.taskview.hidden === false) renderTaskView();
    },
  });

  $("#startBtn").innerHTML = icon("$start");
  $("#searchBtn").innerHTML = icon("$search");
  $("#taskviewBtn").innerHTML = icon("$taskview");
  $("#startSearchIcon").innerHTML = icon("$search");
  $("#wifiIcon").innerHTML = icon("$wifi");
  $("#volIcon").innerHTML = icon("$volume");
  $("#batIcon").innerHTML = icon("$battery");
  $("#trustIcon").innerHTML = icon("$shield");
  $("#qsWifi").innerHTML = icon("$wifi");
  $("#qsVol").innerHTML = icon("$volume");
  $("#quickSettingsBtn").innerHTML = icon("settings");
  $("#powerBtn").innerHTML = icon("$power");
  $("#allAppsBtn").innerHTML = `All apps ${icon("$chevron")}`;
  $("#userAvatar").innerHTML = icon("$user");
  $("#signinAvatar").innerHTML = icon("$user");
  $("#lockAvatar").innerHTML = icon("$user");
  $("#showDesktopBtn").title = "Show desktop";

  renderDesktopIcons();
  renderStart();
  renderTaskbar();
  renderClock();
  renderCalendar();
  renderTrust();

  wireTaskbar();
  wireStart();
  wireFlyouts();
  wireDesktop();
  wireKeyboard();
  wireTaskView();
  wireLock();
  wireResize();

  setInterval(() => {
    renderClock();
    if (!$("#calendar").hidden) renderCalendar();
  }, 1000);
}

// ---------------------------------------------------------------------------
// apps
// ---------------------------------------------------------------------------

export function openApp(key, opts) {
  const app = APPS[key];
  if (!app) return;
  closeStart();
  closeFlyouts();
  closeMenu();

  const id = app.multi ? `${key}:${opts?.file || "notes.txt"}` : key;
  const title = app.titleFor ? app.titleFor(opts) : app.title;
  const width = Math.min(app.width, innerWidth - 12);
  const pos = app.pos || (app.right ? [innerWidth - width - 16, 20] : [undefined, undefined]);

  openWindow({
    id,
    title,
    icon: app.icon,
    width: app.width,
    height: app.height,
    x: pos[0],
    y: pos[1],
    build: (body, handle) => app.build(body, { ...api, window: handle, close: () => handle.close() }, opts),
  });
}

export function closeAllApps() {
  for (const win of windowList()) win.handle.close();
}

// ---------------------------------------------------------------------------
// desktop icons
// ---------------------------------------------------------------------------

function renderDesktopIcons() {
  els.icons.innerHTML = "";
  for (const item of ICONS) {
    const b = document.createElement("button");
    b.className = "icon";
    b.dataset.app = item.app;
    b.innerHTML = `${icon(appIconName(item.app))}<span>${item.label}</span>`;
    b.addEventListener("pointerdown", () => selectIcon(b));
    b.addEventListener("dblclick", () => openApp(item.app));
    b.addEventListener("click", (ev) => {
      // Touch and small screens do not do double-click; a second tap opens.
      if (ev.detail === 0 || matchMedia("(pointer: coarse)").matches) openApp(item.app);
    });
    b.addEventListener("contextmenu", (ev) => {
      ev.preventDefault();
      selectIcon(b);
      iconMenu(item, ev.clientX, ev.clientY);
    });
    els.icons.append(b);
  }
}

function appIconName(app) {
  return APPS[app]?.icon || "folder";
}

function selectIcon(node) {
  for (const other of els.icons.querySelectorAll(".icon")) other.classList.remove("selected");
  node.classList.add("selected");
  selectedIcon = node;
}

function iconMenu(item, x, y) {
  openMenu(x, y, [
    { label: "Open", onClick: () => openApp(item.app) },
    { separator: true },
    { label: "Cut", icon: "cut", disabled: true },
    { label: "Copy", icon: "copy", disabled: true },
    { separator: true },
    { label: "Delete", icon: "trash", onClick: () => api.toast("Desktop", "Access denied. IT keeps these.", "bin") },
    { separator: true },
    {
      label: "Properties",
      onClick: () =>
        api.alert(
          item.label,
          `Type: ${item.app === "explorer" ? "System folder" : "Application shortcut"}\nLocation: C:\\Users\\m.hayes\\Desktop\nSize: 1.2 KB\nCreated: 02/01/2026`,
        ),
    },
  ]);
}

function wireDesktop() {
  els.desktop.addEventListener("pointerdown", (ev) => {
    if (ev.button !== 0) return;
    if (ev.target.closest(".win") || ev.target.closest(".icon")) return;
    for (const other of els.icons.querySelectorAll(".icon")) other.classList.remove("selected");
    selectedIcon = null;
    closeStart();
    closeFlyouts();
    closeMenu();
    if (menuOpen()) return;

    const rect = els.desktop.getBoundingClientRect();
    const marquee = $("#marquee");
    const start = { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
    let moved = false;
    marquee.hidden = true;

    const move = (e) => {
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      if (Math.abs(cx - start.x) + Math.abs(cy - start.y) > 4) moved = true;
      if (!moved) return;
      marquee.hidden = false;
      marquee.style.cssText = `left:${Math.min(start.x, cx)}px;top:${Math.min(start.y, cy)}px;width:${Math.abs(cx - start.x)}px;height:${Math.abs(cy - start.y)}px;`;
      const box = marquee.getBoundingClientRect();
      for (const node of els.icons.querySelectorAll(".icon")) {
        const r = node.getBoundingClientRect();
        const hit = r.left < box.right && r.right > box.left && r.top < box.bottom && r.bottom > box.top;
        node.classList.toggle("selected", hit);
      }
    };
    const up = () => {
      marquee.hidden = true;
      els.desktop.removeEventListener("pointermove", move);
      els.desktop.removeEventListener("pointerup", up);
      els.desktop.removeEventListener("pointercancel", up);
    };
    els.desktop.addEventListener("pointermove", move);
    els.desktop.addEventListener("pointerup", up);
    els.desktop.addEventListener("pointercancel", up);
  });

  els.desktop.addEventListener("contextmenu", (ev) => {
    if (ev.target.closest(".win") || ev.target.closest(".icon")) return;
    ev.preventDefault();
    desktopMenu(ev.clientX, ev.clientY);
  });
}

function desktopMenu(x, y) {
  openMenu(x, y, [
    {
      label: "View",
      submenu: [
        { label: "Large icons", checked: false, onClick: () => api.toast("Desktop", "Your icons are fine as they are.", "monitor") },
        { label: "Medium icons", checked: true },
        { label: "Auto arrange icons", disabled: true },
      ],
    },
    {
      label: "Sort by",
      submenu: [
        { label: "Name", checked: true },
        { label: "Size" },
        { label: "Item type" },
        { label: "Date modified" },
      ],
    },
    { label: "Refresh", icon: "$refresh", shortcut: "F5", onClick: () => api.toast("Desktop", "Refreshed. Nothing changed.", "monitor") },
    { separator: true },
    {
      label: "New",
      submenu: [
        { label: "Folder", icon: "folder", onClick: () => api.toast("Desktop", "Folders are made by Facilities. Open a ticket.", "folder") },
        {
          label: "Text document",
          icon: "notepad",
          onClick: () => {
            openApp("notepad", { file: "New Text Document.txt" });
            api.toast("Desktop", "New Text Document.txt created.", "notepad");
          },
        },
        { label: "Shortcut", disabled: true },
      ],
    },
    { separator: true },
    { label: "Display settings", icon: "monitor", onClick: () => openApp("settings") },
    { label: "Personalise", icon: "$brush", onClick: () => openApp("settings") },
  ]);
}

// ---------------------------------------------------------------------------
// taskbar
// ---------------------------------------------------------------------------

function renderTaskbar() {
  const open = windowList();
  const byId = new Map(open.map((w) => [w.id, w]));
  const front = open.filter((w) => !w.minimized).pop();
  els.tbApps.innerHTML = "";

  const makeButton = (appId, title, ico, win) => {
    const b = document.createElement("button");
    b.className = `tb-app${win ? " is-open" : ""}${win && front?.id === win.id ? " is-active" : ""}`;
    b.innerHTML = `${icon(ico)}<span>${title}</span>`;
    b.title = title;
    b.addEventListener("click", () => {
      if (win) taskbarClick(win.id);
      else openApp(appId);
    });
    b.addEventListener("contextmenu", (ev) => {
      ev.preventDefault();
      const items = [{ label: title, disabled: true }];
      if (win) {
        items.push(
          { separator: true },
          { label: "Minimise", onClick: () => minimiseWindow(win.id) },
          { label: "Close window", danger: true, onClick: () => getWindow(win.id)?.handle.close() },
        );
      } else {
        items.push({ separator: true }, { label: "Pin to taskbar", disabled: true });
      }
      openMenu(ev.clientX, ev.clientY, items);
    });
    els.tbApps.append(b);
  };

  for (const id of PINNED) {
    makeButton(id, APPS[id].title, APPS[id].icon, byId.get(id));
  }
  for (const win of open) {
    if (PINNED.includes(win.id)) continue;
    makeButton(win.id, win.title, win.icon, win);
  }
}

function renderClock() {
  const now = new Date();
  const time = api?.clockText ? api.clockText() : `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  $("#clockTime").textContent = time;
  $("#clockDate").textContent = now.toLocaleDateString("en-GB");
  const lockTime = $("#lockTime");
  if (lockTime) lockTime.textContent = time;
  const lockDate = $("#lockDate");
  if (lockDate) {
    lockDate.textContent = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  }
}

function wireTaskbar() {
  $("#startBtn").addEventListener("click", (ev) => {
    ev.stopPropagation();
    toggleStart();
  });
  $("#searchBtn").addEventListener("click", (ev) => {
    ev.stopPropagation();
    closeFlyouts();
    showStart(true);
    $("#startSearch").focus();
  });
  $("#taskviewBtn").addEventListener("click", (ev) => {
    ev.stopPropagation();
    toggleTaskView();
  });
  $("#quickBtn").addEventListener("click", (ev) => {
    ev.stopPropagation();
    closeStart();
    toggleFlyout(els.quick, ev.currentTarget);
  });
  $("#clockBtn").addEventListener("click", (ev) => {
    ev.stopPropagation();
    closeStart();
    renderCalendar();
    toggleFlyout(els.calendar, ev.currentTarget);
  });
  $("#trustBtn").addEventListener("click", (ev) => {
    ev.stopPropagation();
    closeStart();
    renderTrust();
    toggleFlyout(els.trustPanel, ev.currentTarget);
  });
  $("#showDesktopBtn").addEventListener("click", () => {
    for (const win of windowList()) minimiseWindow(win.id);
    closeStart();
    closeFlyouts();
  });
  $("#taskbar").addEventListener("contextmenu", (ev) => {
    if (ev.target.closest(".tb-app")) return;
    ev.preventDefault();
    openMenu(ev.clientX, ev.clientY, [
      { label: "Task Manager", icon: "taskmgr", onClick: () => openApp("taskmgr") },
      { label: "Taskbar settings", icon: "settings", onClick: () => openApp("settings") },
      { separator: true },
      { label: "Show desktop", onClick: () => forEachMinimise() },
    ]);
  });
}

function forEachMinimise() {
  for (const win of windowList()) minimiseWindow(win.id);
}

function toggleFlyout(panel, button) {
  const willShow = panel.hidden;
  closeFlyouts();
  if (!willShow) return;
  panel.hidden = false;
  button?.classList.add("is-active");
  panel.dataset.anchor = button?.id || "";
}

function closeFlyouts() {
  for (const panel of [els.quick, els.calendar, els.trustPanel]) panel.hidden = true;
  for (const id of ["quickBtn", "clockBtn", "trustBtn"]) $(`#${id}`)?.classList.remove("is-active");
}

// ---------------------------------------------------------------------------
// start
// ---------------------------------------------------------------------------

function renderStart(query = "") {
  const term = query.trim().toLowerCase();
  const apps = PINNED_START.map((id) => ({ id, ...APPS[id] })).filter((a) => !term || a.title.toLowerCase().includes(term));

  els.startGrid.innerHTML = "";
  for (const app of apps) {
    const b = document.createElement("button");
    b.className = "start-app";
    b.innerHTML = `${icon(app.icon)}<span>${app.title}</span>`;
    b.addEventListener("click", () => openApp(app.id));
    els.startGrid.append(b);
  }
  if (!apps.length) els.startGrid.append(el(`<div class="muted tiny" style="grid-column:1/-1;padding:10px">No apps match "${query}".</div>`));

  const docs = [
    { name: "notes.txt", where: "Documents", icon: "notepad" },
    { name: "handover.txt", where: "Documents", icon: "notepad" },
    { name: "vpn-tokens.txt", where: "Documents", icon: "notepad" },
    { name: "Policy Handbook", where: "Recent", icon: "book", app: "handbook" },
    { name: "Today's briefing", where: "Mail", icon: "mail", app: "mail" },
    { name: "Task Manager", where: "System", icon: "taskmgr", app: "taskmgr" },
  ].filter((d) => !term || d.name.toLowerCase().includes(term));

  els.startRecent.innerHTML = "";
  for (const doc of docs) {
    const b = document.createElement("button");
    b.className = "recent-item";
    b.innerHTML = `${icon(doc.icon)}<span><b>${doc.name}</b><small>${doc.where}</small></span>`;
    b.addEventListener("click", () => {
      if (doc.app) openApp(doc.app);
      else openApp("notepad", { file: doc.name });
    });
    els.startRecent.append(b);
  }
}

function wireStart() {
  els.startSearch.addEventListener("input", () => renderStart(els.startSearch.value));
  $("#allAppsBtn").addEventListener("click", () => {
    els.startSearch.value = "";
    renderStart("");
    els.startSearch.focus();
    api.toast("Start", "These are all the apps this machine has. It is a work laptop.", "folder");
  });
  $("#userBtn").addEventListener("click", () =>
    api.alert("m.hayes", "IT Service Desk · Terminal 04\nHalcyon Dynamics\n\nAccount type: Standard user\nDomain: HALCYON"),
  );
  $("#powerBtn").addEventListener("click", (ev) => {
    ev.stopPropagation();
    const rect = ev.currentTarget.getBoundingClientRect();
    openMenu(rect.left - 60, rect.top - 172, [
      { label: "Lock", icon: "$lock", onClick: () => lockScreen() },
      { label: "Sign out", icon: "$user", onClick: () => lockScreen() },
      { separator: true },
      { label: "Restart", icon: "$refresh", onClick: () => restart("Restarting") },
      { label: "Shut down", icon: "$power", onClick: () => restart("Shutting down") },
    ]);
  });
  document.addEventListener("pointerdown", (ev) => {
    if (!els.start.hidden && !els.start.contains(ev.target) && !ev.target.closest("#startBtn, #searchBtn")) closeStart();
    if (!els.quick.hidden && !els.quick.contains(ev.target) && !ev.target.closest("#quickBtn")) closeFlyouts();
    if (!els.calendar.hidden && !els.calendar.contains(ev.target) && !ev.target.closest("#clockBtn")) closeFlyouts();
    if (!els.trustPanel.hidden && !els.trustPanel.contains(ev.target) && !ev.target.closest("#trustBtn")) closeFlyouts();
  });
}

function toggleStart() {
  if (!els.start.hidden) {
    closeStart();
    return;
  }
  closeFlyouts();
  showStart(false);
}

function showStart(focus) {
  if (!focus) els.startSearch.value = "";
  els.start.hidden = false;
  renderStart(els.startSearch.value);
  if (focus) els.startSearch.focus();
}

function closeStart() {
  els.start.hidden = true;
  els.startSearch.value = "";
}

function restart(word) {
  closeStart();
  closeFlyouts();
  const screen = $("#screen");
  const veil = document.createElement("div");
  veil.style.cssText =
    "position:absolute;inset:0;z-index:2000;background:#0a0a0a;display:grid;place-items:center;color:#8fa0b8;font-size:13px;letter-spacing:.04em";
  veil.textContent = word;
  screen.append(veil);
  setTimeout(() => location.reload(), 1100);
}

// ---------------------------------------------------------------------------
// quick settings + calendar + trust
// ---------------------------------------------------------------------------

function wireFlyouts() {
  for (const tile of document.querySelectorAll(".qs-tile")) {
    tile.addEventListener("click", () => {
      const on = tile.classList.toggle("on");
      tile.querySelector("small").textContent = on ? "On" : "Off";
      if (tile.dataset.toggle === "night") $("#screen").classList.toggle("night", on);
      if (tile.dataset.toggle === "air" && on) {
        for (const other of document.querySelectorAll('.qs-tile[data-toggle="wifi"]')) {
          other.classList.remove("on");
          other.querySelector("small").textContent = "Off";
        }
      }
    });
  }
  const bindSlider = (input, apply) => {
    const paint = () => {
      const pct = ((input.value - input.min) / (input.max - input.min)) * 100;
      input.style.setProperty("--fill", `${pct}%`);
      apply?.(input.value);
    };
    input.addEventListener("input", paint);
    paint();
  };
  bindSlider($("#volumeRange"));
  bindSlider($("#brightRange"), (v) => {
    $("#screen").style.filter = `brightness(${0.55 + (Number(v) / 100) * 0.65})`;
  });
  $("#quickSettingsBtn").addEventListener("click", () => openApp("settings"));
}

function renderCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const startDay = (first.getDay() + 6) % 7; // Monday-first
  const days = new Date(year, month + 1, 0).getDate();
  const monthName = now.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  let cells = "";
  for (let i = 0; i < startDay; i++) cells += `<span></span>`;
  for (let d = 1; d <= days; d++) {
    const today = d === now.getDate();
    cells += `<span class="cal-day${today ? " today" : ""}">${d}</span>`;
  }
  els.calendar.innerHTML = `
    <div class="cal-head">
      <b>${monthName}</b>
      <div class="cal-nav">
        <button disabled>${icon("$arrowLeft")}</button><button disabled>${icon("$arrowRight")}</button>
      </div>
    </div>
    <div class="cal-grid">
      ${["M", "T", "W", "T", "F", "S", "S"].map((d) => `<span>${d}</span>`).join("")}
      ${cells}
    </div>
    <div class="cal-foot muted">Shift ends at 17:00. The queue does not.</div>`;
}

function renderTrust() {
  const state = api?.state;
  if (!state) return;
  const value = state.trust;
  $("#trustValue").textContent = String(value);
  $("#trustBtn").classList.toggle("low", value <= 40);
  const big = $("#trustBig");
  if (big) big.textContent = String(value);
  const rows = $("#trustRows");
  if (rows) {
    const total = state.day.tickets.length;
    const done = state.resolved.length;
    const wrong = state.resolved.filter((r) => !r.correct).length;
    rows.innerHTML = `
      <div><span>Day</span><b>${state.day.n} of 3</b></div>
      <div><span>Tickets answered</span><b>${done}/${total}</b></div>
      <div><span>Mistakes today</span><b>${wrong}</b></div>
      <div><span>Trust</span><b>${value}</b></div>`;
  }
}

// ---------------------------------------------------------------------------
// task view / alt-tab
// ---------------------------------------------------------------------------

function wireTaskView() {
  $("#taskviewDesktop").addEventListener("click", () => {
    $("#taskview").hidden = true;
    for (const win of windowList()) minimiseWindow(win.id);
  });
}

function toggleTaskView() {
  const next = els.taskview.hidden;
  closeStart();
  closeFlyouts();
  els.taskview.hidden = !next;
  $("#taskviewBtn").classList.toggle("is-active", next);
  if (next) renderTaskView();
}

function renderTaskView() {
  const grid = $("#taskviewGrid");
  grid.innerHTML = "";
  for (const win of windowList()) {
    const card = document.createElement("button");
    card.className = "tv-card";
    card.innerHTML = `
      <div class="tv-card-top">${icon(win.icon)}<span>${win.title}</span></div>
      <div class="tv-thumb${win.minimized ? " min" : ""}">${
        win.minimized ? "Minimised" : "<i></i><i></i><i></i><i></i>"
      }</div>`;
    card.addEventListener("click", () => {
      els.taskview.hidden = true;
      $("#taskviewBtn").classList.remove("is-active");
      focusWindow(win.id);
    });
    grid.append(card);
  }
  if (!windowList().length) {
    grid.append(el(`<div class="app-empty"><p class="muted">No windows open. Double-click something on the desktop.</p></div>`));
  }
}

function wireKeyboard() {
  window.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") {
      closeStart();
      closeFlyouts();
      els.taskview.hidden = true;
      $("#taskviewBtn").classList.remove("is-active");
    }
    if (ev.key === "Tab" && ev.altKey) {
      ev.preventDefault();
      cycleAltTab(ev.shiftKey ? -1 : 1);
    }
  });
  window.addEventListener("keyup", (ev) => {
    if (ev.key === "Alt" && altTab) commitAltTab();
  });
  window.addEventListener("blur", () => altTab && commitAltTab());
}

function cycleAltTab(direction) {
  const windows = windowList();
  if (windows.length < 1) return;
  if (!altTab) {
    altTab = { index: windows.length - 1, ids: windows.map((w) => w.id) };
    $("#altTab").hidden = false;
  }
  altTab.index = (altTab.index + direction + windows.length) % windows.length;
  const row = $("#altTabRow");
  row.innerHTML = "";
  windows.forEach((win, i) => {
    const item = document.createElement("button");
    item.className = `alttab-item${i === altTab.index ? " active" : ""}`;
    item.innerHTML = `${icon(win.icon)}<span>${win.title}</span>`;
    row.append(item);
  });
}

function commitAltTab() {
  const id = altTab?.ids[altTab.index];
  $("#altTab").hidden = true;
  altTab = null;
  if (id) focusWindow(id);
}

// ---------------------------------------------------------------------------
// lock screen
// ---------------------------------------------------------------------------

function wireLock() {
  $("#lockUser").addEventListener("click", () => {
    $("#lockBottom").hidden = true;
    $("#lockSignin").hidden = false;
    $("#lockGo").focus();
  });
  $("#lockGo").addEventListener("click", signIn);
  window.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && !els.lock.hidden) signIn();
  });
}

export function lockScreen() {
  closeStart();
  closeFlyouts();
  closeMenu();
  els.lock.hidden = false;
  els.lock.classList.remove("gone");
  $("#lockBottom").hidden = false;
  $("#lockSignin").hidden = true;
  applyPrefs();
}

export function signIn() {
  if (els.lock.classList.contains("gone")) return;
  els.lock.classList.add("gone");
  setTimeout(() => (els.lock.hidden = true), 320);
  api?.onSignIn?.();
}

// ---------------------------------------------------------------------------
// toasts
// ---------------------------------------------------------------------------

export function toast(title, body, ico = "ticket") {
  const node = document.createElement("div");
  node.className = "toast";
  node.innerHTML = `${icon(ico)}<div><b>${escapeHtml(title)}</b><p>${escapeHtml(body)}</p></div>`;
  els.toasts.append(node);
  while (els.toasts.children.length > 3) els.toasts.firstElementChild.remove();
  setTimeout(() => node.remove(), 5200);
  node.addEventListener("click", () => node.remove());
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

// ---------------------------------------------------------------------------

function wireResize() {
  let timer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(timer);
    timer = setTimeout(() => relayout(), 120);
  });
  // Keep the taskbar buttons honest when a window focuses.
  document.addEventListener("pointerdown", () => setTimeout(renderTaskbar, 0), true);
}

export function refreshShell() {
  renderTaskbar();
  renderTrust();
}
