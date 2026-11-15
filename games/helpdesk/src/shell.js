// The shell: desktop icons, taskbar, Start, flyouts, context menus, toasts,
// task view, Alt+Tab and the lock screen. It knows about the app registry, but
// not about the inside of any app.

import { icon } from "./icons.js";
import { initMenus, openMenu, closeMenu, menuOpen } from "./menu.js";
import { desktopApps, getApp, pinnedApps } from "./apps/index.js";
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
import { applyPrefs, getAccount, setAccountPassword, verifyPassword, verifyRecovery, MIN_PASSWORD_LENGTH } from "./prefs.js";
import { createUi } from "./ui/index.js";
import { createAppContext } from "./context.js";
import { initAudio } from "./audio/index.js";
import { toast as showToast } from "./ui/toast.js";
import { alertDialog, showDialog, hideDialog } from "./ui/dialog.js";
import { startOobe } from "./ui/oobe.js";
import { requestAdminPassword } from "./ui/uac.js";

const TASKBAR_PINNED = ["explorer", "calculator"];

// Apps that ask for the administrator password before they will open. These
// are the machine's own consoles; nothing inside them changes, the gate is the
// joke and the point.
const ADMIN_APPS = new Set(["aduc", "terminal", "regedit", "gpmc", "services"]);

const $ = (selector) => document.querySelector(selector);

const els = {};
let api = null;
let ui = null;
let selectedIcon = null;
let altTab = null;
let windowSounds = new Map();
const adminPrompts = new Set();
let resetStage = "verify";

// ---------------------------------------------------------------------------

export function initShell(platform) {
  api = platform;
  // The audio service is OS-level and owns the only AudioContext. It attaches
  // itself to the platform before any app context is built.
  api.audio = initAudio();
  ui = createUi({
    windows: () =>
      windowList().map((win) => ({ id: win.id, title: win.title, icon: win.icon, minimized: win.minimized })),
    endWindow: (id) => getWindow(id)?.handle.close(),
  });

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
  els.oobe = $("#oobe");

  applyPrefs();
  initMenus(els.ctxLayer);
  initWindows({
    stage: $("#windows"),
    onChange: () => {
      syncWindowSounds();
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
  $("#resetIcon").innerHTML = icon("$lock");
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
  bootProfile();

  // The platform clock is the only tick in the game; this throttles it to a
  // once-a-second repaint of the tray clock.
  let accumulator = 0;
  api.clock.onTick((dt) => {
    accumulator += dt;
    if (accumulator < 1) return;
    accumulator = 0;
    renderClock();
    if (!els.calendar.hidden) renderCalendar();
  });

  api.events.on("*", () => {
    renderTrust();
    renderStart();
    renderTaskbar();
  });
}

// ---------------------------------------------------------------------------
// apps
// ---------------------------------------------------------------------------

export function openApp(appId, options) {
  const app = getApp(appId);
  if (!app) return null;

  // Administrative consoles ask for the account password every time. The
  // recursion carries `elevated` so a successful prompt does not ask again.
  if (ADMIN_APPS.has(appId) && !options?.elevated) {
    return promptForAdmin(app, options);
  }

  closeStart();
  closeFlyouts();
  closeMenu();

  if (options?.elevated) {
    toast(app.title, "Running with administrative rights. Try to deserve it.", "$shield");
  }

  const [width, height] = app.size;
  const windowId = app.multi
    ? `${appId}:${options?.path || options?.name || options?.file || "window"}`
    : appId;
  const title = app.titleFor ? app.titleFor(options) : app.title;
  const position = app.right
    ? [Math.max(0, innerWidth - width - 16), app.position?.[1] ?? 20]
    : app.position || [undefined, undefined];

  let root = null;
  let context = null;

  return openWindow({
    id: windowId,
    appId: app.id,
    title,
    icon: app.icon,
    width,
    height,
    x: position[0],
    y: position[1],
    onClose: () => {
      if (root) app.unmount?.(root);
      context?.dispose();
    },
    build: (body, handle) => {
      body.classList.toggle("fixed", Boolean(app.fixed));
      root = document.createElement("div");
      root.className = `app app-${app.id}`;
      root.dataset.app = app.id;
      body.append(root);
      context = createAppContext({ platform: api, ui, app, handle, options, open: openApp });
      app.mount(root, context);
    },
  });
}

export function closeAllApps() {
  for (const win of windowList()) win.handle.close();
}

/**
 * The UAC gate. Returns a promise only for administrative apps, because the
 * caller has to wait for the password; ordinary launches stay synchronous.
 */
function promptForAdmin(app, options) {
  if (adminPrompts.has(app.id)) return null;
  adminPrompts.add(app.id);
  return requestAdminPassword(app)
    .then((allowed) => {
      adminPrompts.delete(app.id);
      if (!allowed) return null;
      return openApp(app.id, { ...options, elevated: true });
    })
    .catch((error) => {
      adminPrompts.delete(app.id);
      console.error(error);
      return null;
    });
}

// ---------------------------------------------------------------------------
// desktop icons
// ---------------------------------------------------------------------------

function renderDesktopIcons() {
  els.icons.innerHTML = "";
  for (const app of desktopApps()) {
    const button = document.createElement("button");
    button.className = "icon";
    button.dataset.app = app.id;
    button.title = app.title;
    button.innerHTML = `${icon(app.icon)}<span>${app.title}</span>`;
    button.addEventListener("pointerdown", () => selectIcon(button));
    button.addEventListener("dblclick", () => openApp(app.id));
    button.addEventListener("click", (event) => {
      // Touch and small screens do not do double-click; a second tap opens.
      if (event.detail === 0 || matchMedia("(pointer: coarse)").matches) openApp(app.id);
    });
    button.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      selectIcon(button);
      iconMenu(app, event.clientX, event.clientY);
    });
    els.icons.append(button);
  }
}

function selectIcon(node) {
  for (const other of els.icons.querySelectorAll(".icon")) other.classList.remove("selected");
  node.classList.add("selected");
  selectedIcon = node;
}

function iconMenu(app, x, y) {
  const items = [{ label: "Open", onClick: () => openApp(app.id) }];
  if (ADMIN_APPS.has(app.id)) {
    items.push({ label: "Run as administrator", icon: "$shield", shortcut: "Admin", onClick: () => openApp(app.id) });
  }
  items.push(
    { separator: true },
    { label: "Cut", icon: "cut", disabled: true },
    { label: "Copy", icon: "copy", disabled: true },
    { separator: true },
    { label: "Delete", icon: "trash", onClick: () => toast("Desktop", "Access denied. IT keeps these.", "bin") },
    { separator: true },
    {
      label: "Properties",
      onClick: () =>
        alertDialog(
          app.title,
          `Type: Application\nTarget: "C:\\Program Files\\Halcyon\\Workstation\\Apps\\${app.id}.exe"\nStart in: C:\\Program Files\\Halcyon\\Workstation\\Apps\nSize: ${app.size[0]} × ${app.size[1]}`,
        ),
    },
  );
  openMenu(x, y, items);
}

function wireDesktop() {
  els.desktop.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    if (event.target.closest(".win") || event.target.closest(".icon")) return;
    for (const other of els.icons.querySelectorAll(".icon")) other.classList.remove("selected");
    selectedIcon = null;
    closeStart();
    closeFlyouts();
    closeMenu();
    if (menuOpen()) return;

    const rect = els.desktop.getBoundingClientRect();
    const marquee = $("#marquee");
    const start = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    let moved = false;
    marquee.hidden = true;

    const move = (moveEvent) => {
      const cx = moveEvent.clientX - rect.left;
      const cy = moveEvent.clientY - rect.top;
      if (Math.abs(cx - start.x) + Math.abs(cy - start.y) > 4) moved = true;
      if (!moved) return;
      marquee.hidden = false;
      marquee.style.cssText = `left:${Math.min(start.x, cx)}px;top:${Math.min(start.y, cy)}px;width:${Math.abs(cx - start.x)}px;height:${Math.abs(cy - start.y)}px;`;
      const box = marquee.getBoundingClientRect();
      for (const node of els.icons.querySelectorAll(".icon")) {
        const nodeRect = node.getBoundingClientRect();
        const hit =
          nodeRect.left < box.right && nodeRect.right > box.left && nodeRect.top < box.bottom && nodeRect.bottom > box.top;
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

  els.desktop.addEventListener("contextmenu", (event) => {
    if (event.target.closest(".win") || event.target.closest(".icon")) return;
    event.preventDefault();
    desktopMenu(event.clientX, event.clientY);
  });
}

function desktopMenu(x, y) {
  openMenu(x, y, [
    {
      label: "View",
      submenu: [
        { label: "Large icons", checked: false, onClick: () => toast("Desktop", "Your icons are fine as they are.", "monitor") },
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
    { label: "Refresh", icon: "$refresh", shortcut: "F5", onClick: () => toast("Desktop", "Refreshed. Nothing changed.", "monitor") },
    { separator: true },
    {
      label: "New",
      submenu: [
        { label: "Folder", icon: "folder", onClick: () => toast("Desktop", "Folders are made by Facilities. Open a ticket.", "folder") },
        {
          label: "Text document",
          icon: "notepad",
          onClick: () => {
            openApp("notepad", { path: "C:/Users/m.hayes/Desktop", name: "New Text Document.txt" });
            toast("Desktop", "New Text Document.txt created.", "notepad");
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

// One diff over the window manager's public list gives us open/minimise/close
// sounds without teaching wm.js about audio.
function syncWindowSounds() {
  const next = new Map(windowList().map((win) => [win.id, win.minimized]));

  for (const [id, minimized] of next) {
    if (!windowSounds.has(id)) api.audio?.play("window.open", { gain: 0.85 });
    else if (minimized && !windowSounds.get(id)) api.audio?.play("window.minimise");
  }
  for (const id of windowSounds.keys()) {
    if (!next.has(id)) api.audio?.play("window.close", { gain: 0.85 });
  }

  windowSounds = next;
  // More windows is the only OS-level load signal the shell has; ambience and
  // the fan rise a little with it.
  api.audio?.setLoad(Math.min(1, next.size / 7));
}

function renderTaskbar() {
  const open = windowList();
  const byId = new Map(open.map((win) => [win.id, win]));
  const front = open.filter((win) => !win.minimized).pop();
  els.tbApps.innerHTML = "";

  const makeButton = (appId, title, ico, win) => {
    const button = document.createElement("button");
    button.className = `tb-app${win ? " is-open" : ""}${win && front?.id === win.id ? " is-active" : ""}`;
    button.innerHTML = `${icon(ico)}<span>${title}</span>`;
    button.title = title;
    button.addEventListener("click", () => {
      if (win) taskbarClick(win.id);
      else openApp(appId);
    });
    button.addEventListener("contextmenu", (event) => {
      event.preventDefault();
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
      openMenu(event.clientX, event.clientY, items);
    });
    els.tbApps.append(button);
  };

  for (const appId of TASKBAR_PINNED) {
    const app = getApp(appId);
    if (!app) continue;
    makeButton(appId, app.title, app.icon, byId.get(appId));
  }
  for (const win of open) {
    if (TASKBAR_PINNED.includes(win.id)) continue;
    makeButton(win.appId, win.title, win.icon, win);
  }
}

function renderClock() {
  const now = new Date();
  $("#clockTime").textContent = api?.clock ? api.clock.timeText() : "09:00";
  $("#clockDate").textContent = now.toLocaleDateString("en-GB");
  const lockTime = $("#lockTime");
  if (lockTime) lockTime.textContent = api?.clock ? api.clock.timeText() : "09:00";
  const lockDate = $("#lockDate");
  if (lockDate) lockDate.textContent = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

function wireTaskbar() {
  $("#startBtn").addEventListener("click", (event) => {
    event.stopPropagation();
    toggleStart();
  });
  $("#searchBtn").addEventListener("click", (event) => {
    event.stopPropagation();
    closeFlyouts();
    showStart(true);
    $("#startSearch").focus();
  });
  $("#taskviewBtn").addEventListener("click", (event) => {
    event.stopPropagation();
    toggleTaskView();
  });
  $("#quickBtn").addEventListener("click", (event) => {
    event.stopPropagation();
    closeStart();
    toggleFlyout(els.quick, event.currentTarget);
  });
  $("#clockBtn").addEventListener("click", (event) => {
    event.stopPropagation();
    closeStart();
    renderCalendar();
    toggleFlyout(els.calendar, event.currentTarget);
  });
  $("#trustBtn").addEventListener("click", (event) => {
    event.stopPropagation();
    closeStart();
    renderTrust();
    toggleFlyout(els.trustPanel, event.currentTarget);
  });
  $("#showDesktopBtn").addEventListener("click", () => {
    for (const win of windowList()) minimiseWindow(win.id);
    closeStart();
    closeFlyouts();
  });
  $("#taskbar").addEventListener("contextmenu", (event) => {
    if (event.target.closest(".tb-app")) return;
    event.preventDefault();
    openMenu(event.clientX, event.clientY, [
      { label: "Task Mangler", icon: "taskmgr", onClick: () => openApp("taskmanager") },
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

function installedSoftwareEntries() {
  const technicianId = api.world.session.current().technicianId;
  const machine = api.world.machines.byOwner(technicianId);
  if (!machine) return [];
  return api.world.machines.installedSoftware(machine.id).map((software) => ({
    id: `software:${software.id}`,
    title: software.name,
    icon: "settings",
    software,
  }));
}

function renderStart(query = "") {
  const term = query.trim().toLowerCase();
  const apps = pinnedApps()
    .filter((app) => !term || app.title.toLowerCase().includes(term))
    .map((app) => ({ id: app.id, title: app.title, icon: app.icon, app: true }));

  const software = installedSoftwareEntries().filter(
    (entry) => !term || entry.title.toLowerCase().includes(term),
  );

  els.startGrid.innerHTML = "";
  for (const entry of [...apps, ...software]) {
    const button = document.createElement("button");
    button.className = "start-app";
    button.dataset.app = entry.id;
    button.title = entry.title;
    button.innerHTML = `${icon(entry.icon)}<span>${entry.title}</span>`;
    button.addEventListener("click", () => {
      if (entry.app) {
        openApp(entry.id);
      } else {
        closeStart();
        toast(entry.title, "This app is managed by Halcyon IT. Contact the service desk for access.", "settings");
      }
    });
    els.startGrid.append(button);
  }
  if (!apps.length && !software.length) {
    els.startGrid.append(el(`<div class="muted tiny" style="grid-column:1/-1;padding:10px">No apps match "${escapeHtml(query)}".</div>`));
  }

  const docs = recentDocuments().filter((doc) => !term || doc.name.toLowerCase().includes(term));
  els.startRecent.innerHTML = "";
  for (const doc of docs) {
    const button = document.createElement("button");
    button.className = "recent-item";
    button.innerHTML = `${icon(doc.icon)}<span><b>${escapeHtml(doc.name)}</b><small>${escapeHtml(doc.where)}</small></span>`;
    button.addEventListener("click", () => {
      if (doc.app) openApp(doc.app);
      else openApp("notepad", { path: doc.path, name: doc.name });
    });
    els.startRecent.append(button);
  }
}

function recentDocuments() {
  const docs = [];
  const desktop = api.world.files.list("C:/Users/m.hayes/Desktop").filter((file) => file.kind === "text").slice(0, 2);
  for (const file of desktop) {
    docs.push({ name: file.name, where: "Desktop", icon: "notepad", path: file.path });
  }
  docs.push(
    { name: "Policy Handbook", where: "Recent", icon: "book", app: "handbook" },
    { name: "Today's briefing", where: "Mail", icon: "mail", app: "mail" },
    { name: "Task Mangler", where: "System", icon: "taskmgr", app: "taskmanager" },
  );
  return docs;
}

function wireStart() {
  els.startSearch.addEventListener("input", () => renderStart(els.startSearch.value));
  $("#allAppsBtn").addEventListener("click", () => {
    els.startSearch.value = "";
    renderStart("");
    els.startSearch.focus();
    toast("Start", "These are all the apps this machine has. It is a work laptop.", "folder");
  });
  $("#userBtn").addEventListener("click", () => {
    const account = getAccount();
    if (!account) return;
    const changed = account.passwordChangedAt
      ? new Date(account.passwordChangedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
      : "the day you set it up";
    showDialog({
      html: `
        <h2>${escapeHtml(account.displayName)}</h2>
        <div class="sub">${escapeHtml(account.username)}@HALCYON · Administrator</div>
        <p>This account can run anything as administrator, including the things you were told not to run.</p>
        <p class="muted tiny">Password last changed: ${escapeHtml(changed)}<br>
        Recovery question: ${escapeHtml(account.recovery?.question || "not set")}</p>
        <div class="row">
          <button class="btn" data-account-close>Close</button>
          <button class="btn primary" data-account-reset>Reset password</button>
        </div>`,
      wire: (card) => {
        card.querySelector("[data-account-close]").addEventListener("click", () => hideDialog());
        card.querySelector("[data-account-reset]").addEventListener("click", () => {
          hideDialog();
          lockScreen();
          showReset();
        });
      },
    });
  });
  $("#powerBtn").addEventListener("click", (event) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    openMenu(rect.left - 60, rect.top - 172, [
      { label: "Lock", icon: "$lock", onClick: () => lockScreen() },
      { label: "Sign out", icon: "$user", onClick: () => lockScreen() },
      { separator: true },
      { label: "Restart", icon: "$refresh", onClick: () => restart("Restarting") },
      { label: "Shut down", icon: "$power", onClick: () => restart("Shutting down") },
    ]);
  });
  document.addEventListener("pointerdown", (event) => {
    if (!els.start.hidden && !els.start.contains(event.target) && !event.target.closest("#startBtn, #searchBtn")) closeStart();
    if (!els.quick.hidden && !els.quick.contains(event.target) && !event.target.closest("#quickBtn")) closeFlyouts();
    if (!els.calendar.hidden && !els.calendar.contains(event.target) && !event.target.closest("#clockBtn")) closeFlyouts();
    if (!els.trustPanel.hidden && !els.trustPanel.contains(event.target) && !event.target.closest("#trustBtn")) closeFlyouts();
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
  api.audio?.play("logout");
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
  bindSlider($("#brightRange"), (value) => {
    $("#screen").style.filter = `brightness(${0.55 + (Number(value) / 100) * 0.65})`;
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
  const overview = api?.session?.overview();
  if (!overview) return;
  $("#trustValue").textContent = String(overview.trust);
  $("#trustBtn").classList.toggle("low", overview.trust <= 40);
  const big = $("#trustBig");
  if (big) big.textContent = String(overview.trust);
  const rows = $("#trustRows");
  if (rows) {
    const wrong = api.world.tickets.resolvedOn(overview.day).filter((ticket) => !ticket.correct).length;
    rows.innerHTML = `
      <div><span>Day</span><b>${overview.day} of ${overview.maxDay}</b></div>
      <div><span>Tickets answered</span><b>${overview.answered}/${overview.total}</b></div>
      <div><span>Mistakes today</span><b>${wrong}</b></div>
      <div><span>Trust</span><b>${overview.trust}</b></div>`;
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
      <div class="tv-card-top">${icon(win.icon)}<span>${escapeHtml(win.title)}</span></div>
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
    grid.append(el(`<div class="app-empty"><p class="muted">No open windows.</p></div>`));
  }
}

function wireKeyboard() {
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeStart();
      closeFlyouts();
      els.taskview.hidden = true;
      $("#taskviewBtn").classList.remove("is-active");
    }
    if (event.key === "Tab" && event.altKey) {
      event.preventDefault();
      cycleAltTab(event.shiftKey ? -1 : 1);
    }
  });
  window.addEventListener("keyup", (event) => {
    if (event.key === "Alt" && altTab) commitAltTab();
  });
  window.addEventListener("blur", () => altTab && commitAltTab());
}

function cycleAltTab(direction) {
  const windows = windowList();
  if (windows.length < 1) return;
  if (!altTab) {
    altTab = { index: windows.length - 1, ids: windows.map((win) => win.id) };
    $("#altTab").hidden = false;
  }
  altTab.index = (altTab.index + direction + windows.length) % windows.length;
  const row = $("#altTabRow");
  row.innerHTML = "";
  windows.forEach((win, index) => {
    const item = document.createElement("button");
    item.className = `alttab-item${index === altTab.index ? " active" : ""}`;
    item.innerHTML = `${icon(win.icon)}<span>${escapeHtml(win.title)}</span>`;
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
// first run, lock screen and sign-in
// ---------------------------------------------------------------------------

function bootProfile() {
  const account = getAccount();
  paintAccount(account);
  if (!account) {
    beginOobe();
    return;
  }
  els.lock.hidden = false;
  showLockBottom();
  applyPrefs();
}

function beginOobe() {
  els.lock.hidden = true;
  els.oobe.hidden = false;
  els.oobe.classList.remove("gone");
  startOobe(els.oobe, {
    onComplete: (account) => {
      paintAccount(account);
      els.oobe.classList.add("gone");
      setTimeout(() => {
        els.oobe.hidden = true;
        els.oobe.classList.remove("gone");
      }, 280);
      enterDesktop();
    },
  });
}

function paintAccount(account = getAccount()) {
  const name = account?.displayName || "Morgan Hayes";
  const logon = account?.username || "m.hayes";
  $("#lockName").textContent = name;
  $("#lockLogon").textContent = `HALCYON\\${logon}`;
  $("#signinName").textContent = name;
  $("#signinLogon").textContent = `HALCYON\\${logon}`;
  $("#userName").textContent = logon;
  $("#lockUser").title = `${name} (${logon})`;
  $("#resetQuestion").textContent = account?.recovery?.question || "No recovery question is set on this account.";
}

function showLockBottom() {
  $("#lockBottom").hidden = false;
  $("#lockSignin").hidden = true;
  $("#lockReset").hidden = true;
  $("#lockError").textContent = "";
  $("#resetError").textContent = "";
  $("#lockPassword").value = "";
  $("#lockUser").focus({ preventScroll: true });
}

function showSignin({ focus = true } = {}) {
  const account = getAccount();
  if (!account) {
    beginOobe();
    return;
  }
  paintAccount(account);
  $("#lockBottom").hidden = true;
  $("#lockSignin").hidden = false;
  $("#lockReset").hidden = true;
  $("#lockError").textContent = "";
  $("#lockPassword").value = "";
  if (focus) $("#lockPassword").focus();
}

function showReset() {
  const account = getAccount();
  if (!account) return;
  resetStage = "verify";
  paintResetStage();
  $("#lockBottom").hidden = true;
  $("#lockSignin").hidden = true;
  $("#lockReset").hidden = false;
  $("#resetError").textContent = "";
  $("#resetAnswer").value = "";
  $("#resetNew").value = "";
  $("#resetConfirm").value = "";
  $("#resetAnswer").focus();
}

function paintResetStage() {
  for (const node of $("#resetForm").querySelectorAll("[data-reset-step]")) {
    node.hidden = node.dataset.resetStep !== resetStage;
  }
  $("#resetIcon").innerHTML = icon(resetStage === "done" ? "$check" : "$lock");
  $("#resetIntro").hidden = resetStage === "done";
  $("#resetCancel").hidden = resetStage === "done";
  $("#resetGo").textContent = resetStage === "verify" ? "Verify" : resetStage === "new" ? "Change password" : "Back to sign in";
}

function submitReset(event) {
  event.preventDefault();
  const account = getAccount();
  if (!account) return;
  const error = $("#resetError");
  error.textContent = "";

  if (resetStage === "verify") {
    const answer = $("#resetAnswer").value;
    if (!answer.trim()) {
      error.textContent = "Enter the answer you gave during setup.";
      $("#resetAnswer").focus();
      return;
    }
    if (!verifyRecovery(answer, account)) {
      error.textContent = "That is not the answer on file. The question was chosen during setup.";
      $("#resetAnswer").select();
      return;
    }
    resetStage = "new";
    paintResetStage();
    $("#resetNew").focus();
    return;
  }

  if (resetStage === "new") {
    const password = $("#resetNew").value;
    if (password.length < MIN_PASSWORD_LENGTH) {
      error.textContent = `The password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
      $("#resetNew").focus();
      return;
    }
    if (password !== $("#resetConfirm").value) {
      error.textContent = "The passwords do not match. Try again, slower.";
      $("#resetConfirm").focus();
      return;
    }
    setAccountPassword(password);
    $("#lockPassword").value = "";
    resetStage = "done";
    paintResetStage();
    $("#resetGo").focus();
    return;
  }

  showSignin();
}

function attemptSignIn() {
  const account = getAccount();
  if (!account) {
    beginOobe();
    return;
  }
  const input = $("#lockPassword");
  const error = $("#lockError");
  if (!input.value) {
    error.textContent = "Enter your password.";
    input.focus();
    return;
  }
  if (!verifyPassword(input.value, account)) {
    error.textContent = "The password is incorrect. Try again.";
    input.value = "";
    input.focus();
    return;
  }
  error.textContent = "";
  input.value = "";
  enterDesktop();
}

function wireLock() {
  $("#lockUser").addEventListener("click", () => showSignin());
  $("#lockForm").addEventListener("submit", (event) => {
    event.preventDefault();
    attemptSignIn();
  });
  $("#forgotBtn").addEventListener("click", showReset);
  $("#lockBack").addEventListener("click", showLockBottom);
  $("#lockPassword").addEventListener("input", () => ($("#lockError").textContent = ""));
  $("#resetForm").addEventListener("submit", submitReset);
  $("#resetCancel").addEventListener("click", () => showSignin());
  $("#resetAnswer").addEventListener("input", () => ($("#resetError").textContent = ""));
  $("#resetNew").addEventListener("input", () => ($("#resetError").textContent = ""));
  $("#resetConfirm").addEventListener("input", () => ($("#resetError").textContent = ""));

  // Escape backs out of the sign-in and reset panels, never off the lock.
  els.lock.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!$("#lockReset").hidden) {
      event.preventDefault();
      showSignin();
    } else if (!$("#lockSignin").hidden) {
      event.preventDefault();
      showLockBottom();
    }
  });
}

export function lockScreen() {
  closeStart();
  closeFlyouts();
  closeMenu();
  const account = getAccount();
  if (!account) {
    beginOobe();
    return;
  }
  api?.audio?.play("lock");
  api?.audio?.stopAmbience();
  paintAccount(account);
  els.lock.hidden = false;
  els.lock.classList.remove("gone");
  showLockBottom();
  applyPrefs();
  renderClock();
}

function enterDesktop() {
  if (els.lock.classList.contains("gone")) return;
  closeStart();
  closeFlyouts();
  closeMenu();
  els.lock.classList.add("gone");
  setTimeout(() => {
    els.lock.hidden = true;
    els.lock.classList.remove("gone");
  }, 320);
  api?.audio?.unlock();
  api?.audio?.play("boot");
  api?.onSignIn?.();
  api?.audio?.startAmbience("office");
}

/** Kept as the shell's sign-in verb; the password is checked in attemptSignIn. */
export function signIn() {
  attemptSignIn();
}

// ---------------------------------------------------------------------------
// toasts
// ---------------------------------------------------------------------------

export function toast(title, body, ico = "ticket") {
  return showToast(title, body, ico);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
}

function el(html) {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
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
  renderStart();
}
