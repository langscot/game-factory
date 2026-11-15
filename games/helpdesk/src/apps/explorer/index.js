// File Explorer. Folders are derived from the file paths in the store, so a
// file saved by Notepad appears here without Explorer knowing Notepad exists.
// Double-clicking a .reg imports it through the platform action.

const instances = new WeakMap();
const HOME = "This PC";
const QUICK_ACCESS = ["Desktop", "Documents", "Downloads", "Pictures"];
const FILE_ICON = { text: "notepad", exe: "terminal", pdf: "book", image: "image", office: "doc", registry: "settings", folder: "folder" };

const resolvePath = (path) => {
  if (!path || path === HOME || path === "Home") return HOME;
  if (path.startsWith("C:/")) return path;
  return `C:/Users/m.hayes/${path}`;
};

export default {
  id: "explorer",
  title: "File Explorer",
  icon: "folder",
  size: [780, 520],
  desktop: true,
  pinned: true,
  order: 5,
  position: [180, 90],

  mount(container, ctx) {
    ctx.ui.styles("explorer", css);
    const uiState = () => ctx.world.session.ui("explorer");
    const technicianMachine = () => ctx.world.machines.byOwner(ctx.world.session.current().technicianId);

    if (ctx.options?.path) {
      ctx.actions.setUi("explorer", { path: resolvePath(ctx.options.path) });
    }
    const currentPath = () => uiState().path || HOME;

    function rowsFor(path) {
      if (path === HOME) {
        return [
          ...QUICK_ACCESS.map((name) => ({ id: `dir:${name}`, name, kind: "folder", path: `C:/Users/m.hayes/${name}`, size: "", modified: "" })),
          { id: "drv_c", name: "Local Disk (C:)", kind: "drive", path: HOME, size: "476 GB", modified: "" },
        ];
      }
      return ctx.world.files.list(path);
    }

    function paint() {
      const path = currentPath();
      const rows = rowsFor(path);
      const selectedName = uiState().selectedName || null;

      container.innerHTML = "";
      const root = ctx.ui.el(`
        <div class="exp">
          <div class="exp-nav">
            <div class="nav-head">Quick access</div>
            <div data-nav></div>
            <div class="nav-head">This PC</div>
            <button data-nav-home>${ctx.ui.icon("monitor")}This PC</button>
          </div>
          <div class="exp-main">
            <div class="exp-bar">
              <button class="nav-btn" data-back title="Back">${ctx.ui.icon("$arrowLeft")}</button>
              <button class="nav-btn" data-fwd title="Forward" disabled>${ctx.ui.icon("$arrowRight")}</button>
              <button class="nav-btn" data-up title="Up">${ctx.ui.icon("$up")}</button>
              <div class="exp-path" data-path></div>
            </div>
            <div class="exp-files">
              <div class="exp-row head"><span>Name</span><span>Size</span><span>Date modified</span></div>
              <div data-rows></div>
            </div>
            <div class="exp-status" data-status></div>
          </div>
        </div>`);
      container.append(root);

      const nav = root.querySelector("[data-nav]");
      for (const name of QUICK_ACCESS) {
        const target = `C:/Users/m.hayes/${name}`;
        const button = ctx.ui.el(`<button class="${path === target ? "sel" : ""}">${ctx.ui.icon(name === "Pictures" ? "image" : "folder")}${name}</button>`);
        button.addEventListener("click", () => ctx.actions.setUi("explorer", { path: target, selectedName: null }));
        nav.append(button);
      }
      root.querySelector("[data-nav-home]").addEventListener("click", () =>
        ctx.actions.setUi("explorer", { path: HOME, selectedName: null }),
      );

      root.querySelector("[data-path]").textContent = path === HOME ? HOME : path.replace("C:/Users/m.hayes/", "This PC › ");
      root.querySelector("[data-back]").addEventListener("click", () =>
        ctx.actions.setUi("explorer", { path: HOME, selectedName: null }),
      );
      root.querySelector("[data-up]").addEventListener("click", () => {
        if (path === HOME) return;
        const parent = path.split("/").slice(0, -1).join("/") || HOME;
        ctx.actions.setUi("explorer", { path: parent, selectedName: null });
      });

      const rowWrap = root.querySelector("[data-rows]");
      const activate = (file) => {
        if (file.id === "drv_c") return;
        if (file.kind === "folder") {
          ctx.actions.setUi("explorer", { path: file.path, selectedName: null });
          return;
        }
        if (file.kind === "text") {
          ctx.open("notepad", { path: file.path, name: file.name });
          return;
        }
        if (file.kind === "registry") {
          openRegistry(file);
          return;
        }
        if (file.kind === "exe") {
          ctx.ui.toast("Windows protected your PC", `${file.name} was blocked by IT policy. Nice try.`, "terminal");
          return;
        }
        ctx.ui.toast("File Explorer", `Nothing on this PC opens ${file.name}.`, "folder");
      };

      for (const file of rows) {
        const row = ctx.ui.el(`<button class="exp-row${selectedName === file.name ? " sel" : ""}" data-file="${ctx.ui.esc(file.name)}">
          <span class="nm">${ctx.ui.icon(FILE_ICON[file.kind] || "notepad")}<span>${ctx.ui.esc(file.name)}</span></span>
          <span class="muted">${file.size}</span><span class="muted">${file.modified}</span>
        </button>`);
        row.addEventListener("click", () => {
          ctx.actions.setUi("explorer", { selectedName: file.name });
        });
        row.addEventListener("dblclick", () => activate(file));
        row.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            activate(file);
          }
        });
        rowWrap.append(row);
      }
      if (!rows.length) rowWrap.append(ctx.ui.el(`<div class="muted tiny" style="padding:16px">This folder is empty.</div>`));

      root.querySelector("[data-status]").textContent =
        selectedName && uiState().selectedName ? `${rows.length} items · ${selectedName} selected` : `${rows.length} items`;
    }

    async function openRegistry(file) {
      const machine = technicianMachine();
      if (!machine) return;
      const ok = await ctx.ui.confirm(
        "Registry Editor",
        `Import ${file.name}?\n\n${file.path}/${file.name}\n\nThis writes policy keys for every user on ${machine.hostname}.`,
        { ok: "Yes", cancel: "No" },
      );
      if (!ok) return;
      const result = ctx.actions.importRegistry(machine.id, file.id);
      if (!result.ok) {
        ctx.ui.toast("Registry Editor", `Import failed: ${result.reason}.`, "settings");
        return;
      }
      ctx.ui.toast(
        "Registry Editor",
        `${result.entries.length} value${result.entries.length === 1 ? "" : "s"} imported. Policy state updated.`,
        "settings",
      );
    }

    const offEvents = ctx.events.on("*", paint);
    instances.set(container, { offEvents });
    paint();
  },

  unmount(container) {
    instances.get(container)?.offEvents?.();
    instances.delete(container);
  },
};

const css = `
.app-explorer .exp { display: grid; grid-template-columns: 176px 1fr; height: 100%; }
.app-explorer .exp-nav { border-right: 1px solid var(--stroke); padding: 6px; overflow: auto; font-size: 12px; }
.app-explorer .exp-nav button { display: flex; align-items: center; gap: 8px; width: 100%; text-align: left; padding: 6px 8px; border-radius: 4px; font-size: 12px; color: var(--text-2); border-left: 3px solid transparent; }
.app-explorer .exp-nav button svg { width: 15px; height: 15px; }
.app-explorer .exp-nav button:hover { background: var(--hover); }
.app-explorer .exp-nav button.sel { background: rgba(76, 194, 255, 0.14); border-left-color: var(--accent); color: #fff; }
.app-explorer .exp-nav .nav-head { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.07em; color: var(--text-3); padding: 10px 8px 4px; }
.app-explorer .exp-main { display: flex; flex-direction: column; min-width: 0; }
.app-explorer .exp-bar { display: flex; align-items: center; gap: 3px; padding: 5px 8px; border-bottom: 1px solid var(--stroke); }
.app-explorer .exp-bar .nav-btn { width: 28px; height: 26px; border-radius: 4px; display: grid; place-items: center; color: var(--text-3); }
.app-explorer .exp-bar .nav-btn:hover { background: var(--hover); }
.app-explorer .exp-bar .nav-btn svg { width: 14px; height: 14px; }
.app-explorer .exp-path { flex: 1; margin-left: 4px; background: rgba(0, 0, 0, 0.22); border: 1px solid var(--stroke-2); border-radius: 4px; padding: 4px 9px; font-size: 12px; color: var(--text-2); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.app-explorer .exp-files { flex: 1; overflow: auto; padding: 4px; }
.app-explorer .exp-row { display: grid; grid-template-columns: 1fr 90px 150px; gap: 8px; align-items: center; width: 100%; text-align: left; padding: 5px 10px; border-radius: 4px; font-size: 12px; color: var(--text-2); }
.app-explorer .exp-row.head { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-3); }
.app-explorer .exp-row:hover:not(.head) { background: var(--hover); }
.app-explorer .exp-row.sel { background: rgba(76, 194, 255, 0.16); }
.app-explorer .exp-row .nm { display: flex; align-items: center; gap: 9px; min-width: 0; }
.app-explorer .exp-row .nm svg { width: 18px; height: 18px; flex: none; }
.app-explorer .exp-row .nm span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.app-explorer .exp-status { padding: 4px 10px; border-top: 1px solid var(--stroke); font-size: 11px; color: var(--text-3); }
`;
