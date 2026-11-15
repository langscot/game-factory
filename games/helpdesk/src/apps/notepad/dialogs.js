// The two dialogs Notepad needs: a file picker over the mock file system and
// the three-way Save / Don't save / Cancel prompt. They are created per app
// instance so closing a window can close whatever it left open.

import {
  DOCUMENTS,
  HOME,
  normalizePath,
  parentPath,
  pathLabel,
  withTxtExtension,
} from "./text.js";

export function createDialogs({ ctx, isLight, getActiveDoc }) {
  let activeDialog = null;

  function modal(html, wire, width = 520) {
    if (activeDialog) activeDialog();
    return new Promise((resolve) => {
      let settled = false;
      let card = null;
      let close = null;

      const finish = (value) => {
        if (settled) return;
        settled = true;
        if (activeDialog === close) activeDialog = null;
        if (card) card.style.width = "";
        ctx.ui.closeDialog();
        resolve(value);
      };
      close = () => finish(null);
      activeDialog = close;

      card = ctx.ui.dialog({
        html,
        wire: (node) => {
          node.style.width = `min(${width}px, 100%)`;
          node.addEventListener(
            "keydown",
            (event) => {
              if (event.key !== "Escape") return;
              event.preventDefault();
              event.stopPropagation();
              event.stopImmediatePropagation();
              close();
            },
            true,
          );
          wire(node, finish, close);
        },
      });
    });
  }

  function closePrompt(doc) {
    const light = isLight() ? " np-light" : "";
    return modal(
      `<div class="app-notepad${light}"><div class="np-prompt">
        <h2>Notepad</h2>
        <p>Do you want to save changes to ${ctx.ui.esc(doc.name)}?</p>
        <div class="row">
          <button class="btn" data-save data-dialog-ok type="button">Save</button>
          <button class="btn" data-discard type="button">Don't save</button>
          <button class="btn" data-cancel type="button">Cancel</button>
        </div>
      </div></div>`,
      (node, finish) => {
        node.querySelector("[data-save]").addEventListener("click", () => finish("save"));
        node.querySelector("[data-discard]").addEventListener("click", () => finish("discard"));
        node.querySelector("[data-cancel]").addEventListener("click", () => finish("cancel"));
        node.querySelector("[data-save]").focus();
      },
      430,
    );
  }

  function fileDialog({ mode, startPath, startName }) {
    const light = isLight() ? " np-light" : "";
    return modal(
      `<div class="app-notepad${light}"><div class="np-dialog">
        <h2>${mode === "save" ? "Save as" : "Open"}</h2>
        <div class="np-dlg-path">
          <button class="np-tool" data-up type="button" title="Up one level" aria-label="Up one level">↑</button>
          <span data-path></span>
        </div>
        <div class="np-dlg-list" data-list role="listbox" aria-label="Files"></div>
        <div class="np-dlg-name">
          <label for="npFileName">File name</label>
          <input id="npFileName" type="text" data-name autocomplete="off" spellcheck="false">
        </div>
        <div class="np-dlg-msg" data-msg role="alert"></div>
        <div class="row">
          <button class="btn" data-cancel type="button">Cancel</button>
          <button class="btn primary" data-ok type="button">${mode === "save" ? "Save" : "Open"}</button>
        </div>
      </div></div>`,
      (node, finish) => {
        let path = normalizePath(startPath || DOCUMENTS);
        let pendingOverwrite = null;

        const up = node.querySelector("[data-up]");
        const pathEl = node.querySelector("[data-path]");
        const list = node.querySelector("[data-list]");
        const nameInput = node.querySelector("[data-name]");
        const message = node.querySelector("[data-msg]");
        const okButton = node.querySelector("[data-ok]");
        const cancelButton = node.querySelector("[data-cancel]");

        nameInput.value = startName || "";

        const clearWarning = () => {
          if (!pendingOverwrite) return;
          pendingOverwrite = null;
          message.textContent = "";
          okButton.textContent = mode === "save" ? "Save" : "Open";
        };

        const accept = () => {
          const typed = nameInput.value.trim();
          const name = mode === "save" ? withTxtExtension(typed) : typed;
          if (!name) {
            message.textContent = "Type a file name.";
            nameInput.focus();
            return;
          }
          if (/[\\/]/.test(name)) {
            message.textContent = "A file name cannot contain a slash.";
            nameInput.focus();
            return;
          }

          if (mode === "open") {
            const file = ctx.world.files.byName(path, name);
            if (!file) {
              message.textContent = `"${name}" was not found in this folder.`;
              return;
            }
            if (file.kind !== "text") {
              message.textContent = "Notepad can only open text files.";
              return;
            }
            finish({ path, name });
            return;
          }

          const existing = ctx.world.files.byName(path, name);
          const current = getActiveDoc();
          const sameAsCurrent = current?.path === path && current?.name === name;
          const key = `${path}/${name}`;
          if (existing && !sameAsCurrent && pendingOverwrite !== key) {
            pendingOverwrite = key;
            message.textContent = `"${name}" already exists. Choose Replace to overwrite it.`;
            okButton.textContent = "Replace";
            return;
          }
          finish({ path, name });
        };

        const paint = (focusName = false) => {
          pathEl.textContent = pathLabel(path);
          up.disabled = path === HOME;
          const entries = ctx.world.files
            .list(path)
            .filter((entry) => entry.kind === "folder" || entry.kind === "text");

          list.innerHTML = entries.length
            ? entries
                .map(
                  (entry) => `
                  <button class="np-dlg-row" type="button" role="option" aria-selected="false"
                    data-entry="${ctx.ui.esc(entry.name)}">
                    ${ctx.ui.icon(entry.kind === "folder" ? "folder" : "notepad")}
                    <span class="np-dlg-nm">${ctx.ui.esc(entry.name)}</span>
                    <span class="np-dlg-size">${ctx.ui.esc(entry.size || "")}</span>
                  </button>`,
                )
                .join("")
            : '<div class="np-dlg-empty">This folder is empty.</div>';

          const rows = [...list.querySelectorAll(".np-dlg-row")];
          rows.forEach((row, index) => {
            const entry = entries[index];
            const selected = nameInput.value.trim() === entry.name;
            row.classList.toggle("sel", selected);
            row.setAttribute("aria-selected", String(selected));
            row.addEventListener("click", () => {
              if (entry.kind === "folder") {
                path = normalizePath(entry.path);
                pendingOverwrite = null;
                okButton.textContent = mode === "save" ? "Save" : "Open";
                message.textContent = "";
                paint(true);
                return;
              }
              nameInput.value = entry.name;
              clearWarning();
              for (const other of rows) {
                other.classList.remove("sel");
                other.setAttribute("aria-selected", "false");
              }
              row.classList.add("sel");
              row.setAttribute("aria-selected", "true");
            });
            row.addEventListener("dblclick", () => {
              if (entry.kind === "folder") return;
              nameInput.value = entry.name;
              accept();
            });
          });

          if (focusName) {
            nameInput.focus();
            nameInput.select();
          }
        };

        up.addEventListener("click", () => {
          const next = parentPath(path);
          if (next === path) return;
          path = next;
          pendingOverwrite = null;
          okButton.textContent = mode === "save" ? "Save" : "Open";
          message.textContent = "";
          paint(true);
        });

        nameInput.addEventListener("input", () => {
          clearWarning();
          for (const row of list.querySelectorAll(".np-dlg-row")) {
            const selected = row.dataset.entry === nameInput.value.trim();
            row.classList.toggle("sel", selected);
            row.setAttribute("aria-selected", String(selected));
          }
        });
        nameInput.addEventListener("keydown", (event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          accept();
        });
        okButton.addEventListener("click", accept);
        cancelButton.addEventListener("click", () => finish(null));

        paint();
        nameInput.focus();
        if (startName) nameInput.select();
      },
      580,
    );
  }

  return {
    closePrompt,
    fileDialog,
    closeActive: () => activeDialog?.(),
  };
}
