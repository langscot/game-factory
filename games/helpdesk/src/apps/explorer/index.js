// File Explorer. The world store is the source of truth for files; this app
// adds a small view layer on top of it so Windows Explorer's shell habits
// (tabs, breadcrumbs, the command bar, cutting and pasting) work without
// teaching every other app about folder renames or a clipboard.
//
// Folders are derived from file paths, so a file saved by Notepad appears here
// without Explorer knowing Notepad exists. Renamed folders are virtual: a
// redirect maps the display path to the real path, which keeps Notepad opening
// the original bytes. Deletions are hidden in the same view layer and recorded
// in its bin list; the platform has no delete action yet, so the Recycle Bin app
// is not updated by this window.

import { FILE_ICON, local } from "./icons.js";
import { css } from "./styles.js";

const instances = new WeakMap();

const HOME = "Home";
const THIS_PC = "This PC";
const GALLERY = "Gallery";
const ONEDRIVE = "OneDrive";
const NETWORK = "Network";
const USER_ROOT = "C:/Users/m.hayes";
const QUICK_FOLDERS = ["Desktop", "Documents", "Downloads", "Pictures"];
const SEED_DATE = "15/11/2026";
// The store seeds one system drive. There is no drives selector, so Explorer
// keeps the shell label here rather than reaching into the store.
const DRIVES = [{ id: "drv_c", letter: "C:" }];

const VIEWS = [
  ["details", "Details"],
  ["list", "List"],
  ["icons", "Large icons"],
];

const EXTENSION_TYPES = {
  txt: "Text Document",
  log: "Text Document",
  md: "Markdown File",
  reg: "Registration Entries",
  pdf: "PDF Document",
  jpg: "JPG File",
  jpeg: "JPG File",
  png: "PNG File",
  gif: "GIF File",
  xlsx: "Microsoft Excel Worksheet",
  xls: "Microsoft Excel Worksheet",
  pptx: "Microsoft PowerPoint Presentation",
  docx: "Microsoft Word Document",
  exe: "Application",
  zip: "Compressed (zipped) Folder",
};

export default {
  id: "explorer",
  title: "File Explorer",
  icon: "folder",
  size: [1000, 650],
  desktop: true,
  pinned: true,
  order: 5,
  position: [120, 56],

  mount(container, ctx) {
    ctx.ui.styles("explorer", css);

    let renaming = null;
    let tabUid = 0;
    let quietPaint = false;
    let rendered = { state: null, rows: [] };
    const expanded = new Set(["thispc", "network"]);

    const technician = () => ctx.world.session.current().technicianId;
    const logonName = () => ctx.world.session.current().technician?.logonName || "m.hayes";

    // -----------------------------------------------------------------------
    // view state (persisted in session.ui.explorer)
    // -----------------------------------------------------------------------

    function read() {
      const saved = ctx.world.session.ui("explorer");
      const tabs =
        Array.isArray(saved.tabs) && saved.tabs.length
          ? saved.tabs
          : [
              { id: "tab_home", path: HOME, history: [], forward: [] },
              { id: "tab_pc", path: THIS_PC, history: [], forward: [] },
            ];
      const activeTab = tabs.some((tab) => tab.id === saved.activeTab) ? saved.activeTab : tabs[0].id;
      return {
        tabs,
        activeTab,
        view: VIEWS.some(([id]) => id === saved.view) ? saved.view : "details",
        sortKey: ["name", "date", "type", "size"].includes(saved.sortKey) ? saved.sortKey : "name",
        sortDir: saved.sortDir === -1 ? -1 : 1,
        selected: saved.selected || null,
        query: saved.query || "",
        clipboard: saved.clipboard || null,
        folders: Array.isArray(saved.folders) ? saved.folders : [],
        virtual: Array.isArray(saved.virtual) ? saved.virtual : [],
        hidden: Array.isArray(saved.hidden) ? saved.hidden : [],
        hiddenPrefixes: Array.isArray(saved.hiddenPrefixes) ? saved.hiddenPrefixes : [],
        redirects: Array.isArray(saved.redirects) ? saved.redirects : [],
        bin: Array.isArray(saved.bin) ? saved.bin : [],
      };
    }

    const save = (patch) => ctx.actions.setUi("explorer", patch);

    const activeTab = (state) => state.tabs.find((tab) => tab.id === state.activeTab) || state.tabs[0];
    const activePath = (state) => activeTab(state).path;

    function tabLabel(path) {
      if ([HOME, GALLERY, ONEDRIVE, THIS_PC, NETWORK].includes(path)) return path;
      if (path.startsWith("//")) return path.split("/").filter(Boolean).pop() || "Network";
      const clean = path.replace(/\/+$/, "");
      if (/^[A-Z]:$/.test(clean)) return `Local Disk (${clean})`;
      return clean.split("/").pop() || THIS_PC;
    }

    function tabIcon(path) {
      if (path === HOME) return local("home");
      if (path === GALLERY) return local("gallery");
      if (path === ONEDRIVE) return local("cloud");
      if (path === THIS_PC) return local("thispc");
      if (path === NETWORK || path.startsWith("//")) return local("network");
      if (/^[A-Z]:$/.test(path)) return local("drive");
      return ctx.ui.icon("folder");
    }

    // -----------------------------------------------------------------------
    // paths, folders and the small virtual layer
    // -----------------------------------------------------------------------

    const norm = (path) => String(path || "").replace(/\\/g, "/").replace(/\/+$/, "");

    function parentOf(path) {
      if ([HOME, GALLERY, ONEDRIVE].includes(path)) return THIS_PC;
      if ([THIS_PC, NETWORK].includes(path)) return THIS_PC;
      if (path === "//HALCYON") return NETWORK;
      if (path.startsWith("//")) {
        const parts = path.split("/").filter(Boolean);
        if (parts.length <= 2) return NETWORK;
        return `//${parts.slice(0, -1).join("/")}`;
      }
      if (/^[A-Z]:\/?$/.test(path)) return THIS_PC;
      const parts = path.split("/").filter(Boolean);
      if (!parts.length) return THIS_PC;
      parts.pop();
      const joined = parts.join("/");
      return /^[A-Z]:$/.test(joined) ? `${joined}/` : joined || THIS_PC;
    }

    function breadcrumbs(path) {
      if ([HOME, GALLERY, ONEDRIVE, THIS_PC, NETWORK].includes(path)) return [{ label: path, path }];
      if (path.startsWith("//")) {
        const parts = path.split("/").filter(Boolean);
        const crumbs = [{ label: NETWORK, path: NETWORK }];
        if (parts[0]) crumbs.push({ label: parts[0], path: `//${parts[0]}` });
        let acc = parts[0] ? `//${parts[0]}` : "";
        for (const part of parts.slice(1)) {
          acc = `${acc}/${part}`;
          crumbs.push({ label: part, path: acc });
        }
        return crumbs;
      }
      const parts = path.split("/").filter(Boolean);
      const crumbs = [{ label: THIS_PC, path: THIS_PC }];
      let acc = "";
      for (const part of parts) {
        acc = acc ? `${acc}/${part}` : `${part}/`;
        crumbs.push({ label: /^[A-Z]:$/.test(part) ? `Local Disk (${part})` : part, path: acc.replace(/\/$/, "") || `${part}/` });
      }
      return crumbs;
    }

    // A redirect is the display path for a real folder that was renamed or cut
    // and pasted. The longest matching display prefix wins, so a renamed child
    // inside a renamed parent still resolves to its original bytes.
    function actualPath(displayPath, state = read()) {
      if (!displayPath || [HOME, GALLERY, ONEDRIVE, THIS_PC, NETWORK].includes(displayPath)) return displayPath;
      let best = null;
      for (const redirect of state.redirects) {
        if (displayPath === redirect.virtual || displayPath.startsWith(`${redirect.virtual}/`)) {
          if (!best || redirect.virtual.length > best.virtual.length) best = redirect;
        }
      }
      if (!best) return displayPath;
      return `${best.actual}${displayPath.slice(best.virtual.length)}`;
    }

    const stampNow = () => `${SEED_DATE} ${ctx.clock.timeText()}`;

    const hiddenPath = (path, state) =>
      state.hidden.includes(path) ||
      state.hiddenPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));

    function shareForPath(path) {
      const clean = norm(path);
      return ctx.world.files.shares().find((share) => norm(share.path) === clean);
    }

    function accessFor(shareId) {
      return ctx.world.files.shareAccess(shareId, technician());
    }

    function isWritable(path, state = read()) {
      if (!path || [HOME, GALLERY, ONEDRIVE, THIS_PC, NETWORK, "//HALCYON"].includes(path)) return false;
      if (path.startsWith("//")) {
        const share = shareForPath(actualPath(path, state));
        return Boolean(share) && accessFor(share.id) === "modify";
      }
      return /^[A-Z]:\//.test(path);
    }

    function displaySize(entry) {
      if (entry.kind === "drive") return "476 GB free";
      if (entry.kind === "share") return "";
      if (entry.kind === "folder") return "";
      return entry.size || "";
    }

    function typeOf(entry) {
      if (entry.kind === "folder") return "File folder";
      if (entry.kind === "drive") return "Local disk";
      if (entry.kind === "share") return "Network location";
      const extension = String(entry.name || "").split(".").pop().toLowerCase();
      return EXTENSION_TYPES[extension] || "File";
    }

    const extensionOf = (name) => {
      const index = String(name).lastIndexOf(".");
      return index > 0 ? String(name).slice(index) : "";
    };

    function uniqueName(names, desired, extension = "") {
      const used = new Set(names.map((name) => name.toLowerCase()));
      if (!used.has(desired.toLowerCase())) return desired;
      const base = extension && desired.toLowerCase().endsWith(extension.toLowerCase())
        ? desired.slice(0, -extension.length)
        : desired;
      const suffix = extension && desired.toLowerCase().endsWith(extension.toLowerCase()) ? extension : "";
      let n = 2;
      while (used.has(`${base} (${n})${suffix}`.toLowerCase())) n += 1;
      return `${base} (${n})${suffix}`;
    }

    function rowIcon(entry) {
      if (entry.kind === "drive") return local("drive");
      if (entry.kind === "share") return local("share");
      return ctx.ui.icon(FILE_ICON[entry.kind] || "notepad");
    }

    function baseEntries(actualDir, state) {
      const rows = [];
      const seen = new Set();
      const add = (entry) => {
        if (seen.has(entry.key)) return;
        seen.add(entry.key);
        if (hiddenPath(entry.actualPath, state)) return;
        rows.push(entry);
      };

      const displayDir = actualDir;
      for (const item of ctx.world.files.list(actualDir)) {
        const name = item.name;
        const isFolder = item.kind === "folder";
        const fullActual = `${actualDir}/${name}`;
        add({
          key: `actual:${fullActual}`,
          name,
          kind: item.kind,
          size: item.size || "",
          modified: item.modified || "",
          path: actualDir,
          actualPath: fullActual,
          openPath: displayDir && `${displayDir}/${name}`,
          file: isFolder ? null : item,
        });
      }

      for (const folder of state.folders) {
        if (folder.path !== actualDir) continue;
        const fullActual = `${actualDir}/${folder.name}`;
        add({
          key: `actual:${fullActual}`,
          name: folder.name,
          kind: "folder",
          size: "",
          modified: folder.modified || stampNow(),
          path: actualDir,
          actualPath: fullActual,
          openPath: `${displayDir}/${folder.name}`,
          overlayFolder: folder,
        });
      }

      for (const file of state.virtual) {
        if (file.path !== actualDir) continue;
        const fullActual = `${actualDir}/${file.name}`;
        add({
          key: `actual:${fullActual}`,
          name: file.name,
          kind: file.kind,
          size: file.size || "",
          modified: file.modified || stampNow(),
          path: actualDir,
          actualPath: fullActual,
          virtual: file,
        });
      }

      return rows;
    }

    function entriesFor(displayDir, state = read()) {
      if (displayDir === HOME) {
        return QUICK_FOLDERS.map((name) => ({
          key: `actual:${USER_ROOT}/${name}`,
          name,
          kind: "folder",
          size: "",
          modified: "",
          path: USER_ROOT,
          actualPath: `${USER_ROOT}/${name}`,
          openPath: `${USER_ROOT}/${name}`,
        }));
      }

      if (displayDir === THIS_PC) {
        const rows = [];
        const drive = DRIVES[0];
        rows.push({
          key: `drive:${drive.id}`,
          name: `Local Disk (${drive.letter})`,
          kind: "drive",
          size: "",
          modified: "",
          path: THIS_PC,
          actualPath: `${drive.letter}/`,
          openPath: `${drive.letter}/`,
        });
        for (const name of QUICK_FOLDERS) {
          rows.push({
            key: `actual:${USER_ROOT}/${name}`,
            name,
            kind: "folder",
            size: "",
            modified: "15/11/2026 09:00",
            path: USER_ROOT,
            actualPath: `${USER_ROOT}/${name}`,
            openPath: `${USER_ROOT}/${name}`,
          });
        }
        for (const share of ctx.world.files.shares()) {
          rows.push(shareEntry(share));
        }
        return rows;
      }

      if (displayDir === GALLERY) {
        return ctx.world.files
          .items()
          .filter((item) => item.kind === "image" && !hiddenPath(`${item.path}/${item.name}`, state))
          .map((item) => ({
            key: `actual:${item.path}/${item.name}`,
            name: item.name,
            kind: item.kind,
            size: item.size || "",
            modified: item.modified || "",
            path: item.path,
            actualPath: `${item.path}/${item.name}`,
            file: item,
          }));
      }

      if (displayDir === ONEDRIVE) return [];

      if (displayDir === NETWORK || displayDir === "//HALCYON") {
        return ctx.world.files.shares().map(shareEntry);
      }

      const actualDir = actualPath(displayDir, state);
      const rows = baseEntries(actualDir, state).map((entry) => ({
        ...entry,
        displayParent: displayDir,
        displayPath: `${displayDir}/${entry.name}`,
        openPath: entry.kind === "folder" ? `${displayDir}/${entry.name}` : entry.openPath,
      }));
      for (const redirect of state.redirects) {
        const parent = redirect.virtual.split("/").slice(0, -1).join("/");
        if (parent !== displayDir) continue;
        const name = redirect.virtual.split("/").filter(Boolean).pop();
        rows.push({
          key: `redirect:${redirect.virtual}`,
          name,
          kind: "folder",
          size: "",
          modified: "",
          path: displayDir,
          actualPath: redirect.actual,
          openPath: redirect.virtual,
          redirect,
        });
      }
      return rows;
    }

    function shareEntry(share) {
      return {
        key: `share:${share.id}`,
        name: share.label,
        kind: "share",
        size: "",
        modified: "",
        path: NETWORK,
        actualPath: norm(share.path),
        share,
      };
    }

    // -----------------------------------------------------------------------
    // sorting and formatting
    // -----------------------------------------------------------------------

    function sortRank(entry) {
      if (entry.kind === "folder") return 0;
      if (entry.kind === "drive") return 1;
      if (entry.kind === "share") return 2;
      return 3;
    }

    const sizeValue = (value) => {
      const match = String(value || "").match(/([\d.]+)\s*(KB|MB|GB)/i);
      if (!match) return 0;
      const unit = match[2].toUpperCase();
      return Number(match[1]) * (unit === "GB" ? 1024 * 1024 : unit === "MB" ? 1024 : 1);
    };

    const dateValue = (value) => {
      const match = String(value || "").match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/);
      if (!match) return 0;
      return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]), Number(match[4] || 0), Number(match[5] || 0)).getTime();
    };

    function sortRows(rows, state) {
      const direction = state.sortDir === -1 ? -1 : 1;
      return rows.sort((a, b) => {
        const rank = sortRank(a) - sortRank(b);
        if (rank !== 0) return rank;
        let result = 0;
        if (state.sortKey === "date") result = dateValue(a.modified) - dateValue(b.modified);
        else if (state.sortKey === "type") result = typeOf(a).localeCompare(typeOf(b)) || a.name.localeCompare(b.name);
        else if (state.sortKey === "size") result = sizeValue(a.size) - sizeValue(b.size) || a.name.localeCompare(b.name);
        else result = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
        return result * direction;
      });
    }

    function rowsFor(displayDir, state = read()) {
      const query = state.query.trim().toLowerCase();
      const rows = entriesFor(displayDir, state).filter((entry) => !query || entry.name.toLowerCase().includes(query));
      return sortRows(rows, state);
    }

    // -----------------------------------------------------------------------
    // navigation
    // -----------------------------------------------------------------------

    function saveTabPath(path, { replace = false } = {}) {
      const state = read();
      const current = activeTab(state);
      const tabs = state.tabs.map((tab) => {
        if (tab.id !== current.id) return tab;
        const history = replace ? tab.history : [...(tab.history || []), current.path].slice(-40);
        return { ...tab, path, history, forward: [] };
      });
      save({ tabs, selected: null, query: "" });
    }

    function navigate(path, options) {
      if (!path) return;
      saveTabPath(path, options);
    }

    function goBack() {
      const state = read();
      const current = activeTab(state);
      const history = current.history || [];
      if (!history.length) return;
      const previous = history[history.length - 1];
      const tabs = state.tabs.map((tab) =>
        tab.id === current.id
          ? { ...tab, path: previous, history: history.slice(0, -1), forward: [current.path, ...(tab.forward || [])].slice(0, 40) }
          : tab,
      );
      save({ tabs, selected: null, query: "" });
    }

    function goForward() {
      const state = read();
      const current = activeTab(state);
      const forward = current.forward || [];
      if (!forward.length) return;
      const next = forward[0];
      const tabs = state.tabs.map((tab) =>
        tab.id === current.id
          ? { ...tab, path: next, history: [...(tab.history || []), current.path].slice(-40), forward: forward.slice(1) }
          : tab,
      );
      save({ tabs, selected: null, query: "" });
    }

    function newTab(path = null, focus = true) {
      const state = read();
      const target = path || activePath(state);
      tabUid += 1;
      const tab = { id: `tab_${Date.now().toString(36)}_${tabUid}`, path: target, history: [], forward: [] };
      save({ tabs: [...state.tabs, tab], activeTab: focus ? tab.id : state.activeTab, selected: null, query: "" });
    }

    function closeTab(id) {
      const state = read();
      if (state.tabs.length === 1) return;
      const index = state.tabs.findIndex((tab) => tab.id === id);
      const tabs = state.tabs.filter((tab) => tab.id !== id);
      const active = state.activeTab === id ? tabs[Math.max(0, index - 1)].id : state.activeTab;
      save({ tabs, activeTab: active, selected: null, query: "" });
    }

    function openShare(share) {
      if (accessFor(share.id) === "none") {
        ctx.ui.alert(
          "Access is denied",
          `You don't currently have permission to access this folder.\n\n${share.path}\n\nAsk IT for access to the ${share.label} share.`,
        );
        return;
      }
      navigate(norm(share.path));
    }

    function openRow(entry) {
      if (!entry) return;
      if (entry.kind === "folder") {
        navigate(entry.openPath || `${entry.path}/${entry.name}`);
        return;
      }
      if (entry.kind === "drive") {
        navigate(entry.openPath);
        return;
      }
      if (entry.kind === "share") {
        openShare(entry.share);
        return;
      }
      if (entry.kind === "text") {
        ctx.open("notepad", { path: entry.path, name: entry.name });
        return;
      }
      if (entry.kind === "registry") {
        openRegistry(entry);
        return;
      }
      if (entry.kind === "exe") {
        ctx.ui.toast("Windows protected your PC", `${entry.name} was blocked by IT policy. Nice try.`, "terminal");
        return;
      }
      ctx.ui.toast("File Explorer", `Nothing on this PC opens ${entry.name}.`, "folder");
    }

    async function openRegistry(entry) {
      const machine = ctx.world.machines.byOwner(technician());
      if (!machine || !entry.file) return;
      const ok = await ctx.ui.confirm(
        "Registry Editor",
        `Import ${entry.name}?\n\n${entry.path}/${entry.name}\n\nThis writes policy keys for every user on ${machine.hostname}.`,
        { ok: "Yes", cancel: "No" },
      );
      if (!ok) return;
      const result = ctx.actions.importRegistry(machine.id, entry.file.id);
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

    // -----------------------------------------------------------------------
    // file operations
    // -----------------------------------------------------------------------

    function selectedRow(state = read()) {
      const rows = entriesFor(activePath(state), state);
      return rows.find((entry) => entry.key === state.selected) || null;
    }

    function currentNames(state = read()) {
      return rowsFor(activePath(state), state).map((entry) => entry.name);
    }

    function targetDirectory(state = read()) {
      return actualPath(activePath(state), state);
    }

    function unhide(state, key) {
      state.hidden = state.hidden.filter((path) => path !== key);
      state.hiddenPrefixes = state.hiddenPrefixes.filter((path) => path !== key);
    }

    function createFolder() {
      const state = read();
      const display = activePath(state);
      if (!isWritable(display, state)) {
        ctx.ui.toast("File Explorer", "Choose a folder on this PC first.", "folder");
        return;
      }
      const directory = targetDirectory(state);
      const name = uniqueName(currentNames(state), "New folder");
      const full = `${directory}/${name}`;
      unhide(state, full);
      state.folders.push({ path: directory, name, modified: stampNow() });
      const key = `actual:${full}`;
      save({ folders: state.folders, hidden: state.hidden, hiddenPrefixes: state.hiddenPrefixes, selected: key });
      renaming = key;
      paint();
    }

    function createTextFile() {
      const state = read();
      const display = activePath(state);
      if (!isWritable(display, state)) {
        ctx.ui.toast("File Explorer", "Choose a folder on this PC first.", "folder");
        return;
      }
      const directory = targetDirectory(state);
      const name = uniqueName(currentNames(state), "New Text Document.txt", ".txt");
      const result = ctx.actions.saveFile({ path: directory, name, contents: "", kind: "text" });
      if (!result.ok) {
        ctx.ui.toast("File Explorer", `Could not create the file: ${result.reason}.`, "folder");
        return;
      }
      const full = `${directory}/${name}`;
      const current = read();
      unhide(current, full);
      save({ hidden: current.hidden, hiddenPrefixes: current.hiddenPrefixes, selected: `actual:${full}` });
    }

    function copySelection(mode) {
      const state = read();
      const entry = selectedRow(state);
      if (!entry) return;
      if (entry.kind === "drive" || entry.kind === "share") {
        ctx.ui.toast("File Explorer", "That item cannot be cut or copied here.", "folder");
        return;
      }
      const contents = entry.file?.contents ?? entry.virtual?.contents ?? null;
      const clipboard = {
        mode,
        item: {
          kind: entry.kind,
          name: entry.name,
          path: entry.path,
          actualPath: entry.actualPath,
          displayPath: entry.openPath || entry.actualPath,
          size: entry.size,
          modified: entry.modified,
          contents,
          isFolder: entry.kind === "folder",
        },
      };
      save({ clipboard });
      ctx.ui.toast("File Explorer", `${entry.name} ${mode === "cut" ? "cut" : "copied"}.`, "folder");
    }

    function writeFile(directory, name, item, state) {
      const textLike = item.kind === "text" || item.kind === "registry" || typeof item.contents === "string";
      if (textLike) {
        const result = ctx.actions.saveFile({ path: directory, name, contents: item.contents ?? "", kind: item.kind || "text" });
        return result.ok;
      }
      state.virtual.push({
        id: `vf_${Date.now().toString(36)}_${state.virtual.length + 1}`,
        path: directory,
        name,
        kind: item.kind || "text",
        size: item.size || "",
        modified: stampNow(),
        contents: null,
      });
      return true;
    }

    function collectChildren(actualDir, state) {
      return baseEntries(actualDir, state).filter((entry) => !hiddenPath(entry.actualPath, state));
    }

    function copyTree(sourceActual, destinationActual, name, state) {
      const targetDirectoryPath = `${destinationActual}/${name}`;
      state.folders.push({ path: destinationActual, name, modified: stampNow() });
      for (const child of collectChildren(sourceActual, state)) {
        if (child.kind === "folder") {
          copyTree(child.actualPath, targetDirectoryPath, child.name, state);
        } else {
          writeFile(targetDirectoryPath, child.name, child, state);
        }
      }
    }

    function paste() {
      const state = read();
      const clipboard = state.clipboard;
      if (!clipboard) return;
      const display = activePath(state);
      if (!isWritable(display, state)) {
        ctx.ui.toast("File Explorer", "Choose a folder on this PC first.", "folder");
        return;
      }
      const directory = targetDirectory(state);
      const item = clipboard.item;
      const names = currentNames(state);

      if (item.isFolder) {
        if (directory === item.actualPath || directory.startsWith(`${item.actualPath}/`)) {
          ctx.ui.toast("File Explorer", "You cannot move a folder into itself.", "folder");
          return;
        }
        const baseName = clipboard.mode === "copy" ? `${item.name} - Copy` : item.name;
        const name = uniqueName(names, baseName);
        if (clipboard.mode === "cut") {
          const virtual = `${display}/${name}`;
          state.redirects = state.redirects.filter((redirect) => redirect.actual !== item.actualPath && redirect.virtual !== item.displayPath);
          state.redirects.push({ virtual, actual: item.actualPath });
          state.hidden = [...new Set([...state.hidden, item.actualPath])];
          save({
            redirects: state.redirects,
            hidden: state.hidden,
            clipboard: null,
            selected: `redirect:${virtual}`,
          });
        } else {
          copyTree(item.actualPath, directory, name, state);
          save({ folders: state.folders, virtual: state.virtual, selected: `actual:${directory}/${name}` });
        }
        return;
      }

      const extension = extensionOf(item.name);
      const name = uniqueName(names, item.name, extension);
      const ok = writeFile(directory, name, item, state);
      if (!ok) {
        ctx.ui.toast("File Explorer", "The paste did not complete.", "folder");
        return;
      }
      const full = `${directory}/${name}`;
      if (clipboard.mode === "cut") {
        state.hidden = [...new Set([...state.hidden, item.actualPath])];
      }
      unhide(state, full);
      save({
        virtual: state.virtual,
        hidden: state.hidden,
        hiddenPrefixes: state.hiddenPrefixes,
        clipboard: clipboard.mode === "cut" ? null : state.clipboard,
        selected: `actual:${full}`,
      });
    }

    function startRename(key = read().selected) {
      if (!key) return;
      const entry = entriesFor(activePath(read()), read()).find((row) => row.key === key);
      if (!entry || entry.kind === "drive" || entry.kind === "share") return;
      renaming = key;
      paint();
    }

    function commitRename(value) {
      const key = renaming;
      if (!key) return;
      renaming = null;
      const name = String(value || "").trim();
      if (!name) {
        paint();
        return;
      }
      if (/[<>:"/\\|?*]/.test(name) || name === "." || name === "..") {
        ctx.ui.toast("File Explorer", "A file name cannot contain any of these characters: \\ / : * ? \" < > |", "folder");
        paint();
        return;
      }
      const state = read();
      const entry = entriesFor(activePath(state), state).find((row) => row.key === key);
      if (!entry) {
        paint();
        return;
      }
      if (name === entry.name) {
        paint();
        return;
      }
      const names = currentNames(state).filter((existing) => existing !== entry.name);
      if (names.some((existing) => existing.toLowerCase() === name.toLowerCase())) {
        ctx.ui.toast("File Explorer", "There is already an item with that name in this folder.", "folder");
        paint();
        return;
      }

      if (entry.kind === "folder") {
        const oldDisplay = entry.openPath || `${entry.displayParent || entry.path}/${entry.name}`;
        const virtual = `${entry.displayParent || entry.path}/${name}`;
        state.redirects = state.redirects
          .filter((redirect) => redirect.actual !== entry.actualPath)
          .map((redirect) =>
            redirect.virtual === oldDisplay || redirect.virtual.startsWith(`${oldDisplay}/`)
              ? { ...redirect, virtual: `${virtual}${redirect.virtual.slice(oldDisplay.length)}` }
              : redirect,
          );
        state.redirects.push({ virtual, actual: entry.actualPath });
        unhide(state, entry.actualPath);
        state.hidden = [...new Set([...state.hidden, entry.actualPath])];
        save({
          redirects: state.redirects,
          hidden: state.hidden,
          hiddenPrefixes: state.hiddenPrefixes,
          selected: `redirect:${virtual}`,
        });
        return;
      }

      if (entry.virtual) {
        entry.virtual.name = name;
        const full = `${entry.path}/${name}`;
        unhide(state, full);
        save({ virtual: state.virtual, hidden: state.hidden, hiddenPrefixes: state.hiddenPrefixes, selected: `actual:${full}` });
        return;
      }

      if (entry.file) {
        const result = ctx.actions.saveFile({
          path: entry.path,
          name,
          contents: entry.file.contents ?? "",
          kind: entry.file.kind,
        });
        if (!result.ok) {
          ctx.ui.toast("File Explorer", `Could not rename the item: ${result.reason}.`, "folder");
          paint();
          return;
        }
        const full = `${entry.path}/${name}`;
        state.hidden = [...new Set([...state.hidden, entry.actualPath])];
        unhide(state, full);
        save({ hidden: state.hidden, hiddenPrefixes: state.hiddenPrefixes, selected: `actual:${full}` });
      }
    }

    async function deleteSelection() {
      const state = read();
      const entry = selectedRow(state);
      if (!entry) return;
      if (entry.kind === "drive" || entry.kind === "share") {
        ctx.ui.toast("File Explorer", "This item cannot be deleted from here.", "folder");
        return;
      }
      const what = entry.kind === "folder" ? "folder" : "file";
      const ok = await ctx.ui.confirm(
        `Delete ${what}`,
        `Are you sure you want to move this ${what} to the Recycle Bin?\n\n${entry.name}`,
        { ok: "Yes", cancel: "No" },
      );
      if (!ok) return;

      const current = read();
      if (entry.kind === "folder") {
        current.hiddenPrefixes = [...new Set([...current.hiddenPrefixes, entry.actualPath])];
        current.redirects = current.redirects.filter(
          (redirect) => redirect.actual !== entry.actualPath && redirect.virtual !== entry.openPath,
        );
      }
      current.hidden = [...new Set([...current.hidden, entry.actualPath])];
      current.bin = [
        ...current.bin,
        {
          id: `bin_${Date.now().toString(36)}`,
          name: entry.name,
          kind: entry.kind,
          size: entry.size || "",
          deletedAt: stampNow(),
          path: entry.actualPath,
        },
      ].slice(-50);
      save({
        hidden: current.hidden,
        hiddenPrefixes: current.hiddenPrefixes,
        redirects: current.redirects,
        bin: current.bin,
        selected: null,
        clipboard: null,
      });
      ctx.ui.toast("File Explorer", `${entry.name} moved to the Recycle Bin.`, "bin");
    }

    function shareSelection() {
      const entry = selectedRow();
      if (!entry) return;
      ctx.ui.alert(
        "Share",
        `Share "${entry.name}"\n\nHALCYON\\${logonName()} has ${entry.kind === "folder" ? "Modify" : "Read"} access.\n\nExternal sharing is blocked by company policy. Ask IT if someone outside Halcyon needs a copy.`,
      );
    }

    // -----------------------------------------------------------------------
    // properties
    // -----------------------------------------------------------------------

    const ACCESS_LABEL = { none: "None", read: "Read & execute", modify: "Modify" };

    function aclForEntry(entry) {
      if (entry.kind === "share") {
        return entry.share.acl.map((ace) => ({
          principal: ctx.world.org.group(ace.groupId)?.name || ace.groupId,
          access: ACCESS_LABEL[ace.access] || ace.access,
        }));
      }
      return [
        { principal: "SYSTEM", access: "Full control" },
        { principal: "Administrators (DESKTOP-8H2K9L\\Administrators)", access: "Full control" },
        { principal: `${logonName()} (HALCYON\\${logonName()})`, access: "Modify" },
        { principal: "Users (HALCYON\\Users)", access: "Read & execute" },
      ];
    }

    function propertiesFor(entry) {
      const isShare = entry.kind === "share";
      const location = isShare ? entry.share.path : entry.path === THIS_PC ? THIS_PC : entry.path;
      const effective = isShare ? ACCESS_LABEL[accessFor(entry.share.id)] || "None" : "Modify";
      const acl = aclForEntry(entry);
      const size = displaySize(entry) || "—";
      const modified = entry.modified || "—";
      const kind = typeOf(entry);

      const securityRows = acl
        .map((ace) => `<div class="props-row"><span>${ctx.ui.esc(ace.principal)}</span><b>${ctx.ui.esc(ace.access)}</b></div>`)
        .join("");

      const html = `
        <div class="app-explorer props-dialog">
          <h2>${ctx.ui.esc(entry.name)} Properties</h2>
          <div class="props-tabs">
            <button class="sel" data-props-tab="general">General</button>
            <button data-props-tab="security">Security</button>
          </div>
          <div class="props-panel" data-props-panel="general">
            <div class="props-head">${iconMarkup(entry)}<span>${ctx.ui.esc(kind)}</span></div>
            <div class="props-row"><span>Type</span><b>${ctx.ui.esc(kind)}</b></div>
            <div class="props-row"><span>Location</span><b>${ctx.ui.esc(location)}</b></div>
            <div class="props-row"><span>Size</span><b>${ctx.ui.esc(size)}</b></div>
            <div class="props-row"><span>Modified</span><b>${ctx.ui.esc(modified)}</b></div>
            <div class="props-row"><span>Owner</span><b>HALCYON\\${ctx.ui.esc(logonName())}</b></div>
            <div class="props-row"><span>Attributes</span><b>${isShare ? "Network share" : entry.kind === "folder" ? "Directory" : "Archive"}</b></div>
          </div>
          <div class="props-panel" data-props-panel="security" hidden>
            <p class="props-note">${ctx.ui.esc(isShare ? "Share permissions on HALCYON." : "Permissions inherited from this folder.")}</p>
            <div class="props-table">
              <div class="props-tr head"><span>Group or user name</span><span>Permissions</span></div>
              ${securityRows}
            </div>
            <div class="props-effective">
              ${local("shield")}
              <span>Effective access for HALCYON\\${ctx.ui.esc(logonName())}: <b>${ctx.ui.esc(effective)}</b></span>
            </div>
          </div>
          <div class="props-foot">
            <button class="btn primary" data-props-ok>OK</button>
            <button class="btn" data-props-cancel>Cancel</button>
          </div>
        </div>`;

      ctx.ui.dialog({
        html,
        wire: (card) => {
          const show = (tab) => {
            for (const button of card.querySelectorAll("[data-props-tab]")) {
              button.classList.toggle("sel", button.dataset.propsTab === tab);
            }
            for (const panel of card.querySelectorAll("[data-props-panel]")) {
              panel.hidden = panel.dataset.propsPanel !== tab;
            }
          };
          for (const button of card.querySelectorAll("[data-props-tab]")) {
            button.addEventListener("click", () => show(button.dataset.propsTab));
          }
          card.querySelector("[data-props-ok]").addEventListener("click", () => ctx.ui.closeDialog());
          card.querySelector("[data-props-cancel]").addEventListener("click", () => ctx.ui.closeDialog());
        },
      });
    }

    // -----------------------------------------------------------------------
    // menus
    // -----------------------------------------------------------------------

    function menuNew(anchor) {
      const rect = anchor.getBoundingClientRect();
      ctx.ui.menu(rect.left, rect.bottom + 4, [
        { label: "Folder", icon: "folder", shortcut: "Ctrl+Shift+N", onClick: createFolder },
        { label: "Text document", icon: "notepad", onClick: createTextFile },
        { separator: true },
        { label: "Shortcut", disabled: true },
        { label: "Compressed (zipped) folder", disabled: true },
      ]);
    }

    function menuSort(anchor, state) {
      const rect = anchor.getBoundingClientRect();
      const pick = (key) => () => save({ sortKey: key });
      ctx.ui.menu(rect.left, rect.bottom + 4, [
        { label: "Name", checked: state.sortKey === "name", onClick: pick("name") },
        { label: "Date modified", checked: state.sortKey === "date", onClick: pick("date") },
        { label: "Type", checked: state.sortKey === "type", onClick: pick("type") },
        { label: "Size", checked: state.sortKey === "size", onClick: pick("size") },
        { separator: true },
        { label: "Ascending", checked: state.sortDir === 1, onClick: () => save({ sortDir: 1 }) },
        { label: "Descending", checked: state.sortDir === -1, onClick: () => save({ sortDir: -1 }) },
      ]);
    }

    function menuView(anchor, state) {
      const rect = anchor.getBoundingClientRect();
      ctx.ui.menu(
        rect.left,
        rect.bottom + 4,
        VIEWS.map(([id, label]) => ({
          label,
          checked: state.view === id,
          onClick: () => save({ view: id }),
        })),
      );
    }

    function openInNewTab(entry) {
      if (!entry) return;
      if (entry.kind === "share") {
        if (accessFor(entry.share.id) === "none") {
          openShare(entry.share);
          return;
        }
        newTab(norm(entry.share.path));
        return;
      }
      newTab(entry.openPath || entry.path);
    }

    function menuMore(anchor) {
      const rect = anchor.getBoundingClientRect();
      const entry = selectedRow();
      ctx.ui.menu(rect.left, rect.bottom + 4, [
        { label: "Properties", icon: "$info", disabled: !entry, onClick: () => entry && propertiesFor(entry) },
        { label: "Open in new tab", icon: "openTab", disabled: !entry, onClick: () => openInNewTab(entry) },
        { separator: true },
        { label: "Refresh", icon: "$refresh", onClick: () => paint() },
        { label: "Options", disabled: true },
      ]);
    }

    function rowMenu(entry, x, y) {
      const state = read();
      const isContainer = entry.kind === "folder" || entry.kind === "drive";
      const canEdit = entry.kind !== "drive" && entry.kind !== "share";
      ctx.ui.menu(x, y, [
        { label: "Open", onClick: () => openRow(entry) },
        { label: "Open in new tab", icon: "openTab", onClick: () => openInNewTab(entry) },
        { separator: true },
        { label: "Cut", icon: "$cut", shortcut: "Ctrl+X", disabled: !canEdit, onClick: () => copySelection("cut") },
        { label: "Copy", icon: "$copy", shortcut: "Ctrl+C", disabled: !canEdit, onClick: () => copySelection("copy") },
        {
          label: "Paste",
          icon: "$paste",
          shortcut: "Ctrl+V",
          disabled: !isContainer || !state.clipboard,
          onClick: () => {
            navigate(entry.openPath || `${entry.path}/${entry.name}`);
            paste();
          },
        },
        { separator: true },
        { label: "Rename", icon: "rename", shortcut: "F2", disabled: !canEdit, onClick: () => startRename(entry.key) },
        { label: "Delete", icon: "$trash", shortcut: "Del", danger: true, disabled: !canEdit, onClick: deleteSelection },
        { separator: true },
        { label: "Properties", icon: "properties", onClick: () => propertiesFor(entry) },
      ]);
    }

    function blankMenu(x, y) {
      const state = read();
      const writable = isWritable(activePath(state), state);
      ctx.ui.menu(x, y, [
        { label: "New folder", icon: "folder", disabled: !writable, onClick: createFolder },
        { label: "New text document", icon: "notepad", disabled: !writable, onClick: createTextFile },
        { label: "Paste", icon: "$paste", disabled: !writable || !state.clipboard, onClick: paste },
        { separator: true },
        {
          label: "Sort by",
          icon: "sort",
          submenu: [
            { label: "Name", checked: state.sortKey === "name", onClick: () => save({ sortKey: "name" }) },
            { label: "Date modified", checked: state.sortKey === "date", onClick: () => save({ sortKey: "date" }) },
            { label: "Type", checked: state.sortKey === "type", onClick: () => save({ sortKey: "type" }) },
            { label: "Size", checked: state.sortKey === "size", onClick: () => save({ sortKey: "size" }) },
          ],
        },
        {
          label: "View",
          icon: "view",
          submenu: VIEWS.map(([id, label]) => ({ label, checked: state.view === id, onClick: () => save({ view: id }) })),
        },
        { label: "Refresh", icon: "$refresh", onClick: () => paint() },
      ]);
    }

    // -----------------------------------------------------------------------
    // render
    // -----------------------------------------------------------------------

    function iconMarkup(entry, className = "") {
      const markup = rowIcon(entry);
      return className ? markup.replace("<svg ", `<svg class="${className}" `) : markup;
    }

    function commandButton(command, icon, label, options = {}) {
      const disabled = options.disabled ? " disabled" : "";
      const extra = options.trailing || "";
      const title = options.title || label;
      return `<button class="cmd${options.className ? ` ${options.className}` : ""}" data-cmd="${command}" title="${ctx.ui.esc(title)}"${disabled}>${icon}<span>${ctx.ui.esc(label)}</span>${extra}</button>`;
    }

    function crumbsMarkup(path) {
      return breadcrumbs(path)
        .map(
          (crumb, index, all) =>
            `<button class="crumb${index === all.length - 1 ? " here" : ""}" data-crumb="${ctx.ui.esc(crumb.path)}" title="${ctx.ui.esc(crumb.path)}">${ctx.ui.esc(crumb.label)}</button>${index < all.length - 1 ? `<span class="crumb-sep">${ctx.ui.icon("$chevron")}</span>` : ""}`,
        )
        .join("");
    }

    function navItem(path, label, icon, active) {
      return `<button class="nav-item${active ? " sel" : ""}" data-nav="${ctx.ui.esc(path)}">${icon}<span>${ctx.ui.esc(label)}</span></button>`;
    }

    function renderRows(rows, state, selectedKey) {
      if (state.view === "icons") {
        return `<div class="exp-tiles">${rows
          .map(
            (entry) => `<div class="tile${selectedKey === entry.key ? " sel" : ""}" role="option" tabindex="0" aria-selected="${selectedKey === entry.key}" data-row="${ctx.ui.esc(entry.key)}">
              <span class="tile-ico">${iconMarkup(entry)}</span>
              <span class="tile-name">${ctx.ui.esc(entry.name)}</span>
              <span class="tile-meta">${ctx.ui.esc(typeOf(entry))}</span>
            </div>`,
          )
          .join("")}</div>`;
      }

      return `<div class="exp-list" role="listbox">
        <div class="exp-row head"><span>Name</span><span>Date modified</span><span>Type</span><span class="size">Size</span></div>
        ${rows
          .map((entry) => {
            const isRenaming = renaming === entry.key;
            const nameCell = isRenaming
              ? `<input class="exp-rename" data-rename value="${ctx.ui.esc(entry.name)}" aria-label="New name">`
              : `<span class="nm-text">${ctx.ui.esc(entry.name)}</span>`;
            return `<div class="exp-row${selectedKey === entry.key ? " sel" : ""}${isRenaming ? " renaming" : ""}" role="option" tabindex="0" aria-selected="${selectedKey === entry.key}" data-row="${ctx.ui.esc(entry.key)}">
              <span class="nm">${iconMarkup(entry)}${nameCell}</span>
              <span class="meta">${ctx.ui.esc(entry.modified || "—")}</span>
              <span class="meta">${ctx.ui.esc(typeOf(entry))}</span>
              <span class="meta size">${ctx.ui.esc(displaySize(entry) || "")}</span>
            </div>`;
          })
          .join("")}
      </div>`;
    }

    function emptyMarkup(path, query) {
      if (path === ONEDRIVE) {
        return `<div class="exp-empty onedrive">${local("cloud")}<h3>OneDrive isn't set up</h3><p>This PC is joined to HALCYON. A work account can sign in to sync Documents, Desktop and Pictures.</p><button class="btn" disabled>Set up OneDrive</button></div>`;
      }
      if (query) {
        return `<div class="exp-empty">${local("gallery")}<h3>No items match your search</h3><p>Try a different name, or clear the search box.</p></div>`;
      }
      return `<div class="exp-empty">${ctx.ui.icon("folder")}<h3>This folder is empty</h3><p>${path.startsWith("//") ? "You have access to this share, but nothing is stored here yet." : "Drop something in, or use New in the command bar."}</p></div>`;
    }

    function paint() {
      const state = read();
      const path = activePath(state);
      const rows = rowsFor(path, state);
      const selected = rows.find((entry) => entry.key === state.selected) || null;
      const active = document.activeElement;
      const searchFocused = active?.matches?.('[data-focus="search"]');
      const searchCaret = searchFocused ? active.selectionStart : null;
      const rowFocused = Boolean(active?.dataset?.row);

      container.innerHTML = "";
      const root = ctx.ui.el(`
        <div class="exp" tabindex="-1">
          <div class="exp-tabs">
            <div class="tabs">
              ${state.tabs
                .map(
                  (tab) => `<div class="tab${tab.id === state.activeTab ? " on" : ""}" data-tab="${ctx.ui.esc(tab.id)}" title="${ctx.ui.esc(tab.path)}">
                    ${tabIcon(tab.path)}<span class="tab-name">${ctx.ui.esc(tabLabel(tab.path))}</span>
                    <button class="tab-x" data-close-tab="${ctx.ui.esc(tab.id)}" title="Close tab" aria-label="Close tab">${local("close")}</button>
                  </div>`,
                )
                .join("")}
            </div>
            <button class="tab-new" data-new-tab title="New tab" aria-label="New tab">${local("plus")}</button>
          </div>

          <div class="exp-cmd" role="toolbar" aria-label="File Explorer commands">
            ${commandButton("new", ctx.ui.icon("folder") + `<span class="plus-badge">+</span>`, "New", {
              disabled: !isWritable(path, state),
              trailing: ctx.ui.icon("$chevronDown"),
              title: "New (Ctrl+Shift+N)",
            })}
            <span class="cmd-sep"></span>
            ${commandButton("cut", ctx.ui.icon("$cut"), "Cut", { disabled: !selected || selected.kind === "drive" || selected.kind === "share", title: "Cut (Ctrl+X)" })}
            ${commandButton("copy", ctx.ui.icon("$copy"), "Copy", { disabled: !selected || selected.kind === "drive" || selected.kind === "share", title: "Copy (Ctrl+C)" })}
            ${commandButton("paste", ctx.ui.icon("$paste"), "Paste", { disabled: !state.clipboard || !isWritable(path, state), title: "Paste (Ctrl+V)" })}
            ${commandButton("rename", local("rename"), "Rename", { disabled: !selected || selected.kind === "drive" || selected.kind === "share", title: "Rename (F2)" })}
            ${commandButton("share", local("share"), "Share", { disabled: !selected, title: "Share" })}
            ${commandButton("delete", ctx.ui.icon("$trash"), "Delete", { disabled: !selected || selected.kind === "drive" || selected.kind === "share", title: "Delete (Del)" })}
            <span class="cmd-sep"></span>
            ${commandButton("sort", local("sort"), "Sort", { trailing: ctx.ui.icon("$chevronDown") })}
            ${commandButton("view", local("view"), "View", { trailing: ctx.ui.icon("$chevronDown") })}
            <span class="cmd-spacer"></span>
            ${commandButton("more", "···", "", { title: "More options" })}
          </div>

          <div class="exp-body">
            <aside class="exp-nav" aria-label="Navigation pane">
              ${navItem(HOME, "Home", local("home"), path === HOME)}
              ${navItem(GALLERY, "Gallery", local("gallery"), path === GALLERY)}
              ${navItem(ONEDRIVE, "OneDrive", local("cloud"), path === ONEDRIVE)}
              <div class="nav-group">
                <button class="nav-parent${path === THIS_PC ? " sel" : ""}" data-expand="thispc" data-nav-group="thispc" data-nav="${THIS_PC}">
                  <span class="nav-chev${expanded.has("thispc") ? " open" : ""}">${ctx.ui.icon("$chevron")}</span>${local("thispc")}<span>This PC</span>
                </button>
                ${
                  expanded.has("thispc")
                    ? `<div class="nav-children">
                        ${QUICK_FOLDERS.map((name) => navItem(`${USER_ROOT}/${name}`, name, ctx.ui.icon(name === "Pictures" ? "image" : "folder"), path === `${USER_ROOT}/${name}`)).join("")}
                        ${navItem("C:/", "Local Disk (C:)", local("drive"), path === "C:/")}
                      </div>`
                    : ""
                }
              </div>
              <div class="nav-group">
                <button class="nav-parent${path === NETWORK ? " sel" : ""}" data-expand="network" data-nav-group="network" data-nav="${NETWORK}">
                  <span class="nav-chev${expanded.has("network") ? " open" : ""}">${ctx.ui.icon("$chevron")}</span>${local("network")}<span>Network</span>
                </button>
                ${
                  expanded.has("network")
                    ? `<div class="nav-children">
                        ${ctx.world.files.shares().map((share) => `<button class="nav-item nav-share" data-share="${ctx.ui.esc(share.id)}" title="${ctx.ui.esc(share.path)}">${local("share")}<span>${ctx.ui.esc(share.label)}</span></button>`).join("")}
                      </div>`
                    : ""
                }
              </div>
              <div class="nav-foot">
                <span>${local("shield")}${accessFor("share_it") === "none" ? "No mapped shares" : "2 mapped shares"}</span>
              </div>
            </aside>

            <section class="exp-main">
              <div class="exp-address">
                <div class="nav-btns">
                  <button class="nav-btn" data-act="back" title="Back (Alt+Left)" ${(activeTab(state).history || []).length ? "" : "disabled"}>${ctx.ui.icon("$arrowLeft")}</button>
                  <button class="nav-btn" data-act="forward" title="Forward (Alt+Right)" ${(activeTab(state).forward || []).length ? "" : "disabled"}>${ctx.ui.icon("$arrowRight")}</button>
                  <button class="nav-btn" data-act="up" title="Up">${ctx.ui.icon("$up")}</button>
                  <button class="nav-btn" data-act="refresh" title="Refresh">${ctx.ui.icon("$refresh")}</button>
                </div>
                <div class="crumbs" aria-label="Address bar">${crumbsMarkup(path)}</div>
                <label class="exp-search">
                  ${ctx.ui.icon("$search")}
                  <input data-focus="search" value="${ctx.ui.esc(state.query)}" placeholder="Search ${ctx.ui.esc(tabLabel(path))}" spellcheck="false" autocomplete="off">
                </label>
              </div>

              <div class="exp-content view-${state.view}" data-content>
                ${rows.length ? renderRows(rows, state, state.selected) : emptyMarkup(path, state.query)}
              </div>

              <div class="exp-status">
                <span>${rows.length} ${rows.length === 1 ? "item" : "items"}</span>
                <span class="status-selected">${ctx.ui.esc(statusSelectedText(state, selected))}</span>
                <span class="status-spacer"></span>
                <div class="status-views">
                  <button class="${state.view === "details" ? "on" : ""}" data-view="details" title="Details">${local("details")}</button>
                  <button class="${state.view === "list" ? "on" : ""}" data-view="list" title="List">${local("list")}</button>
                  <button class="${state.view === "icons" ? "on" : ""}" data-view="icons" title="Large icons">${local("grid")}</button>
                </div>
              </div>
            </section>
          </div>
        </div>`);
      container.append(root);

      rendered = { state, rows };
      wire(root, state, rows);

      if (renaming) {
        const input = root.querySelector("[data-rename]");
        if (input) {
          input.focus();
          const dot = input.value.lastIndexOf(".");
          input.setSelectionRange(0, dot > 0 ? dot : input.value.length);
          input.addEventListener("keydown", (event) => {
            event.stopPropagation();
            if (event.key === "Enter") {
              event.preventDefault();
              commitRename(input.value);
            } else if (event.key === "Escape") {
              event.preventDefault();
              renaming = null;
              paint();
            }
          });
          input.addEventListener("blur", () => {
            if (renaming) commitRename(input.value);
          });
        }
      }

      if (searchFocused) {
        const input = root.querySelector('[data-focus="search"]');
        if (input) {
          input.focus();
          const caret = Math.min(searchCaret ?? input.value.length, input.value.length);
          input.setSelectionRange(caret, caret);
        }
      } else if (rowFocused && !renaming) {
        const next = [...root.querySelectorAll("[data-row]")].find((row) => row.dataset.row === state.selected);
        next?.focus({ preventScroll: true });
      } else if (!renaming && container.closest(".win")?.classList.contains("is-focused")) {
        // A repaint throws away the focused button. Keep the app keyboard-ready
        // while its window is the active one, so Ctrl+V after a nav click works.
        root.focus({ preventScroll: true });
      }
    }

    function statusSelectedText(state, selected) {
      if (selected) {
        return `${selected.name} selected · ${typeOf(selected)}${displaySize(selected) ? ` · ${displaySize(selected)}` : ""}`;
      }
      if (state.clipboard) {
        return `${state.clipboard.mode === "cut" ? "Ready to move" : "Ready to copy"} ${state.clipboard.item.name}`;
      }
      return "";
    }

    function selectRow(key) {
      const live = read();
      const visible = rendered.rows || [];
      const entry = visible.find((row) => row.key === key) || null;
      const nextKey = entry ? key : null;
      quietPaint = true;
      save({ selected: nextKey });
      quietPaint = false;
      if (rendered.state) rendered.state = { ...rendered.state, selected: nextKey };
      for (const node of container.querySelectorAll("[data-row]")) {
        const on = node.dataset.row === nextKey;
        node.classList.toggle("sel", on);
        node.setAttribute("aria-selected", on ? "true" : "false");
      }
      const status = container.querySelector(".status-selected");
      if (status) status.textContent = statusSelectedText(live, entry);
      const canEdit = Boolean(entry) && entry.kind !== "drive" && entry.kind !== "share";
      for (const command of ["cut", "copy", "rename", "delete"]) {
        const button = container.querySelector(`[data-cmd="${command}"]`);
        if (button) button.disabled = !canEdit;
      }
      const share = container.querySelector('[data-cmd="share"]');
      if (share) share.disabled = !entry;
      if (entry && document.activeElement?.dataset?.row) {
        const node = [...container.querySelectorAll("[data-row]")].find((row) => row.dataset.row === nextKey);
        node?.focus({ preventScroll: true });
      }
    }

    function wire(root, state, rows) {
      const path = activePath(state);

      const rowFor = (key) => rows.find((entry) => entry.key === key);

      for (const tab of root.querySelectorAll("[data-tab]")) {
        tab.addEventListener("click", (event) => {
          if (event.target.closest("[data-close-tab]")) return;
          save({ activeTab: tab.dataset.tab, selected: null, query: "" });
        });
      }
      for (const button of root.querySelectorAll("[data-close-tab]")) {
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          closeTab(button.dataset.closeTab);
        });
      }
      root.querySelector("[data-new-tab]").addEventListener("click", () => newTab());

      for (const button of root.querySelectorAll("[data-nav]")) {
        button.addEventListener("click", () => {
          const target = button.dataset.nav;
          if (target === "C:/") navigate("C:/");
          else navigate(target);
        });
      }
      for (const button of root.querySelectorAll("[data-share]")) {
        const share = ctx.world.files.shares().find((entry) => entry.id === button.dataset.share);
        button.addEventListener("click", () => {
          if (share) openShare(share);
        });
        button.addEventListener("contextmenu", (event) => {
          event.preventDefault();
          if (!share) return;
          const entry = shareEntry(share);
          ctx.ui.menu(event.clientX, event.clientY, [
            { label: "Open", onClick: () => openShare(share) },
            { separator: true },
            { label: "Properties", icon: "properties", onClick: () => propertiesFor(entry) },
          ]);
        });
      }
      for (const button of root.querySelectorAll("[data-nav-group]")) {
        button.addEventListener("click", () => {
          const group = button.dataset.navGroup;
          if (expanded.has(group)) expanded.delete(group);
          else expanded.add(group);
          paint();
        });
      }

      root.querySelector('[data-act="back"]').addEventListener("click", goBack);
      root.querySelector('[data-act="forward"]').addEventListener("click", goForward);
      root.querySelector('[data-act="up"]').addEventListener("click", () => navigate(parentOf(path)));
      root.querySelector('[data-act="refresh"]').addEventListener("click", () => paint());

      for (const button of root.querySelectorAll("[data-crumb]")) {
        button.addEventListener("click", () => navigate(button.dataset.crumb));
      }

      const search = root.querySelector('[data-focus="search"]');
      search.addEventListener("input", () => save({ query: search.value }));

      for (const button of root.querySelectorAll("[data-cmd]")) {
        button.addEventListener("click", () => {
          const command = button.dataset.cmd;
          if (command === "new") menuNew(button);
          else if (command === "cut") copySelection("cut");
          else if (command === "copy") copySelection("copy");
          else if (command === "paste") paste();
          else if (command === "rename") startRename();
          else if (command === "share") shareSelection();
          else if (command === "delete") deleteSelection();
          else if (command === "sort") menuSort(button, state);
          else if (command === "view") menuView(button, state);
          else if (command === "more") menuMore(button);
        });
      }

      for (const button of root.querySelectorAll("[data-view]")) {
        button.addEventListener("click", () => save({ view: button.dataset.view }));
      }

      for (const row of root.querySelectorAll("[data-row]")) {
        const entry = rowFor(row.dataset.row);
        if (!entry) continue;
        row.addEventListener("click", () => {
          if (renaming) return;
          row.focus({ preventScroll: true });
          selectRow(entry.key);
        });
        row.addEventListener("dblclick", () => openRow(entry));
        row.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.stopPropagation();
            openRow(entry);
          } else if (event.key === "F2") {
            event.preventDefault();
            event.stopPropagation();
            selectRow(entry.key);
            startRename(entry.key);
          } else if (event.key === "Delete") {
            event.preventDefault();
            event.stopPropagation();
            selectRow(entry.key);
            deleteSelection();
          }
        });
        row.addEventListener("contextmenu", (event) => {
          event.preventDefault();
          selectRow(entry.key);
          rowMenu(entry, event.clientX, event.clientY);
        });
      }

      const content = root.querySelector("[data-content]");
      content.addEventListener("contextmenu", (event) => {
        if (event.target.closest("[data-row]")) return;
        event.preventDefault();
        blankMenu(event.clientX, event.clientY);
      });

      // Keyboard support sits on the app shell so it works whether focus is on
      // a row, the breadcrumb or the empty space.
      root.addEventListener("keydown", (event) => {
        const target = event.target;
        if (target.matches("input, textarea") || renaming) return;
        const live = read();
        const list = rendered.rows || [];
        const current = list.find((entry) => entry.key === live.selected) || null;
        const index = list.findIndex((entry) => entry.key === live.selected);
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          if (!list.length) return;
          event.preventDefault();
          const next = event.key === "ArrowDown" ? Math.min(list.length - 1, index + 1) : Math.max(0, index <= 0 ? 0 : index - 1);
          selectRow(list[next].key);
        } else if (event.key === "Enter" && current) {
          event.preventDefault();
          openRow(current);
        } else if (event.key === "Backspace" && !event.ctrlKey) {
          event.preventDefault();
          navigate(parentOf(activePath(live)));
        } else if (event.key === "F2") {
          event.preventDefault();
          startRename(live.selected);
        } else if (event.key === "Delete") {
          event.preventDefault();
          deleteSelection();
        } else if (event.ctrlKey && event.key.toLowerCase() === "c") {
          event.preventDefault();
          copySelection("copy");
        } else if (event.ctrlKey && event.key.toLowerCase() === "x") {
          event.preventDefault();
          copySelection("cut");
        } else if (event.ctrlKey && event.key.toLowerCase() === "v") {
          event.preventDefault();
          paste();
        } else if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "n") {
          event.preventDefault();
          createFolder();
        } else if (event.altKey && event.key === "ArrowLeft") {
          event.preventDefault();
          goBack();
        } else if (event.altKey && event.key === "ArrowRight") {
          event.preventDefault();
          goForward();
        }
      });

      // Keep the row's own focus when a pointer lands on it; only give the
      // shell focus when the user clicks empty chrome.
      root.addEventListener("pointerdown", (event) => {
        if (!event.target.closest("[data-row], button, input, [data-crumb]")) {
          root.focus({ preventScroll: true });
        }
      }, { passive: true });
    }

    // -----------------------------------------------------------------------
    // mount
    // -----------------------------------------------------------------------

    const incoming = ctx.options?.path;
    if (incoming) {
      const target = [HOME, GALLERY, ONEDRIVE, THIS_PC, NETWORK].includes(incoming)
        ? incoming
        : incoming.startsWith("//")
          ? norm(incoming)
          : norm(incoming.startsWith("C:") ? incoming : `${USER_ROOT}/${incoming}`);
      const state = read();
      const tabs = state.tabs.map((tab) =>
        tab.id === state.activeTab ? { ...tab, path: target, history: [], forward: [] } : tab,
      );
      save({ tabs, selected: null, query: "" });
    }

    const offEvents = ctx.events.on("*", () => {
      if (quietPaint) {
        quietPaint = false;
        return;
      }
      paint();
    });
    instances.set(container, { offEvents });
    paint();
  },

  unmount(container) {
    instances.get(container)?.offEvents?.();
    instances.delete(container);
  },
};
