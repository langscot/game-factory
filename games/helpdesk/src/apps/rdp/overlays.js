// The little things mstsc puts on top of its dialog: the connecting window,
// the Shitnet Security credential prompt and the error message boxes.
// They are app-local overlays, not platform dialogs, because they belong to
// this window and have to look like the real client rather than Doors 11.

const ERROR_ICON = `<svg viewBox="0 0 32 32" aria-hidden="true">
  <circle cx="16" cy="16" r="13" fill="#c42b1c"/>
  <path d="M11.4 11.4l9.2 9.2M20.6 11.4l-9.2 9.2" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>
</svg>`;

const INFO_ICON = `<svg viewBox="0 0 32 32" aria-hidden="true">
  <circle cx="16" cy="16" r="13" fill="#0f6cbd"/>
  <path d="M16 14v9" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>
  <circle cx="16" cy="9.6" r="1.8" fill="#fff"/>
</svg>`;

const SHIELD_ICON = `<svg viewBox="0 0 32 32" aria-hidden="true">
  <path d="M16 2.8l10 3.8v8c0 6.3-4.2 11-10 14.6-5.8-3.6-10-8.3-10-14.6v-8z" fill="#0f6cbd"/>
  <path d="M11.4 15.8l3.4 3.4 6.2-6.6" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

function esc(value) {
  return String(value ?? "").replace(
    /[&<>"]/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char],
  );
}

const lines = (text) => esc(text).split("\n").map((line) => line || "&nbsp;").join("<br>");

/** One overlay layer. The root is position:relative and fills the window. */
function overlay(root, markup, cls = "") {
  const node = document.createElement("div");
  node.className = "rdp-overlay";
  node.innerHTML = `<div class="rdp-dlg ${cls}" role="dialog" aria-modal="true" tabindex="-1">${markup}</div>`;
  root.append(node);
  return { node, card: node.firstElementChild };
}

function titleBar(title) {
  return `<div class="rdp-dlg-title"><span>${esc(title)}</span><button class="rdp-dlg-x" data-close aria-label="Close">✕</button></div>`;
}

function paragraphBlock({ heading, message }) {
  return `${heading ? `<b class="rdp-dlg-head">${esc(heading)}</b>` : ""}<p>${lines(message)}</p>`;
}

/**
 * Error box. `buttons` is [{ label, primary, onClick }]; closing by X or Escape
 * runs the last button's handler, which is always the "give up" path.
 */
export function showErrorDialog(root, { heading = null, message, buttons, onClose }) {
  const list = buttons?.length ? buttons : [{ label: "OK" }];
  const markup =
    titleBar("Remote Deskhop") +
    `<div class="rdp-dlg-body"><div class="rdp-glyph">${ERROR_ICON}</div>
      <div class="rdp-dlg-copy">${paragraphBlock({ heading, message })}</div></div>
     <div class="rdp-dlg-actions">${list
       .map(
         (button, index) =>
           `<button class="rdp-btn${button.primary ? " primary" : ""}" data-button="${index}">${esc(button.label)}</button>`,
       )
       .join("")}</div>`;
  const layer = overlay(root, markup, "rdp-box");
  const dialog = layer.card;
  let closed = false;

  const close = () => {
    if (closed) return;
    closed = true;
    layer.node.remove();
    onClose?.();
  };

  dialog.querySelectorAll("[data-button]").forEach((node) => {
    node.addEventListener("click", () => {
      const button = list[Number(node.dataset.button)];
      close();
      button.onClick?.();
    });
  });
  dialog.querySelector("[data-close]").addEventListener("click", () => {
    const button = list[list.length - 1];
    close();
    button.onClick?.();
  });
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      const button = list[list.length - 1];
      close();
      button.onClick?.();
    }
  });
  dialog.focus();
  return { close };
}

/** The "i" box used by Help, Save As and the two Configure buttons. */
export function showInfoDialog(root, { heading, message, onClose }) {
  const markup =
    titleBar("Remote Deskhop") +
    `<div class="rdp-dlg-body"><div class="rdp-glyph">${INFO_ICON}</div>
      <div class="rdp-dlg-copy">${paragraphBlock({ heading, message })}</div></div>
     <div class="rdp-dlg-actions"><button class="rdp-btn primary" data-ok>OK</button></div>`;
  const layer = overlay(root, markup, "rdp-box");
  const dialog = layer.card;
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    layer.node.remove();
    onClose?.();
  };
  dialog.querySelector("[data-ok]").addEventListener("click", close);
  dialog.querySelector("[data-close]").addEventListener("click", close);
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape" || event.key === "Enter") {
      event.stopPropagation();
      close();
    }
  });
  dialog.focus();
  return { close };
}

/** The short-lived "Configuring remote session..." window. */
export function showHandshake(root, { host, onCancel }) {
  const markup =
    titleBar("Remote Deskhop") +
    `<div class="rdp-dlg-body rdp-connect-body">
       <p class="rdp-connect-status" data-status>Connecting to ${esc(host)}...</p>
       <div class="rdp-progress"><i data-bar style="width:12%"></i></div>
       <p class="rdp-note">This can take a few seconds on a slow network.</p>
     </div>
     <div class="rdp-dlg-actions"><button class="rdp-btn" data-cancel>Cancel</button></div>`;
  const layer = overlay(root, markup, "rdp-connect");
  const dialog = layer.card;
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    layer.node.remove();
  };

  dialog.querySelector("[data-cancel]").addEventListener("click", () => {
    close();
    onCancel?.();
  });
  dialog.querySelector("[data-close]").addEventListener("click", () => {
    close();
    onCancel?.();
  });
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
      onCancel?.();
    }
  });
  dialog.focus();

  return {
    close,
    status(text, percent) {
      const statusNode = dialog.querySelector("[data-status]");
      const bar = dialog.querySelector("[data-bar]");
      if (statusNode) statusNode.textContent = text;
      if (bar && percent != null) bar.style.width = `${percent}%`;
    },
  };
}

/**
 * Shitnet Security. The password never leaves this closure: only the user name
 * and the remember choice are written to the store.
 */
export function showCredentialPrompt(root, { host, username, remember, onSubmit, onCancel }) {
  const markup =
    titleBar("Shitnet Security") +
    `<div class="rdp-sec-head">${SHIELD_ICON}<div><b>Shitnet Security</b><span>Enter your credentials</span></div></div>
     <div class="rdp-sec-body">
       <p>These credentials will be used to connect to <b>${esc(host)}</b>.</p>
       <div class="rdp-field"><label for="rdp-sec-user">User name</label>
         <input id="rdp-sec-user" data-sec-user spellcheck="false" autocomplete="username" value="${esc(username)}"></div>
       <div class="rdp-field"><label for="rdp-sec-pass">Password</label>
         <input id="rdp-sec-pass" data-sec-pass type="password" autocomplete="current-password"></div>
       <label class="rdp-check"><input type="checkbox" data-remember${remember ? " checked" : ""}> Remember me</label>
       <p class="rdp-sec-err" data-error hidden></p>
     </div>
     <div class="rdp-dlg-actions"><button class="rdp-btn" data-cancel>Cancel</button>
       <button class="rdp-btn primary" data-ok>OK</button></div>`;
  const layer = overlay(root, markup, "rdp-security");
  const dialog = layer.card;
  const userInput = dialog.querySelector("[data-sec-user]");
  const passInput = dialog.querySelector("[data-sec-pass]");
  const rememberBox = dialog.querySelector("[data-remember]");
  const errorNode = dialog.querySelector("[data-error]");
  let closed = false;

  const close = () => {
    if (closed) return;
    closed = true;
    layer.node.remove();
    return true;
  };
  const cancel = () => {
    if (!close()) return;
    onCancel?.();
  };
  const submit = () => {
    const result = onSubmit?.({
      username: userInput.value,
      password: passInput.value,
      remember: rememberBox.checked,
    });
    if (typeof result === "string" && result) {
      errorNode.hidden = false;
      errorNode.textContent = result;
      passInput.value = "";
      passInput.focus();
      return;
    }
    close();
  };

  dialog.querySelector("[data-ok]").addEventListener("click", submit);
  dialog.querySelector("[data-cancel]").addEventListener("click", cancel);
  dialog.querySelector("[data-close]").addEventListener("click", cancel);
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      cancel();
    } else if (event.key === "Enter") {
      event.preventDefault();
      submit();
    }
  });
  passInput.focus();
  return { close };
}
