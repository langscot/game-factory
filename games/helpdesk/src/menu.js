// Context menus, the Windows kind: rounded panel, separators, shortcuts,
// submenus that open on hover, close on click-away or Escape.

import { icon } from "./icons.js";

let layer = null;
let stack = [];

export function initMenus(layerEl) {
  layer = layerEl;
  layer.addEventListener("pointerdown", (ev) => {
    if (ev.target === layer) closeMenu();
  });
  window.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && stack.length) {
      ev.stopPropagation();
      closeMenu();
    }
  });
  window.addEventListener("blur", closeMenu);
  document.addEventListener("scroll", closeMenu, true);
}

export function menuOpen() {
  return stack.length > 0;
}

/**
 * @param {number} x
 * @param {number} y
 * @param {Array} items { label, icon, shortcut, disabled, danger, separator, onClick, submenu, checked }
 */
export function openMenu(x, y, items) {
  closeMenu();
  if (!layer) return;
  layer.hidden = false;
  addPanel(items, x, y, 0);
}

export function closeMenu() {
  for (const panel of stack) panel.remove();
  stack = [];
  if (layer) layer.hidden = true;
}

function addPanel(items, x, y, level) {
  const panel = document.createElement("div");
  panel.className = "ctx";
  panel.dataset.level = String(level);

  for (const item of items) {
    if (item.separator) {
      const sep = document.createElement("div");
      sep.className = "ctx-sep";
      panel.append(sep);
      continue;
    }
    const btn = document.createElement("button");
    btn.className = `ctx-item${item.disabled ? " disabled" : ""}${item.danger ? " danger" : ""}`;
    btn.type = "button";
    const ico = item.checked ? icon("$check") : item.icon ? icon(item.icon) : "";
    btn.innerHTML = `
      <span class="ctx-ico">${ico}</span>
      <span class="ctx-label"></span>
      <span class="ctx-key">${item.submenu ? icon("$chevron") : (item.shortcut || "")}</span>`;
    btn.querySelector(".ctx-label").textContent = item.label;

    if (item.submenu && !item.disabled) {
      btn.addEventListener("pointerenter", () => {
        const rect = btn.getBoundingClientRect();
        addPanel(item.submenu, rect.right - 4, rect.top - 5, level + 1);
      });
    } else {
      btn.addEventListener("pointerenter", () => closeAbove(level));
    }

    if (!item.disabled && !item.submenu) {
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        closeMenu();
        item.onClick?.();
      });
    }
    panel.append(btn);
  }

  layer.append(panel);
  stack.push(panel);
  position(panel, x, y, level);
  return panel;
}

function closeAbove(level) {
  for (const panel of stack) {
    if (Number(panel.dataset.level) > level) {
      panel.remove();
      stack = stack.filter((p) => p !== panel);
    }
  }
}

function position(panel, x, y, level) {
  const pad = 6;
  const rect = panel.getBoundingClientRect();
  let left = x;
  let top = y;
  if (level > 0) {
    // Submenus flip to the left of their parent when there is no room.
    if (left + rect.width > innerWidth - pad) left = x - rect.width - 8;
  } else if (left + rect.width > innerWidth - pad) {
    left = Math.max(pad, innerWidth - rect.width - pad);
  }
  if (top + rect.height > innerHeight - pad) top = Math.max(pad, innerHeight - rect.height - pad);
  panel.style.left = `${Math.max(pad, left)}px`;
  panel.style.top = `${Math.max(pad, top)}px`;
}
