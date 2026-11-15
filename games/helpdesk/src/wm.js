// The window manager: move, resize, snap to edges, maximise, minimise, stack.
// Apps only ever get a body element handed to them.

import { openMenu } from "./menu.js";
import { icon } from "./icons.js";
import { dismissDialogsFor } from "./ui/dialog.js";

const MIN_W = 280;
const MIN_H = 160;
const SNAP_EDGE = 10;

const OPEN = new Map();
let stage = null;
let layer = 10;
let notify = () => {};
let cascade = 0;
let preview = null;

const CAPTION = {
  min: '<svg viewBox="0 0 10 10"><path d="M0 5h10" stroke="currentColor" stroke-width="1.1"/></svg>',
  max: '<svg viewBox="0 0 10 10"><rect x="0.6" y="0.6" width="8.8" height="8.8" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>',
  restore:
    '<svg viewBox="0 0 10 10"><rect x="0.6" y="2.6" width="6.8" height="6.8" rx="1.2" fill="none" stroke="currentColor" stroke-width="1.1"/><path d="M3 2.4V1.8A1.2 1.2 0 0 1 4.2.6h4.2A1.2 1.2 0 0 1 9.6 1.8v4.2A1.2 1.2 0 0 1 8.4 7.2h-.6" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>',
  close: '<svg viewBox="0 0 10 10"><path d="M0.8 0.8l8.4 8.4M9.2 0.8l-8.4 8.4" stroke="currentColor" stroke-width="1.15"/></svg>',
};

export function initWindows({ stage: el, onChange }) {
  stage = el;
  notify = onChange || (() => {});
}

export function windowList() {
  return [...OPEN.values()].sort((a, b) => a.z - b.z);
}

export function topWindow() {
  const list = windowList();
  return list[list.length - 1] || null;
}

export function openWindow(spec) {
  const existing = OPEN.get(spec.id);
  if (existing) {
    unminimise(existing);
    focus(existing);
    return existing.handle;
  }

  const stageRect = stage.getBoundingClientRect();
  const width = Math.min(spec.width || 640, stageRect.width - 12);
  const height = Math.min(spec.height || 460, stageRect.height - 12);
  const left = Math.max(0, Math.min(spec.x ?? 40 + cascade * 26, stageRect.width - width - 8));
  const top = Math.max(0, Math.min(spec.y ?? 24 + cascade * 24, stageRect.height - height - 8));
  cascade = (cascade + 1) % 8;

  const el = document.createElement("section");
  el.className = "win";
  el.dataset.id = spec.id;
  el.style.cssText = `left:${left}px;top:${top}px;width:${width}px;height:${height}px;`;

  const bar = document.createElement("header");
  bar.className = "win-titlebar";
  bar.innerHTML = `
    <span class="tb-icon"></span>
    <span class="tb-title"></span>
    <div class="win-caption">
      <button data-act="min" title="Minimise" aria-label="Minimise">${CAPTION.min}</button>
      <button data-act="max" title="Maximise" aria-label="Maximise">${CAPTION.max}</button>
      <button data-act="close" title="Close" aria-label="Close">${CAPTION.close}</button>
    </div>`;
  bar.querySelector(".tb-icon").innerHTML = icon(spec.icon || "folder");
  bar.querySelector(".tb-title").textContent = spec.title || spec.id;

  const body = document.createElement("div");
  body.className = "win-body";

  el.append(bar, body);

  for (const dir of ["n", "s", "w", "e", "nw", "ne", "sw", "se"]) {
    const handle = document.createElement("div");
    handle.className = "rz";
    handle.dataset.dir = dir;
    el.append(handle);
  }

  stage.append(el);

  const win = {
    id: spec.id,
    title: spec.title || spec.id,
    icon: spec.icon || "folder",
    appId: spec.appId || spec.id,
    el,
    body,
    z: ++layer,
    minimized: false,
    maximized: false,
    snapped: null,
    restoreRect: null,
    minWidth: spec.minWidth || MIN_W,
    minHeight: spec.minHeight || MIN_H,
    onClose: spec.onClose,
  };
  win.handle = {
    id: win.id,
    body,
    el,
    title: win.title,
    setTitle(text) {
      win.title = text;
      win.handle.title = text;
      bar.querySelector(".tb-title").textContent = text;
      notify();
    },
    close: () => closeWindow(win.id),
    focus: () => focus(win),
    isMinimized: () => win.minimized,
  };

  OPEN.set(spec.id, win);
  el.addEventListener("pointerdown", () => focus(win), true);

  bar.addEventListener("pointerdown", (ev) => {
    if (ev.target.closest("button")) return;
    focus(win);
    beginDrag(win, ev, bar);
  });
  bar.addEventListener("dblclick", (ev) => {
    if (!ev.target.closest("button")) toggleMax(win);
  });
  bar.addEventListener("contextmenu", (ev) => {
    ev.preventDefault();
    systemMenu(win, ev.clientX, ev.clientY);
  });

  bar.querySelector('[data-act="min"]').addEventListener("click", () => minimise(win));
  bar.querySelector('[data-act="max"]').addEventListener("click", () => toggleMax(win));
  bar.querySelector('[data-act="close"]').addEventListener("click", () => closeWindow(win.id));

  for (const handle of el.querySelectorAll(".rz")) {
    handle.addEventListener("pointerdown", (ev) => {
      ev.stopPropagation();
      focus(win);
      beginResize(win, ev, handle.dataset.dir, handle);
    });
  }

  if (spec.build) spec.build(body, win.handle);

  focus(win);
  return win.handle;
}

export function closeWindow(id) {
  const win = OPEN.get(id);
  if (!win) return;
  OPEN.delete(id);
  win.onClose?.();
  dismissDialogsFor(win.el);
  win.el.remove();
  hidePreview();
  const next = [...OPEN.values()].filter((w) => !w.minimized).pop();
  if (next) focus(next);
  notify();
}

export function closeAllWindows() {
  for (const id of [...OPEN.keys()]) closeWindow(id);
}

export function focusWindow(id) {
  const win = OPEN.get(id);
  if (!win) return;
  unminimise(win);
  focus(win);
}

export function minimiseWindow(id) {
  const win = OPEN.get(id);
  if (win) minimise(win);
}

export function toggleMaximize(id) {
  const win = OPEN.get(id);
  if (win) toggleMax(win);
}

export function isOpen(id) {
  return OPEN.has(id);
}

export function getWindow(id) {
  return OPEN.get(id);
}

/** Taskbar click: focus, or minimise if it is already the front window. */
export function taskbarClick(id) {
  const win = OPEN.get(id);
  if (!win) return;
  const front = topWindow();
  if (win.minimized) {
    unminimise(win);
    focus(win);
  } else if (front === win && win.el.classList.contains("is-focused")) {
    minimise(win);
  } else {
    focus(win);
  }
}

// ---------------------------------------------------------------------------

function focus(win) {
  win.z = ++layer;
  win.el.style.zIndex = String(win.z);
  for (const other of OPEN.values()) other.el.classList.toggle("is-focused", other === win);
  notify();
}

function minimise(win) {
  win.minimized = true;
  win.el.classList.add("is-min");
  const next = [...OPEN.values()].filter((w) => w !== win && !w.minimized).pop();
  if (next) focus(next);
  notify();
}

function unminimise(win) {
  if (!win.minimized) return;
  win.minimized = false;
  win.el.classList.remove("is-min");
  notify();
}

function toggleMax(win) {
  if (win.maximized) restoreDown(win);
  else maximise(win);
}

function maximise(win) {
  if (!win.restoreRect) {
    win.restoreRect = {
      left: parseFloat(win.el.style.left) || 0,
      top: parseFloat(win.el.style.top) || 0,
      width: parseFloat(win.el.style.width) || 600,
      height: parseFloat(win.el.style.height) || 400,
    };
  }
  const rect = stage.getBoundingClientRect();
  win.maximized = true;
  win.snapped = null;
  win.el.classList.add("is-max");
  Object.assign(win.el.style, { left: "0px", top: "0px", width: `${rect.width}px`, height: `${rect.height}px` });
  syncCaption(win);
}

function restoreDown(win) {
  if (!win.maximized && !win.snapped) return;
  const r = win.restoreRect;
  win.maximized = false;
  win.snapped = null;
  win.el.classList.remove("is-max");
  if (r) Object.assign(win.el.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  syncCaption(win);
}

function syncCaption(win) {
  const btn = win.el.querySelector('[data-act="max"]');
  if (!btn) return;
  const max = win.maximized || !!win.snapped;
  btn.innerHTML = max ? CAPTION.restore : CAPTION.max;
  btn.title = max ? "Restore down" : "Maximise";
}

function snapTo(win, side) {
  const rect = stage.getBoundingClientRect();
  if (!win.restoreRect) {
    win.restoreRect = {
      left: parseFloat(win.el.style.left) || 0,
      top: parseFloat(win.el.style.top) || 0,
      width: parseFloat(win.el.style.width) || 600,
      height: parseFloat(win.el.style.height) || 400,
    };
  }
  win.maximized = false;
  win.el.classList.remove("is-max");
  win.snapped = side;
  const half = Math.round(rect.width / 2);
  const width = side === "left" || side === "right" ? half : rect.width;
  const height = side === "top" ? rect.height : rect.height;
  const left = side === "right" ? rect.width - half : 0;
  Object.assign(win.el.style, {
    left: `${left}px`,
    top: "0px",
    width: `${width}px`,
    height: `${height}px`,
  });
  syncCaption(win);
}

function systemMenu(win, x, y) {
  const maxed = win.maximized || !!win.snapped;
  openMenu(x, y, [
    { label: maxed ? "Restore" : "Maximise", icon: maxed ? "restore" : "max", onClick: () => (maxed ? restoreDown(win) : maximise(win)) },
    { label: "Minimise", icon: "min", onClick: () => minimise(win) },
    { separator: true },
    { label: "Move", disabled: true },
    { label: "Size", disabled: true },
    { separator: true },
    { label: "Close", icon: "close", shortcut: "Alt+F4", danger: true, onClick: () => closeWindow(win.id) },
  ]);
}

// ---------------------------------------------------------------------------
// dragging
// ---------------------------------------------------------------------------

function beginDrag(win, ev, bar) {
  const el = win.el;
  const rect = el.getBoundingClientRect();

  // Dragging a maximised window restores it under the cursor, like Windows.
  let offsetX = ev.clientX - rect.left;
  let offsetY = ev.clientY - rect.top;
  if (win.maximized && win.restoreRect) {
    const r = win.restoreRect;
    const ratio = offsetX / rect.width;
    restoreDown(win);
    offsetX = Math.min(r.width - 40, Math.max(40, r.width * ratio));
    offsetY = Math.min(r.height - 20, 18);
  } else if (win.snapped && win.restoreRect) {
    const r = win.restoreRect;
    const ratio = (ev.clientX - rect.left) / rect.width;
    restoreDown(win);
    offsetX = Math.min(r.width - 40, Math.max(40, r.width * ratio));
    offsetY = 18;
  }

  const stageRect = stage.getBoundingClientRect();
  let zone = null;

  const move = (e) => {
    const x = Math.min(Math.max(-(rect.width - 90), e.clientX - offsetX), innerWidth - 90);
    const y = Math.min(Math.max(0, e.clientY - offsetY), innerHeight - 60);
    el.style.left = `${x - stageRect.left}px`;
    el.style.top = `${y - stageRect.top}px`;

    zone = null;
    if (e.clientX <= stageRect.left + SNAP_EDGE) zone = "left";
    else if (e.clientX >= stageRect.right - SNAP_EDGE) zone = "right";
    else if (e.clientY <= stageRect.top + 4) zone = "top";
    showPreview(zone);
  };

  const up = () => {
    bar.removeEventListener("pointermove", move);
    bar.removeEventListener("pointerup", up);
    bar.removeEventListener("pointercancel", up);
    hidePreview();
    if (zone === "left" || zone === "right") snapTo(win, zone);
    else if (zone === "top") maximise(win);
  };

  bar.setPointerCapture(ev.pointerId);
  bar.addEventListener("pointermove", move);
  bar.addEventListener("pointerup", up);
  bar.addEventListener("pointercancel", up);
}

function showPreview(zone) {
  if (!preview) {
    preview = document.createElement("div");
    preview.className = "snap-preview";
    stage.append(preview);
  }
  if (!zone) {
    preview.hidden = true;
    return;
  }
  const rect = stage.getBoundingClientRect();
  preview.hidden = false;
  if (zone === "left") preview.style.cssText = `left:0;top:0;width:${rect.width / 2}px;height:${rect.height}px;`;
  else if (zone === "right") preview.style.cssText = `left:${rect.width / 2}px;top:0;width:${rect.width / 2}px;height:${rect.height}px;`;
  else preview.style.cssText = `left:0;top:0;width:${rect.width}px;height:${rect.height}px;`;
}

function hidePreview() {
  if (preview) preview.hidden = true;
}

// ---------------------------------------------------------------------------
// resizing
// ---------------------------------------------------------------------------

function beginResize(win, ev, dir, handle) {
  const start = {
    x: ev.clientX,
    y: ev.clientY,
    left: parseFloat(win.el.style.left) || 0,
    top: parseFloat(win.el.style.top) || 0,
    width: parseFloat(win.el.style.width) || 600,
    height: parseFloat(win.el.style.height) || 400,
  };
  if (win.maximized || win.snapped) restoreDown(win);
  const stageRect = stage.getBoundingClientRect();

  const move = (e) => {
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    let { left, top, width, height } = start;
    if (dir.includes("e")) width = Math.max(win.minWidth, start.width + dx);
    if (dir.includes("s")) height = Math.max(win.minHeight, start.height + dy);
    if (dir.includes("w")) {
      width = Math.max(win.minWidth, start.width - dx);
      left = start.left + (start.width - width);
    }
    if (dir.includes("n")) {
      height = Math.max(win.minHeight, start.height - dy);
      top = start.top + (start.height - height);
    }
    width = Math.min(width, stageRect.width - Math.max(0, left));
    height = Math.min(height, stageRect.height - Math.max(0, top));
    Object.assign(win.el.style, { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` });
  };
  const up = () => {
    handle.removeEventListener("pointermove", move);
    handle.removeEventListener("pointerup", up);
    handle.removeEventListener("pointercancel", up);
  };
  handle.setPointerCapture(ev.pointerId);
  handle.addEventListener("pointermove", move);
  handle.addEventListener("pointerup", up);
  handle.addEventListener("pointercancel", up);
}

/** Forget a remembered size when the viewport changes underneath us. */
export function relayout() {
  const rect = stage.getBoundingClientRect();
  for (const win of OPEN.values()) {
    if (win.maximized) {
      Object.assign(win.el.style, { width: `${rect.width}px`, height: `${rect.height}px` });
    } else if (win.snapped) {
      snapTo(win, win.snapped);
    }
  }
}

void icon;
