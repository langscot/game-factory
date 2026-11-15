// The one dialog surface. Day summaries, app alerts and confirmations all use
// this, so they look like the same operating system and Escape/Enter work.

import { esc } from "./dom.js";

let modal = null;
let card = null;
let onDismiss = null;

function nodes() {
  if (modal && modal.isConnected) return { modal, card };
  modal = document.querySelector("#modal");
  card = document.querySelector("#modalCard");
  if (!modal || !card) {
    modal = document.createElement("div");
    modal.className = "modal";
    modal.id = "modal";
    modal.hidden = true;
    card = document.createElement("div");
    card.className = "modal-card";
    card.id = "modalCard";
    modal.append(card);
    document.body.append(modal);
  }
  return { modal, card };
}

const paragraphs = (text) =>
  esc(text)
    .split("\n")
    .map((line) => line || "&nbsp;")
    .join("<br>");

export function showDialog({ title, text, html, wire }) {
  const refs = nodes();
  const body = html ?? `<h2>${esc(title)}</h2><p>${paragraphs(text)}</p>`;
  refs.card.innerHTML = html
    ? body
    : `${body}<div class="row"><button class="btn primary" data-dialog-ok>OK</button></div>`;

  refs.modal.hidden = false;
  refs.card.tabIndex = -1;
  refs.card.focus();
  refs.card.querySelector("[data-dialog-ok]")?.addEventListener("click", hideDialog);
  onDismiss = null;
  wire?.(refs.card);
  return refs.card;
}

export function hideDialog() {
  const refs = nodes();
  refs.modal.hidden = true;
  refs.card.innerHTML = "";
  onDismiss = null;
}

function dismiss() {
  const handler = onDismiss;
  onDismiss = null;
  const refs = nodes();
  refs.modal.hidden = true;
  refs.card.innerHTML = "";
  handler?.();
}

export function alertDialog(title, text) {
  return new Promise((resolve) => {
    showDialog({
      html: `<h2>${esc(title)}</h2><p>${paragraphs(text)}</p>
        <div class="row"><button class="btn primary" data-dialog-ok>OK</button></div>`,
      wire: (node) => {
        onDismiss = () => resolve();
        node.querySelector("[data-dialog-ok]").addEventListener("click", () => {
          hideDialog();
          resolve();
        });
      },
    });
  });
}

export function confirmDialog(title, text, { ok = "OK", cancel = "Cancel" } = {}) {
  return new Promise((resolve) => {
    showDialog({
      html: `<h2>${esc(title)}</h2><p>${paragraphs(text)}</p>
        <div class="row">
          <button class="btn" data-dialog-cancel>${esc(cancel)}</button>
          <button class="btn primary" data-dialog-ok>${esc(ok)}</button>
        </div>`,
      wire: (node) => {
        onDismiss = () => resolve(false);
        node.querySelector("[data-dialog-cancel]").addEventListener("click", () => {
          hideDialog();
          resolve(false);
        });
        node.querySelector("[data-dialog-ok]").addEventListener("click", () => {
          hideDialog();
          resolve(true);
        });
      },
    });
  });
}

window.addEventListener("keydown", (event) => {
  if (!modal || modal.hidden) return;
  if (event.key === "Escape") {
    event.stopPropagation();
    dismiss();
  }
  if (event.key === "Enter" && !event.target.closest("button, input, textarea")) {
    event.preventDefault();
    modal.querySelector("[data-dialog-ok]")?.click();
  }
});
