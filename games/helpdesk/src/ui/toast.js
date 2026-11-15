// Toasts. Same look as the shell's notifications so an app's message reads as
// a Windows notification rather than part of the app.

import { esc } from "./dom.js";
import { icon } from "../icons.js";

let host = null;

function toastHost() {
  if (host && host.isConnected) return host;
  host = document.querySelector("#toasts");
  if (!host) {
    host = document.createElement("div");
    host.className = "toasts";
    host.id = "toasts";
    document.body.append(host);
  }
  return host;
}

export function toast(title, body, ico = "ticket") {
  const node = document.createElement("div");
  node.className = "toast";
  node.innerHTML = `${icon(ico)}<div><b>${esc(title)}</b><p>${esc(body)}</p></div>`;
  toastHost().append(node);
  while (toastHost().children.length > 3) toastHost().firstElementChild.remove();
  setTimeout(() => node.remove(), 5200);
  node.addEventListener("click", () => node.remove());
  return node;
}
