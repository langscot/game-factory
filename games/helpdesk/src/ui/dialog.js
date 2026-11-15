// The one dialog surface. Day summaries, app alerts and confirmations all use
// this, so they look like the same operating system and Escape/Enter work.
//
// A dialog can be scoped to an owner window. Then it mounts inside that window,
// dims only the window, and leaves the rest of the desktop usable. OS-level
// dialogs (day summary, sign-out) pass no owner and stay desktop-level.

import { esc } from "./dom.js";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** window element -> dialog surface. The desktop surface is keyed by <body>. */
const surfaces = new Map();
/** Bottom-to-top order, so Escape and hideDialog() pick the front dialog. */
const openOrder = [];

const isElement = (value) => value instanceof Element;

function hostFor(owner) {
  const candidate = isElement(owner) ? owner : owner?.el;
  return isElement(candidate) ? candidate : document.body;
}

function register(host, modal, card) {
  const surface = { host, modal, card, onDismiss: null, returnFocus: null };
  // Keys are handled per surface, so a dialog in one window never eats keys
  // pressed in another. Apps with custom key handling can stop propagation
  // before this bubble-phase listener sees it.
  modal.addEventListener("keydown", (event) => onKey(surface, event));
  surfaces.set(host, surface);
  return surface;
}

function createSurface(host) {
  const modal = document.createElement("div");
  // The static #modal in index.html stays the desktop surface; app dialogs get
  // their own scoped copy so they never share an element across windows.
  modal.className = host === document.body ? "modal" : "modal modal-window";
  modal.hidden = true;
  const card = document.createElement("div");
  card.className = "modal-card";
  modal.append(card);
  host.append(modal);
  return register(host, modal, card);
}

function desktopSurface() {
  const existing = document.querySelector("#modal");
  if (!existing) return createSurface(document.body);
  const card = existing.querySelector(".modal-card");
  if (!card) return createSurface(document.body);
  return register(document.body, existing, card);
}

function getSurface(owner) {
  const host = hostFor(owner);
  const cached = surfaces.get(host);
  if (cached && cached.modal.isConnected) return cached;
  if (cached) surfaces.delete(host);
  return host === document.body ? desktopSurface() : createSurface(host);
}

function markOpen(surface) {
  if (!openOrder.includes(surface)) openOrder.push(surface);
}

function markClosed(surface) {
  const index = openOrder.indexOf(surface);
  if (index >= 0) openOrder.splice(index, 1);
}

function frontSurface() {
  return openOrder[openOrder.length - 1] || null;
}

function closeSurface(surface) {
  if (!surface) return;
  surface.modal.hidden = true;
  surface.card.innerHTML = "";
  surface.card.style.width = "";
  surface.onDismiss = null;
  markClosed(surface);

  const back = surface.returnFocus;
  surface.returnFocus = null;
  if (back && back.isConnected && !surface.modal.contains(back)) back.focus({ preventScroll: true });
}

function dismiss(surface) {
  if (!surface) return;
  const handler = surface.onDismiss;
  closeSurface(surface);
  handler?.();
}

export function showDialog({ title, text, html, wire, owner = null, onDismiss = null }) {
  const surface = getSurface(owner);
  const body = html ?? `<h2>${esc(title)}</h2><p>${paragraphs(text)}</p>`;
  surface.card.innerHTML = html
    ? body
    : `${body}<div class="row"><button class="btn primary" data-dialog-ok>OK</button></div>`;

  surface.onDismiss = onDismiss;
  surface.returnFocus = isElement(document.activeElement) ? document.activeElement : null;
  surface.modal.hidden = false;
  markOpen(surface);

  surface.card.tabIndex = -1;
  surface.card.focus();
  surface.card.querySelector("[data-dialog-ok]")?.addEventListener("click", () => closeSurface(surface));
  wire?.(surface.card, surface);
  return surface.card;
}

/**
 * Hide the front dialog, or the one owned by `owner` when given. Callers from
 * an app go through the bound ui in context.js, so they never have to know
 * which window they belong to.
 */
export function hideDialog(owner) {
  if (owner) {
    const surface = surfaces.get(hostFor(owner));
    if (surface) closeSurface(surface);
    return;
  }
  closeSurface(frontSurface());
}

/** Settle and remove any dialog owned by a window that is going away. */
export function dismissDialogsFor(host) {
  const surface = surfaces.get(host);
  if (!surface) return;
  surfaces.delete(host);
  surface.returnFocus = null;
  dismiss(surface);
}

/** Wrap the shared ui so every app dialog is bound to its own window. */
export function bindDialogOwner(ui, owner) {
  return {
    ...ui,
    alert: (title, text, options = {}) => alertDialog(title, text, { ...options, owner }),
    confirm: (title, text, options = {}) => confirmDialog(title, text, { ...options, owner }),
    dialog: (options = {}) => showDialog({ ...options, owner }),
    closeDialog: () => hideDialog(owner),
  };
}

const paragraphs = (text) =>
  esc(text)
    .split("\n")
    .map((line) => line || "&nbsp;")
    .join("<br>");

export function alertDialog(title, text, { owner = null } = {}) {
  return new Promise((resolve) => {
    showDialog({
      owner,
      onDismiss: () => resolve(),
      html: `<h2>${esc(title)}</h2><p>${paragraphs(text)}</p>
        <div class="row"><button class="btn primary" data-dialog-ok>OK</button></div>`,
      wire: (node, surface) => {
        node.querySelector("[data-dialog-ok]").addEventListener("click", () => {
          closeSurface(surface);
          resolve();
        });
      },
    });
  });
}

export function confirmDialog(title, text, { ok = "OK", cancel = "Cancel", owner = null } = {}) {
  return new Promise((resolve) => {
    showDialog({
      owner,
      onDismiss: () => resolve(false),
      html: `<h2>${esc(title)}</h2><p>${paragraphs(text)}</p>
        <div class="row">
          <button class="btn" data-dialog-cancel>${esc(cancel)}</button>
          <button class="btn primary" data-dialog-ok>${esc(ok)}</button>
        </div>`,
      wire: (node, surface) => {
        node.querySelector("[data-dialog-cancel]").addEventListener("click", () => {
          closeSurface(surface);
          resolve(false);
        });
        node.querySelector("[data-dialog-ok]").addEventListener("click", () => {
          closeSurface(surface);
          resolve(true);
        });
      },
    });
  });
}

function onKey(surface, event) {
  if (surface.modal.hidden || !openOrder.includes(surface)) return;

  if (event.key === "Escape") {
    event.stopPropagation();
    event.preventDefault();
    dismiss(surface);
    return;
  }

  if (event.key === "Tab") {
    trapFocus(surface, event);
    return;
  }

  if (event.key === "Enter" && !event.target.closest("button, input, textarea, select")) {
    const ok = surface.card.querySelector("[data-dialog-ok]");
    if (ok) {
      event.preventDefault();
      ok.click();
    }
  }
}

function trapFocus(surface, event) {
  const focusable = [...surface.card.querySelectorAll(FOCUSABLE)].filter(
    (node) => node.getClientRects().length > 0,
  );
  if (!focusable.length) {
    event.preventDefault();
    surface.card.focus();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;

  if (!surface.card.contains(active)) {
    event.preventDefault();
    first.focus();
    return;
  }
  if (event.shiftKey && (active === first || active === surface.card)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}
