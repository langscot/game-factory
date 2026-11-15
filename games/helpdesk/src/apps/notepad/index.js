// Notepad. The document lives in the world store's file system, so saving here
// and opening in File Explorer are the same bytes. The debounce is scheduled on
// the platform clock, not an app timer.

const instances = new WeakMap();

function resolveFile(ctx) {
  const options = ctx.options || {};
  const name = options.name || options.file || "notes.txt";
  if (options.path) return { path: options.path, name };
  const existing = ctx.world.files.items().find((file) => file.name === name);
  return {
    path: existing?.path || "C:/Users/m.hayes/Documents",
    name,
  };
}

export default {
  id: "notepad",
  title: "Notepad",
  icon: "notepad",
  size: [640, 540],
  desktop: true,
  pinned: true,
  multi: true,
  order: 6,
  position: [300, 70],
  titleFor: (options) => `${options?.name || options?.file || "notes.txt"} - Notepad`,

  mount(container, ctx) {
    ctx.ui.styles("notepad", css);
    const target = resolveFile(ctx);
    const file = ctx.world.files.byName(target.path, target.name);
    let lastSaved = file?.contents ?? "";
    let cancelSave = null;
    let wrap = true;

    container.innerHTML = "";
    const root = ctx.ui.el(`
      <div class="notepad">
        <div class="np-tabs"><div class="np-tab">${ctx.ui.icon("notepad")}<span>${ctx.ui.esc(target.name)}</span></div></div>
        <div class="np-menu">
          <button data-menu="file">File</button>
          <button data-menu="edit">Edit</button>
          <button data-menu="view">View</button>
          <button data-menu="help">Help</button>
        </div>
        <div class="np-area"><textarea spellcheck="false" aria-label="Document"></textarea></div>
        <div class="np-status">
          <span data-np="pos">Ln 1, Col 1</span><span data-np="state">Saved</span><span>Windows (CRLF)</span><span>UTF-8</span>
        </div>
      </div>`);
    container.append(root);

    const area = root.querySelector("textarea");
    const pos = root.querySelector('[data-np="pos"]');
    const status = root.querySelector('[data-np="state"]');
    area.value = lastSaved;

    const setPosition = () => {
      const upto = area.value.slice(0, area.selectionStart);
      const line = upto.split("\n").length;
      const col = upto.length - upto.lastIndexOf("\n");
      pos.textContent = `Ln ${line}, Col ${col}`;
    };

    const markDirty = () => {
      const dirty = area.value !== lastSaved;
      status.textContent = dirty ? "Modified" : "Saved";
    };

    const save = (announce) => {
      cancelSave?.();
      cancelSave = null;
      lastSaved = area.value;
      ctx.actions.saveFile({ path: target.path, name: target.name, contents: area.value });
      markDirty();
      if (announce) ctx.ui.toast("Notepad", `${target.name} saved to ${target.path}.`, "notepad");
    };

    const queueSave = () => {
      cancelSave?.();
      cancelSave = ctx.clock.schedule(0.6, () => {
        cancelSave = null;
        save(false);
      });
    };

    area.addEventListener("input", () => {
      setPosition();
      markDirty();
      queueSave();
    });
    area.addEventListener("keyup", setPosition);
    area.addEventListener("click", setPosition);
    area.addEventListener("keydown", (event) => {
      if (!event.ctrlKey) return;
      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        save(true);
      }
      if (event.key.toLowerCase() === "o") {
        event.preventDefault();
        ctx.open("explorer", { path: target.path });
      }
    });

    function menuFor(name, rect) {
      const at = [rect.left, rect.bottom + 2];
      if (name === "file") {
        ctx.ui.menu(...at, [
          {
            label: "New",
            shortcut: "Ctrl+N",
            onClick: () => {
              area.value = "";
              area.focus();
              save(false);
            },
          },
          { label: "Open…", shortcut: "Ctrl+O", onClick: () => ctx.open("explorer", { path: target.path }) },
          { label: "Save", shortcut: "Ctrl+S", onClick: () => save(true) },
          { label: "Save as…", disabled: true },
          { separator: true },
          { label: "Exit", onClick: () => ctx.window.close() },
        ]);
      } else if (name === "edit") {
        ctx.ui.menu(...at, [
          { label: "Undo", shortcut: "Ctrl+Z", onClick: () => document.execCommand("undo") },
          { separator: true },
          { label: "Cut", shortcut: "Ctrl+X", onClick: () => document.execCommand("cut") },
          { label: "Copy", shortcut: "Ctrl+C", onClick: () => document.execCommand("copy") },
          { label: "Paste", shortcut: "Ctrl+V", onClick: () => document.execCommand("paste") },
          { separator: true },
          { label: "Select all", shortcut: "Ctrl+A", onClick: () => area.select() },
        ]);
      } else if (name === "view") {
        ctx.ui.menu(...at, [
          {
            label: "Word wrap",
            checked: wrap,
            onClick: () => {
              wrap = !wrap;
              area.style.whiteSpace = wrap ? "pre-wrap" : "pre";
              area.style.overflowX = wrap ? "hidden" : "auto";
            },
          },
          { separator: true },
          { label: "Zoom in", disabled: true },
          { label: "Zoom out", disabled: true },
        ]);
      } else {
        ctx.ui.menu(...at, [
          {
            label: "About Notepad",
            onClick: () =>
              ctx.ui.alert(
                "Notepad",
                "A text editor. It has been in Windows since 1985 and it has not changed much, because it works.\n\nThis copy saves into the shared world store, so File Explorer sees the same file.",
              ),
          },
        ]);
      }
    }

    for (const button of root.querySelectorAll(".np-menu button")) {
      button.addEventListener("click", () => {
        for (const other of root.querySelectorAll(".np-menu button")) other.classList.remove("open");
        button.classList.add("open");
        menuFor(button.dataset.menu, button.getBoundingClientRect());
      });
    }

    // A save that was still waiting when the window closes must not be lost.
    const flush = () => {
      if (cancelSave) save(false);
    };

    area.focus();
    area.setSelectionRange(0, 0);
    area.scrollTop = 0;
    setPosition();
    markDirty();
    instances.set(container, { flush, cancel: () => cancelSave?.() });
  },

  unmount(container) {
    const held = instances.get(container);
    held?.flush?.();
    held?.cancel?.();
    instances.delete(container);
  },
};

const css = `
.app-notepad .notepad { display: flex; flex-direction: column; height: 100%; background: #1f1f1f; }
.app-notepad .np-tabs { display: flex; align-items: center; gap: 2px; padding: 4px 6px 0; background: #171717; }
.app-notepad .np-tab { display: flex; align-items: center; gap: 7px; padding: 6px 10px; border-radius: 5px 5px 0 0; font-size: 12px; color: var(--text-2); background: #262626; }
.app-notepad .np-tab svg { width: 14px; height: 14px; }
.app-notepad .np-menu { display: flex; gap: 2px; padding: 2px 6px; background: #1f1f1f; border-bottom: 1px solid var(--stroke); }
.app-notepad .np-menu button { padding: 4px 9px; border-radius: 4px; font-size: 12px; color: var(--text-2); }
.app-notepad .np-menu button:hover, .app-notepad .np-menu button.open { background: var(--hover); }
.app-notepad .np-area { flex: 1; min-height: 0; }
.app-notepad .np-area textarea {
  width: 100%; height: 100%; resize: none; border: 0; outline: 0; background: #1f1f1f;
  color: #e6e6e6; font: 13.5px/1.55 "Cascadia Mono", "Consolas", ui-monospace, monospace;
  padding: 12px 14px;
}
.app-notepad .np-status { display: flex; justify-content: flex-end; gap: 22px; padding: 4px 12px; font-size: 11.5px; color: var(--text-3); border-top: 1px solid var(--stroke); background: #171717; }
`;
