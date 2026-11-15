// A very small window manager. Apps get handed an empty <div> and fill it;
// this file only owns moving, focus, minimising and stacking.

const OPEN = new Map();
let stage = null;
let notify = () => {};
let layer = 30;
let cascade = 0;

export function initWindows({ stage: el, onChange }) {
  stage = el;
  notify = onChange || (() => {});
}

export function windowList() {
  return [...OPEN.values()];
}

/** Open a window, or bring it forward if it already exists. */
export function openWindow(spec) {
  const existing = OPEN.get(spec.id);
  if (existing) {
    restore(existing);
    focus(existing);
    return existing.handle;
  }

  const el = document.createElement("section");
  el.className = "win is-open";
  el.dataset.id = spec.id;
  const w = Math.min(spec.width || 640, innerWidth - 16);
  const h = Math.min(spec.height || 460, innerHeight - 80);
  el.style.width = `${w}px`;
  el.style.height = `${h}px`;
  const wantX = spec.x ?? 60 + cascade * 26;
  const wantY = spec.y ?? 24 + cascade * 22;
  el.style.left = `${Math.max(8, Math.min(wantX, innerWidth - w - 8))}px`;
  el.style.top = `${Math.max(4, Math.min(wantY, innerHeight - 70))}px`;
  cascade = (cascade + 1) % 6;

  const bar = document.createElement("header");
  bar.className = "titlebar";
  bar.innerHTML = `
    <span class="tb-ico"></span>
    <span class="tb-name"></span>
    <div class="win-btns">
      <button data-act="min" title="Minimise" aria-label="Minimise">&#8211;</button>
      <button data-act="max" title="Maximise" aria-label="Maximise">&#9744;</button>
      <button data-act="close" title="Close" aria-label="Close">&#10005;</button>
    </div>`;
  bar.querySelector(".tb-ico").textContent = spec.icon || "▣";
  bar.querySelector(".tb-name").textContent = spec.title || spec.id;

  const body = document.createElement("div");
  body.className = "win-body";

  el.append(bar, body);
  stage.append(el);

  const win = {
    id: spec.id,
    title: spec.title || spec.id,
    icon: spec.icon || "▣",
    el,
    body,
    minimized: false,
    maximized: false,
    onClose: spec.onClose,
  };
  win.handle = {
    id: win.id,
    body,
    el,
    setTitle: (text) => {
      win.title = text;
      bar.querySelector(".tb-name").textContent = text;
      notify();
    },
    close: () => closeWindow(win.id),
    focus: () => focus(win),
  };
  OPEN.set(spec.id, win);

  el.addEventListener("pointerdown", () => focus(win), true);

  bar.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button")) return;
    focus(win);
    beginDrag(win, event);
  });
  bar.addEventListener("dblclick", (event) => {
    if (!event.target.closest("button")) toggleMax(win);
  });
  bar.querySelector('[data-act="min"]').addEventListener("click", () => minimise(win));
  bar.querySelector('[data-act="max"]').addEventListener("click", () => toggleMax(win));
  bar.querySelector('[data-act="close"]').addEventListener("click", () => closeWindow(win.id));

  if (spec.build) spec.build(body, win.handle);

  focus(win);
  cascade = (cascade + 1) % 6;
  return win.handle;
}

export function focusWindow(id) {
  const win = OPEN.get(id);
  if (win) {
    restore(win);
    focus(win);
  }
}

export function closeWindow(id) {
  const win = OPEN.get(id);
  if (!win) return;
  OPEN.delete(id);
  if (win.onClose) win.onClose();
  win.el.classList.remove("is-open");
  win.el.remove();
  const next = [...OPEN.values()].sort((a, b) => a.el.style.zIndex - b.el.style.zIndex).pop();
  if (next) focus(next);
  notify();
}

export function closeAllWindows() {
  for (const id of [...OPEN.keys()]) closeWindow(id);
}

function focus(win) {
  win.el.style.zIndex = ++layer;
  for (const other of OPEN.values()) other.el.classList.toggle("is-focused", other === win);
  notify();
}

function minimise(win) {
  win.el.classList.remove("is-open");
  win.minimized = true;
  const next = [...OPEN.values()].filter((w) => w !== win).pop();
  if (next) focus(next);
  notify();
}

function restore(win) {
  if (!win.minimized) return;
  win.minimized = false;
  win.el.classList.add("is-open");
}

function toggleMax(win) {
  win.maximized = !win.maximized;
  win.el.classList.toggle("is-max", win.maximized);
}

function beginDrag(win, event) {
  if (innerWidth <= 720 || win.maximized) return;
  const el = win.el;
  const rect = el.getBoundingClientRect();
  const dx = event.clientX - rect.left;
  const dy = event.clientY - rect.top;
  const bar = event.currentTarget;

  // A stale pointer id (release outside the window) would throw here.
  try {
    bar.setPointerCapture(event.pointerId);
  } catch {}

  const move = (ev) => {
    const x = Math.min(Math.max(-rect.width + 90, ev.clientX - dx), innerWidth - 90);
    const y = Math.min(Math.max(0, ev.clientY - dy), innerHeight - 70);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  };
  const up = () => {
    bar.removeEventListener("pointermove", move);
    bar.removeEventListener("pointerup", up);
    bar.removeEventListener("pointercancel", up);
  };
  bar.addEventListener("pointermove", move);
  bar.addEventListener("pointerup", up);
  bar.addEventListener("pointercancel", up);
}
