// Registry Editor (regedit.exe). Shell only: a two-pane key tree and value
// list over a mock registry. The seeded content is copied into
// session.ui("regedit") on first open and every edit lives there; export writes
// a .reg file into the mock file system, import merges one back in.

import { createRegistrySeed, EXPORT_FOLDER, FAVORITES, HIVES } from "../../content/registry.js";
import {
  applyImport,
  allKeyPaths,
  ancestorsOf,
  childPaths,
  childrenOf,
  DEFAULT_VALUE,
  displayValues,
  eq,
  exportReg,
  findValue,
  flattenTree,
  formatValueData,
  isHive,
  keyRecord,
  leafName,
  parentPath,
  parseReg,
  ROOT,
} from "./model.js";

const DEFAULT_SELECTION = "HKEY_LOCAL_MACHINE\\SOFTWARE\\Policies\\Halcyon\\Endpoint";
const SEEDED_SECOND_BRANCH = "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Run";

const INPUT_STYLE =
  "width:100%;box-sizing:border-box;background:#1c1c1c;border:1px solid #6b6b6b;border-radius:3px;padding:6px 8px;color:#f2f2f2;font-size:13px;outline:none";
const LABEL_STYLE = "display:block;font-size:12px;color:#c9c9c9;margin:12px 0 4px";
const SELECT_STYLE =
  "width:100%;box-sizing:border-box;background:#1c1c1c;border:1px solid #6b6b6b;border-radius:3px;padding:4px;color:#f2f2f2;font-size:12.5px";
const CHECK_STYLE = "display:flex;align-items:center;gap:5px;font-size:12.5px;color:#d8d8d8";

const PROTECTED_PREFIXES = ["hkey_local_machine\\software\\policies", "hkey_local_machine\\system"];

export default {
  id: "regedit",
  title: "Registry Editor",
  icon: "regedit",
  size: [920, 600],
  desktop: true,
  pinned: true,
  order: 11,
  position: [120, 30],

  mount(container, ctx) {
    ctx.ui.styles("regedit", css);

    const uiState = () => ctx.world.session.ui("regedit");
    const commit = (patch) => ctx.actions.setUi("regedit", patch);
    let findState = { term: "", options: { keys: true, values: true, data: true } };
    let pendingTreeFocus = false;
    let pendingValueFocus = false;
    let openDialogAbort = null;

    // ---------------------------------------------------------------- state
    function ensureState() {
      const current = uiState();
      if (current.initialized && Array.isArray(current.keys)) return;
      const keys = createRegistrySeed();
      const selected = keyRecord(keys, DEFAULT_SELECTION)?.path || keys[0]?.path || ROOT;
      ctx.actions.setUi("regedit", {
        initialized: true,
        keys,
        selected,
        selectedValue: "BlockUsbStorage",
        expanded: expandedFor(selected, SEEDED_SECOND_BRANCH),
        favorites: FAVORITES.map((favorite) => ({ ...favorite })),
      });
    }

    function expandedFor(...paths) {
      const seen = new Map();
      for (const path of paths) {
        for (const ancestor of ancestorsOf(path)) {
          const key = ancestor.toLowerCase();
          if (!seen.has(key)) seen.set(key, ancestor);
        }
      }
      return [...seen.values()];
    }

    function expandPaths(state, ...paths) {
      const seen = new Set((state.expanded || []).map((path) => path.toLowerCase()));
      const next = [...(state.expanded || [])];
      for (const path of paths) {
        for (const ancestor of ancestorsOf(path)) {
          if (seen.has(ancestor.toLowerCase())) continue;
          seen.add(ancestor.toLowerCase());
          next.push(ancestor);
        }
      }
      return next;
    }

    function isProtectedPath(path) {
      const lower = String(path || "").toLowerCase();
      if (lower.startsWith("hkey_users\\")) return lower.includes("\\software\\policies");
      return PROTECTED_PREFIXES.some((prefix) => lower.startsWith(prefix));
    }

    const validKeyPart = (value) => {
      const name = String(value || "").trim();
      return Boolean(name) && !name.includes("\\") && name !== "." && name !== "..";
    };

    const nextCopyName = (base, names) => {
      if (!names.some((name) => eq(name, base))) return base;
      const stem = base.replace(/ #\d+$/, "");
      let index = 2;
      while (names.some((name) => eq(name, `${stem} #${index}`))) index += 1;
      return `${stem} #${index}`;
    };

    // ------------------------------------------------------------- skeleton
    ensureState();
    container.innerHTML = "";
    const root = ctx.ui.el(`
      <div class="rg">
        <div class="rg-menu" data-menubar>
          <button data-menu="file">File</button>
          <button data-menu="edit">Edit</button>
          <button data-menu="view">View</button>
          <button data-menu="favorites">Favorites</button>
          <button data-menu="help">Help</button>
        </div>
        <div class="rg-addr" data-addr></div>
        <div class="rg-body">
          <div class="rg-tree-wrap" data-tree-wrap>
            <div class="rg-tree" data-tree role="tree" aria-label="Registry keys" tabindex="0"></div>
          </div>
          <div class="rg-split" data-split title="Resize panes"></div>
          <div class="rg-values">
            <div class="rg-vhead"><span>Name</span><span>Type</span><span>Data</span></div>
            <div class="rg-vlist" data-vlist role="listbox" aria-label="Values"></div>
          </div>
        </div>
        <div class="rg-status">
          <span data-status-path></span>
          <span data-status-count></span>
        </div>
      </div>`);
    container.append(root);

    const tree = root.querySelector("[data-tree]");
    const treeWrap = root.querySelector("[data-tree-wrap]");
    const vlist = root.querySelector("[data-vlist]");
    const addr = root.querySelector("[data-addr]");
    const statusPath = root.querySelector("[data-status-path]");
    const statusCount = root.querySelector("[data-status-count]");

    // ------------------------------------------------------------ menu bar
    for (const button of root.querySelectorAll("[data-menu]")) {
      button.addEventListener("click", () => {
        const rect = button.getBoundingClientRect();
        ctx.ui.menu(rect.left, rect.bottom + 2, menuFor(button.dataset.menu));
      });
    }

    function menuFor(name) {
      const state = uiState();
      const onComputer = state.selected === ROOT;
      const record = keyRecord(state.keys, state.selected);
      const chosen = state.selectedValue ? findValue(record, state.selectedValue) : null;
      const currentFavorite = (state.favorites || []).find((favorite) => eq(favorite.path, state.selected));
      const canDeleteValue = Boolean(chosen);
      const canRenameValue = Boolean(state.selectedValue) && !eq(state.selectedValue, DEFAULT_VALUE);
      const canDelete = !onComputer && (!state.selectedValue || canDeleteValue);
      const canRename = !onComputer && (!state.selectedValue || canRenameValue);

      if (name === "file") {
        return [
          { label: "Import…", onClick: importFile },
          { label: "Export…", disabled: onComputer, onClick: exportKey },
          { separator: true },
          { label: "Exit", onClick: () => ctx.window.close() },
        ];
      }
      if (name === "edit") {
        return [
          {
            label: "New",
            submenu: [
              { label: "Key", disabled: onComputer, onClick: newKey },
              { separator: true },
              { label: "String Value", disabled: onComputer, onClick: () => newValue("REG_SZ") },
              { label: "DWORD (32-bit) Value", disabled: onComputer, onClick: () => newValue("REG_DWORD") },
            ],
          },
          { separator: true },
          { label: "Modify…", disabled: !state.selectedValue, onClick: () => modifyValue(state.selectedValue) },
          { label: "Rename", disabled: !canRename, onClick: renameSelection },
          { label: "Delete", disabled: !canDelete, onClick: deleteSelection },
          { separator: true },
          { label: "Find…", shortcut: "Ctrl+F", onClick: openFind },
          { label: "Find Next", shortcut: "F3", disabled: !findState.term, onClick: repeatFind },
        ];
      }
      if (name === "view") {
        return [
          { label: "Expand All", onClick: expandAll },
          { label: "Collapse All", onClick: collapseAll },
          { separator: true },
          { label: "Refresh", shortcut: "F5", onClick: paint },
        ];
      }
      if (name === "favorites") {
        return [
          {
            label: "Add to Favorites",
            disabled: onComputer || Boolean(currentFavorite),
            onClick: addFavorite,
          },
          { separator: true },
          ...(state.favorites || []).map((favorite) => ({
            label: favorite.label,
            checked: Boolean(currentFavorite && eq(currentFavorite.path, favorite.path)),
            onClick: () => navigateTo(favorite.path),
          })),
          ...((state.favorites || []).length ? [{ separator: true }] : []),
          { label: "Remove Favorite", disabled: !currentFavorite, onClick: removeFavorite },
        ];
      }
      return [
        { label: "Help Topics", disabled: true },
        { separator: true },
        { label: "About Registry Editor", onClick: showAbout },
      ];
    }

    // --------------------------------------------------------------- paint
    function paint() {
      const state = uiState();
      renderAddress(state);
      renderTree(state);
      renderValues(state);
      renderStatus(state);
    }

    function renderAddress(state) {
      const path = state.selected === ROOT ? ROOT : state.selected;
      const crumbs = [{ path: ROOT, label: ROOT }];
      if (path !== ROOT) {
        let prefix = "";
        for (const part of path.split("\\")) {
          prefix = prefix ? `${prefix}\\${part}` : part;
          crumbs.push({ path: prefix, label: part });
        }
      }
      addr.innerHTML = `<span class="rg-pc">${ctx.ui.icon("monitor")}</span>${crumbs
        .map(
          (crumb, index) =>
            `${index ? '<span class="rg-chev">›</span>' : ""}<button class="rg-crumb" data-crumb="${ctx.ui.esc(
              crumb.path,
            )}" title="${ctx.ui.esc(crumb.path)}">${ctx.ui.esc(crumb.label)}</button>`,
        )
        .join("")}`;
    }

    function renderTree(state) {
      const rows = flattenTree(state.keys, state.expanded || []);
      tree.innerHTML = rows
        .map((row) => {
          const isRoot = row.path === ROOT;
          const isSelected = eq(row.path, state.selected);
          const twist = row.hasChildren
            ? `<span class="rg-twist" data-twist="${ctx.ui.esc(row.path)}">${row.expanded ? "▾" : "▸"}</span>`
            : `<span class="rg-twist"></span>`;
          const icon = isRoot
            ? `<span class="rg-pcico">${ctx.ui.icon("monitor")}</span>`
            : `<span class="rg-keyico"></span>`;
          return `<div class="rg-row${isSelected ? " sel" : ""}" role="treeitem" aria-level="${row.depth + 1}" aria-expanded="${
            row.hasChildren ? row.expanded : false
          }" aria-selected="${isSelected}" data-key="${ctx.ui.esc(row.path)}" tabindex="-1" style="padding-left:${
            6 + row.depth * 14
          }px">${twist}${icon}<span class="rg-label">${ctx.ui.esc(isRoot ? ROOT : leafName(row.path))}</span></div>`;
        })
        .join("");

      if (pendingTreeFocus) {
        pendingTreeFocus = false;
        tree.focus({ preventScroll: true });
      }
      const selected = tree.querySelector(".rg-row.sel");
      if (selected) selected.scrollIntoView({ block: "nearest" });
    }

    function renderValues(state) {
      const record = keyRecord(state.keys, state.selected);
      if (!record) {
        vlist.innerHTML = `<div class="rg-empty">Select a key to view its values.</div>`;
        pendingValueFocus = false;
        return;
      }
      const values = displayValues(record);
      const hasSelected = state.selectedValue && values.some((value) => eq(value.name, state.selectedValue));
      vlist.innerHTML = values
        .map((value, index) => {
          const isSelected = eq(value.name, state.selectedValue);
          const tabbable = isSelected || (!hasSelected && index === 0);
          return `<button class="rg-vrow${isSelected ? " sel" : ""}" data-value="${ctx.ui.esc(
            value.name,
          )}" role="option" aria-selected="${isSelected}" tabindex="${tabbable ? 0 : -1}">
            <span>${ctx.ui.esc(value.name)}</span>
            <span class="rg-vtype">${ctx.ui.esc(value.type)}</span>
            <span class="rg-vdata">${ctx.ui.esc(formatValueData(value))}</span>
          </button>`;
        })
        .join("");

      if (pendingValueFocus) {
        pendingValueFocus = false;
        const selected = vlist.querySelector(".rg-vrow.sel");
        if (selected) {
          selected.focus({ preventScroll: true });
          selected.scrollIntoView({ block: "nearest" });
        }
      }
    }

    function renderStatus(state) {
      statusPath.textContent = state.selected === ROOT ? ROOT : `${ROOT}\\${state.selected}`;
      const record = keyRecord(state.keys, state.selected);
      const count = record ? displayValues(record).length : 0;
      statusCount.textContent = record ? `${count} value${count === 1 ? "" : "s"}` : "";
    }

    // ------------------------------------------------------------ selection
    function selectKey(path) {
      const state = uiState();
      const record = keyRecord(state.keys, path);
      if (!record && path !== ROOT) return;
      pendingTreeFocus = true;
      commit({ selected: record?.path || ROOT, selectedValue: null });
    }

    function selectValue(name) {
      pendingValueFocus = true;
      commit({ selectedValue: name });
    }

    function navigateTo(path, valueName = null) {
      if (path === ROOT) {
        pendingTreeFocus = true;
        commit({ selected: ROOT, selectedValue: null });
        return;
      }
      const state = uiState();
      const record = keyRecord(state.keys, path);
      if (!record) {
        ctx.ui.alert("Registry Editor", "The selected key no longer exists. It may have been deleted or imported over.");
        return;
      }
      if (valueName) pendingValueFocus = true;
      else pendingTreeFocus = true;
      commit({
        selected: record.path,
        selectedValue: valueName || null,
        expanded: expandPaths(state, record.path),
      });
    }

    function toggleExpand(path) {
      const state = uiState();
      const open = (state.expanded || []).some((entry) => eq(entry, path));
      pendingTreeFocus = true;
      if (open) {
        const selected = state.selected;
        const hidesSelection =
          selected &&
          !eq(selected, path) &&
          selected.toLowerCase().startsWith(`${path.toLowerCase()}\\`);
        commit({
          expanded: (state.expanded || []).filter((entry) => !eq(entry, path)),
          ...(hidesSelection ? { selected: path, selectedValue: null } : {}),
        });
      } else {
        commit({ expanded: expandPaths(state, path) });
      }
    }

    // ---------------------------------------------------------------- tree
    tree.addEventListener("click", (event) => {
      const row = event.target.closest("[data-key]");
      if (!row) return;
      if (event.target.closest("[data-twist]")) {
        toggleExpand(row.dataset.key);
        return;
      }
      selectKey(row.dataset.key);
    });

    tree.addEventListener("dblclick", (event) => {
      const row = event.target.closest("[data-key]");
      if (!row || event.target.closest("[data-twist]")) return;
      const state = uiState();
      if (childrenOf(state.keys, row.dataset.key).length) toggleExpand(row.dataset.key);
    });

    tree.addEventListener("keydown", (event) => {
      const state = uiState();
      const rows = flattenTree(state.keys, state.expanded || []);
      const index = rows.findIndex((row) => eq(row.path, state.selected));
      const row = rows[index];

      if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Home" || event.key === "End") {
        event.preventDefault();
        if (!rows.length) return;
        let next = index;
        if (event.key === "ArrowDown") next = Math.min(rows.length - 1, index + 1);
        if (event.key === "ArrowUp") next = Math.max(0, index - 1);
        if (event.key === "Home") next = 0;
        if (event.key === "End") next = rows.length - 1;
        selectKey(rows[next].path);
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        if (!row) return;
        if (row.hasChildren && !row.expanded) {
          toggleExpand(row.path);
        } else if (row.hasChildren) {
          const child = childPaths(state.keys, row.path)[0];
          if (child) selectKey(child);
        }
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (!row) return;
        if (row.hasChildren && row.expanded) toggleExpand(row.path);
        else if (row.path !== ROOT) selectKey(parentPath(row.path) || ROOT);
        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (row?.hasChildren) toggleExpand(row.path);
        return;
      }

      if (event.key === "F2") {
        event.preventDefault();
        renameSelection();
        return;
      }

      if (event.key === "Delete") {
        event.preventDefault();
        deleteSelection();
      }
    });

    // -------------------------------------------------------------- values
    vlist.addEventListener("click", (event) => {
      const row = event.target.closest("[data-value]");
      if (!row) return;
      pendingValueFocus = true;
      commit({ selectedValue: row.dataset.value });
    });

    vlist.addEventListener("dblclick", (event) => {
      const row = event.target.closest("[data-value]");
      if (!row) return;
      modifyValue(row.dataset.value);
    });

    vlist.addEventListener("keydown", (event) => {
      const state = uiState();
      const record = keyRecord(state.keys, state.selected);
      if (!record) return;
      const values = displayValues(record);
      const index = values.findIndex((value) => eq(value.name, state.selectedValue));

      if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Home" || event.key === "End") {
        event.preventDefault();
        let next = index;
        if (event.key === "ArrowDown") next = Math.min(values.length - 1, Math.max(0, index + 1));
        if (event.key === "ArrowUp") next = Math.max(0, index - 1);
        if (event.key === "Home") next = 0;
        if (event.key === "End") next = values.length - 1;
        selectValue(values[next].name);
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        if (state.selectedValue) modifyValue(state.selectedValue);
        return;
      }

      if (event.key === "F2") {
        event.preventDefault();
        renameSelection();
        return;
      }

      if (event.key === "Delete") {
        event.preventDefault();
        deleteSelection();
      }
    });

    // ------------------------------------------------------------- shortcuts
    root.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        openFind();
        return;
      }
      if (event.key === "F3") {
        event.preventDefault();
        repeatFind();
        return;
      }
      if (event.key === "F5") {
        event.preventDefault();
        paint();
      }
    });

    // ------------------------------------------------------------- splitter
    root.querySelector("[data-split]").addEventListener("pointerdown", (event) => {
      event.preventDefault();
      const body = root.querySelector(".rg-body");
      const rect = body.getBoundingClientRect();
      const split = event.currentTarget;
      split.setPointerCapture?.(event.pointerId);
      const move = (moveEvent) => {
        const width = Math.max(180, Math.min(rect.width - 220, moveEvent.clientX - rect.left));
        treeWrap.style.width = `${width}px`;
      };
      const stop = () => {
        split.removeEventListener("pointermove", move);
        split.removeEventListener("pointerup", stop);
        split.removeEventListener("pointercancel", stop);
      };
      split.addEventListener("pointermove", move);
      split.addEventListener("pointerup", stop);
      split.addEventListener("pointercancel", stop);
    });

    // ------------------------------------------------------------ dialogs
    function openModal(html, wire) {
      return new Promise((resolve) => {
        let settled = false;
        const finish = (value) => {
          if (settled) return;
          settled = true;
          window.removeEventListener("keydown", onEscape, true);
          openDialogAbort = null;
          ctx.ui.closeDialog();
          resolve(value);
        };
        const onEscape = (event) => {
          if (event.key !== "Escape") return;
          event.preventDefault();
          event.stopPropagation();
          finish(null);
        };
        openDialogAbort = () => finish(null);
        window.addEventListener("keydown", onEscape, true);
        ctx.ui.dialog({
          html,
          wire: (card) => {
            card.dataset.regedit = "1";
            wire(card, finish);
          },
        });
      });
    }

    ctx.onDispose(() => openDialogAbort?.());

    const paragraph = (text) =>
      ctx.ui
        .esc(text)
        .split("\n")
        .map((line) => line || "&nbsp;")
        .join("<br>");

    function textPrompt({ title, label, value, note = "" }) {
      return openModal(
        `<h2>${ctx.ui.esc(title)}</h2>
        ${note ? `<p>${paragraph(note)}</p>` : ""}
        <label style="${LABEL_STYLE}">${ctx.ui.esc(label)}</label>
        <input data-input value="${ctx.ui.esc(value)}" style="${INPUT_STYLE}">
        <div class="row">
          <button class="btn" data-cancel>Cancel</button>
          <button class="btn primary" data-ok>OK</button>
        </div>`,
        (card, finish) => {
          const input = card.querySelector("[data-input]");
          input.focus();
          input.select();
          const ok = () => {
            if (!input.value.trim()) {
              input.focus();
              return;
            }
            finish(input.value);
          };
          card.querySelector("[data-ok]").addEventListener("click", ok);
          card.querySelector("[data-cancel]").addEventListener("click", () => finish(null));
          input.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              ok();
            }
          });
        },
      );
    }

    function stringValueDialog({ title, name, data, nameEditable, focusData }) {
      return openModal(
        `<h2>${ctx.ui.esc(title)}</h2>
        <label style="${LABEL_STYLE}">Value name:</label>
        <input data-name value="${ctx.ui.esc(name)}" ${nameEditable ? "" : "readonly"} style="${INPUT_STYLE}">
        <label style="${LABEL_STYLE}">Value data:</label>
        <input data-data value="${ctx.ui.esc(data)}" style="${INPUT_STYLE}">
        <div data-error style="color:#fca5a5;font-size:11.5px;min-height:16px;margin-top:6px"></div>
        <div class="row">
          <button class="btn" data-cancel>Cancel</button>
          <button class="btn primary" data-ok>OK</button>
        </div>`,
        (card, finish) => {
          const nameInput = card.querySelector("[data-name]");
          const dataInput = card.querySelector("[data-data]");
          const error = card.querySelector("[data-error]");
          if (focusData) {
            dataInput.focus();
            dataInput.select();
          } else {
            nameInput.focus();
            nameInput.select();
          }

          const ok = () => {
            const nextName = nameInput.value.trim();
            if (!nextName) {
              error.textContent = "Enter a value name.";
              nameInput.focus();
              return;
            }
            finish({ name: nextName, data: dataInput.value });
          };
          card.querySelector("[data-ok]").addEventListener("click", ok);
          card.querySelector("[data-cancel]").addEventListener("click", () => finish(null));
          card.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              ok();
            }
          });
        },
      );
    }

    function dwordValueDialog({ title, name, data, nameEditable, focusData }) {
      return openModal(
        `<h2>${ctx.ui.esc(title)}</h2>
        <label style="${LABEL_STYLE}">Value name:</label>
        <input data-name value="${ctx.ui.esc(name)}" ${nameEditable ? "" : "readonly"} style="${INPUT_STYLE}">
        <label style="${LABEL_STYLE}">Value data:</label>
        <input data-data value="" style="${INPUT_STYLE}">
        <div style="display:flex;gap:18px;margin-top:8px">
          <label style="${CHECK_STYLE}"><input type="radio" name="rg-base" value="16" checked> Hexadecimal</label>
          <label style="${CHECK_STYLE}"><input type="radio" name="rg-base" value="10"> Decimal</label>
        </div>
        <div data-error style="color:#fca5a5;font-size:11.5px;min-height:16px;margin-top:6px"></div>
        <div class="row">
          <button class="btn" data-cancel>Cancel</button>
          <button class="btn primary" data-ok>OK</button>
        </div>`,
        (card, finish) => {
          const nameInput = card.querySelector("[data-name]");
          const dataInput = card.querySelector("[data-data]");
          const error = card.querySelector("[data-error]");
          let base = 16;

          const parse = (text, radix) => {
            const trimmed = String(text || "").trim();
            if (!trimmed) return null;
            const number = radix === 16 ? Number.parseInt(trimmed, 16) : Number.parseInt(trimmed, 10);
            return Number.isFinite(number) ? number : null;
          };
          const show = (decimal) => (base === 16 ? decimal.toString(16).toUpperCase() : String(decimal));
          dataInput.value = show(Number(data) || 0);

          for (const radio of card.querySelectorAll("input[name='rg-base']")) {
            radio.addEventListener("change", () => {
              if (!radio.checked) return;
              const current = parse(dataInput.value, base);
              base = Number(radio.value);
              if (current !== null) dataInput.value = show(current);
            });
          }

          if (focusData) {
            dataInput.focus();
            dataInput.select();
          } else {
            nameInput.focus();
            nameInput.select();
          }

          const ok = () => {
            const nextName = nameInput.value.trim();
            if (!nextName) {
              error.textContent = "Enter a value name.";
              nameInput.focus();
              return;
            }
            const number = parse(dataInput.value, base);
            if (number === null || number < 0 || number > 0xffffffff) {
              error.textContent = "Enter a valid DWORD value (0 to FFFFFFFF).";
              dataInput.focus();
              dataInput.select();
              return;
            }
            finish({ name: nextName, data: String(number) });
          };
          card.querySelector("[data-ok]").addEventListener("click", ok);
          card.querySelector("[data-cancel]").addEventListener("click", () => finish(null));
          card.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              ok();
            }
          });
        },
      );
    }

    function warningDialog(title, message, okLabel = "Yes", cancelLabel = "No") {
      return openModal(
        `<div style="display:flex;gap:14px;align-items:flex-start">
          <div style="width:36px;height:32px;flex:none;position:relative">
            <div style="width:0;height:0;border-left:18px solid transparent;border-right:18px solid transparent;border-bottom:32px solid #f2c94c"></div>
            <span style="position:absolute;inset:8px 0 0;text-align:center;font-weight:700;color:#3b2c00;font-size:17px">!</span>
          </div>
          <div style="flex:1">
            <h2>${ctx.ui.esc(title)}</h2>
            <p>${paragraph(message)}</p>
          </div>
        </div>
        <div class="row">
          <button class="btn" data-cancel>${ctx.ui.esc(cancelLabel)}</button>
          <button class="btn primary" data-ok>${ctx.ui.esc(okLabel)}</button>
        </div>`,
        (card, finish) => {
          card.querySelector("[data-ok]").addEventListener("click", () => finish(true));
          card.querySelector("[data-cancel]").addEventListener("click", () => finish(false));
          card.querySelector("[data-ok]").focus();
        },
      );
    }

    // --------------------------------------------------------------- edits
    async function newKey() {
      const state = uiState();
      if (state.selected === ROOT) {
        await ctx.ui.alert("Registry Editor", "Select a key before creating a subkey.");
        return;
      }
      const parent = state.selected;
      const siblings = childrenOf(state.keys, parent);
      const name = await textPrompt({
        title: "New Key",
        label: "Key name:",
        value: nextCopyName("New Key #1", siblings),
      });
      if (name === null) return;
      const clean = name.trim();
      if (!validKeyPart(clean)) {
        await ctx.ui.alert("Registry Editor", "A key name cannot be empty or contain a backslash.");
        return;
      }
      if (siblings.some((sibling) => eq(sibling, clean))) {
        await ctx.ui.alert("Registry Editor", "A key with this name already exists.");
        return;
      }
      const path = `${parent}\\${clean}`;
      pendingTreeFocus = true;
      commit({
        keys: [...state.keys, { path, values: [] }],
        selected: path,
        selectedValue: null,
        expanded: expandPaths(state, path),
      });
    }

    async function newValue(type) {
      const state = uiState();
      if (state.selected === ROOT) {
        await ctx.ui.alert("Registry Editor", "Select a key before creating a value.");
        return;
      }
      const record = keyRecord(state.keys, state.selected);
      if (!record) return;
      const names = record.values.map((value) => value.name);
      const suggested = nextCopyName("New Value #1", names);
      const result =
        type === "REG_DWORD"
          ? await dwordValueDialog({
              title: "New DWORD (32-bit) Value",
              name: suggested,
              data: "0",
              nameEditable: true,
              focusData: false,
            })
          : await stringValueDialog({
              title: "New String Value",
              name: suggested,
              data: "",
              nameEditable: true,
              focusData: false,
            });
      if (!result) return;
      const name = result.name.trim();
      if (!name || eq(name, DEFAULT_VALUE)) {
        await ctx.ui.alert("Registry Editor", "That value name is reserved.");
        return;
      }
      if (record.values.some((value) => eq(value.name, name))) {
        await ctx.ui.alert("Registry Editor", "A value with this name already exists.");
        return;
      }
      if (isProtectedPath(state.selected)) {
        const proceed = await warningDialog(
          "Registry Editor",
          `This key is used by Windows and by Halcyon policy. Adding a value here affects every account on this PC.\n\nKey: ${state.selected}`,
          "Yes",
          "No",
        );
        if (!proceed) return;
      }
      const next = state.keys.map((key) =>
        eq(key.path, state.selected) ? { ...key, values: [...key.values, { name, type, data: result.data }] } : key,
      );
      pendingValueFocus = true;
      commit({ keys: next, selectedValue: name });
    }

    async function modifyValue(name) {
      const state = uiState();
      if (state.selected === ROOT || !name) return;
      const record = keyRecord(state.keys, state.selected);
      if (!record) return;
      const value = findValue(record, name);
      const basedOn = value || { name, type: "REG_SZ", data: "" };
      const isDefault = eq(name, DEFAULT_VALUE);

      if (isProtectedPath(state.selected)) {
        const proceed = await warningDialog(
          "Registry Editor",
          `Changing this value affects every account on this PC and cannot be undone.\n\nKey: ${state.selected}\nValue: ${name}`,
          "Yes",
          "No",
        );
        if (!proceed) return;
      }

      const result =
        basedOn.type === "REG_DWORD"
          ? await dwordValueDialog({
              title: "Edit DWORD (32-bit) Value",
              name,
              data: basedOn.data,
              nameEditable: !isDefault,
              focusData: true,
            })
          : await stringValueDialog({
              title: basedOn.type === "REG_EXPAND_SZ" ? "Edit Expandable String Value" : "Edit String",
              name,
              data: basedOn.data,
              nameEditable: !isDefault,
              focusData: true,
            });
      if (!result) return;

      const nextName = result.name.trim();
      if (!nextName || (eq(nextName, DEFAULT_VALUE) && !isDefault)) {
        await ctx.ui.alert("Registry Editor", "That value name is reserved.");
        return;
      }
      if (!isDefault && record.values.some((value) => eq(value.name, nextName) && !eq(value.name, name))) {
        await ctx.ui.alert("Registry Editor", "A value with this name already exists.");
        return;
      }

      const next = state.keys.map((key) => {
        if (!eq(key.path, state.selected)) return key;
        const values = key.values.filter((value) => !eq(value.name, name));
        values.push({ name: nextName, type: basedOn.type, data: result.data });
        return { ...key, values };
      });
      pendingValueFocus = true;
      commit({ keys: next, selectedValue: nextName });
    }

    async function renameValue(name) {
      const state = uiState();
      if (eq(name, DEFAULT_VALUE)) {
        await ctx.ui.alert("Registry Editor", "The (Default) value cannot be renamed.");
        return;
      }
      const record = keyRecord(state.keys, state.selected);
      const value = findValue(record, name);
      if (!value) {
        await ctx.ui.alert("Registry Editor", "There is no value to rename.");
        return;
      }
      const nextNameRaw = await textPrompt({ title: "Rename Value", label: "Value name:", value: name });
      if (nextNameRaw === null) return;
      const nextName = nextNameRaw.trim();
      if (!nextName || eq(nextName, DEFAULT_VALUE)) {
        await ctx.ui.alert("Registry Editor", "That value name is reserved.");
        return;
      }
      if (record.values.some((entry) => eq(entry.name, nextName) && !eq(entry.name, name))) {
        await ctx.ui.alert("Registry Editor", "A value with this name already exists.");
        return;
      }
      const next = state.keys.map((key) =>
        eq(key.path, state.selected)
          ? {
              ...key,
              values: key.values.map((entry) => (eq(entry.name, name) ? { ...entry, name: nextName } : entry)),
            }
          : key,
      );
      pendingValueFocus = true;
      commit({ keys: next, selectedValue: nextName });
    }

    async function renameKey(path) {
      const state = uiState();
      if (path === ROOT || isHive(path)) {
        await ctx.ui.alert("Registry Editor", "This key cannot be renamed.");
        return;
      }
      const record = keyRecord(state.keys, path);
      if (!record) return;
      const parent = parentPath(record.path);
      const oldLeaf = leafName(record.path);
      const nextNameRaw = await textPrompt({ title: "Rename Key", label: "Key name:", value: oldLeaf });
      if (nextNameRaw === null) return;
      const nextName = nextNameRaw.trim();
      if (!validKeyPart(nextName)) {
        await ctx.ui.alert("Registry Editor", "A key name cannot be empty or contain a backslash.");
        return;
      }
      const siblings = childrenOf(state.keys, parent);
      if (siblings.some((sibling) => eq(sibling, nextName) && !eq(sibling, oldLeaf))) {
        await ctx.ui.alert("Registry Editor", "A key with this name already exists.");
        return;
      }
      const newPath = `${parent}\\${nextName}`;
      const prefix = `${record.path.toLowerCase()}\\`;
      const nextKeys = state.keys.map((key) => {
        if (eq(key.path, record.path)) return { ...key, path: newPath };
        if (key.path.toLowerCase().startsWith(prefix)) return { ...key, path: newPath + key.path.slice(record.path.length) };
        return key;
      });
      const nextExpanded = (state.expanded || []).map((entry) => {
        if (eq(entry, record.path)) return newPath;
        if (entry.toLowerCase().startsWith(prefix)) return newPath + entry.slice(record.path.length);
        return entry;
      });
      const nextFavorites = (state.favorites || []).map((favorite) => {
        if (eq(favorite.path, record.path)) return { ...favorite, path: newPath };
        if (favorite.path.toLowerCase().startsWith(prefix)) {
          return { ...favorite, path: newPath + favorite.path.slice(record.path.length) };
        }
        return favorite;
      });
      pendingTreeFocus = true;
      commit({
        keys: nextKeys,
        selected: newPath,
        expanded: nextExpanded,
        favorites: nextFavorites,
      });
    }

    async function renameSelection() {
      const state = uiState();
      if (state.selected === ROOT) return;
      if (state.selectedValue) await renameValue(state.selectedValue);
      else await renameKey(state.selected);
    }

    async function deleteValue(name) {
      const state = uiState();
      const record = keyRecord(state.keys, state.selected);
      const value = findValue(record, name);
      if (!value) {
        await ctx.ui.alert("Registry Editor", "There is no value to delete.");
        return;
      }
      const ok = await warningDialog(
        "Confirm Value Delete",
        `Deleting a registry value may cause system instability or damage.\n\nAre you sure you want to permanently delete this value?\n\n${state.selected}\\${name}`,
        "Yes",
        "No",
      );
      if (!ok) return;

      const before = displayValues(record);
      const removedIndex = before.findIndex((entry) => eq(entry.name, name));
      const after = displayValues({ values: record.values.filter((entry) => !eq(entry.name, name)) });
      const nextName = after[Math.min(removedIndex, after.length - 1)]?.name || null;
      const next = state.keys.map((key) =>
        eq(key.path, state.selected)
          ? { ...key, values: key.values.filter((entry) => !eq(entry.name, name)) }
          : key,
      );
      pendingValueFocus = true;
      commit({ keys: next, selectedValue: nextName });
    }

    async function deleteKey(path) {
      const state = uiState();
      if (path === ROOT) return;
      if (isHive(path)) {
        await ctx.ui.alert("Registry Editor", `Cannot delete ${leafName(path)}.\n\nAccess is denied.`);
        return;
      }
      const record = keyRecord(state.keys, path);
      if (!record) return;
      const ok = await warningDialog(
        "Confirm Key Delete",
        `Deleting certain registry keys or values can cause system instability or damage.\n\nAre you sure you want to delete this key and all of its subkeys?\n\n${record.path}`,
        "Yes",
        "No",
      );
      if (!ok) return;

      const prefix = `${record.path.toLowerCase()}\\`;
      const next = state.keys.filter(
        (key) => !eq(key.path, record.path) && !key.path.toLowerCase().startsWith(prefix),
      );
      const parent = parentPath(record.path);
      const selected = parent === ROOT ? ROOT : keyRecord(next, parent)?.path || ROOT;
      const expanded = (state.expanded || []).filter(
        (entry) => !eq(entry, record.path) && !entry.toLowerCase().startsWith(prefix),
      );
      const favorites = (state.favorites || []).filter(
        (favorite) =>
          !eq(favorite.path, record.path) &&
          !favorite.path.toLowerCase().startsWith(prefix) &&
          Boolean(keyRecord(next, favorite.path)),
      );
      pendingTreeFocus = true;
      commit({ keys: next, selected, selectedValue: null, expanded, favorites });
    }

    async function deleteSelection() {
      const state = uiState();
      if (state.selected === ROOT) return;
      if (state.selectedValue) await deleteValue(state.selectedValue);
      else await deleteKey(state.selected);
    }

    // ----------------------------------------------------------- favorites
    function addFavorite() {
      const state = uiState();
      if (state.selected === ROOT) return;
      if ((state.favorites || []).some((favorite) => eq(favorite.path, state.selected))) {
        ctx.ui.toast("Registry Editor", "This key is already in Favorites.", "regedit");
        return;
      }
      const favorite = { label: leafName(state.selected) || state.selected, path: state.selected };
      commit({ favorites: [...(state.favorites || []), favorite] });
      ctx.ui.toast("Registry Editor", `${favorite.label} added to Favorites.`, "regedit");
    }

    function removeFavorite() {
      const state = uiState();
      const next = (state.favorites || []).filter((favorite) => !eq(favorite.path, state.selected));
      if (next.length !== (state.favorites || []).length) commit({ favorites: next });
    }

    // --------------------------------------------------------------- find
    function findDialog() {
      const options = findState.options;
      return openModal(
        `<h2>Find</h2>
        <label style="${LABEL_STYLE}">Find what:</label>
        <input data-term value="${ctx.ui.esc(findState.term)}" style="${INPUT_STYLE}">
        <div style="font-size:12px;color:#c9c9c9;margin:12px 0 6px">Look at:</div>
        <div style="display:flex;gap:16px">
          <label style="${CHECK_STYLE}"><input type="checkbox" data-opt="keys" ${
            options.keys ? "checked" : ""
          }> Keys</label>
          <label style="${CHECK_STYLE}"><input type="checkbox" data-opt="values" ${
            options.values ? "checked" : ""
          }> Values</label>
          <label style="${CHECK_STYLE}"><input type="checkbox" data-opt="data" ${
            options.data ? "checked" : ""
          }> Data</label>
        </div>
        <div data-error style="color:#fca5a5;font-size:11.5px;min-height:16px;margin-top:6px"></div>
        <div class="row">
          <button class="btn" data-cancel>Cancel</button>
          <button class="btn primary" data-ok>Find Next</button>
        </div>`,
        (card, finish) => {
          const input = card.querySelector("[data-term]");
          const error = card.querySelector("[data-error]");
          input.focus();
          input.select();
          const submit = () => {
            const term = input.value.trim();
            if (!term) {
              error.textContent = "Enter a search term.";
              input.focus();
              return;
            }
            const chosen = {};
            for (const box of card.querySelectorAll("[data-opt]")) chosen[box.dataset.opt] = box.checked;
            if (!chosen.keys && !chosen.values && !chosen.data) {
              error.textContent = "Select at least one of Keys, Values or Data.";
              return;
            }
            findState = { term, options: chosen };
            const found = findNext(term, chosen);
            finish({ notFound: !found });
          };
          card.querySelector("[data-ok]").addEventListener("click", submit);
          card.querySelector("[data-cancel]").addEventListener("click", () => finish(null));
          input.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          });
        },
      );
    }

    async function openFind() {
      const result = await findDialog();
      if (result?.notFound) {
        await ctx.ui.alert("Registry Editor", "Finished searching the registry.");
      }
    }

    async function repeatFind() {
      if (!findState.term) {
        await openFind();
        return;
      }
      if (!findNext(findState.term, findState.options)) {
        await ctx.ui.alert("Registry Editor", "Finished searching the registry.");
      }
    }

    function findNext(term, options) {
      const state = uiState();
      const paths = allKeyPaths(state.keys);
      if (!paths.length) return false;
      const needle = term.toLowerCase();
      let start = -1;
      if (state.selected && state.selected !== ROOT) {
        start = paths.findIndex((path) => eq(path, state.selected));
      }

      for (let step = 1; step <= paths.length; step += 1) {
        const path = paths[(start + step + paths.length) % paths.length];
        const record = keyRecord(state.keys, path);
        const keyHit = options.keys && leafName(path).toLowerCase().includes(needle);
        let valueHit = null;
        if (record) {
          const values = displayValues(record).filter((value) => !value.unset);
          if (options.values) {
            const hit = values.find((value) => value.name.toLowerCase().includes(needle));
            if (hit) valueHit = hit.name;
          }
          if (!valueHit && options.data) {
            const hit = values.find((value) => String(value.data).toLowerCase().includes(needle));
            if (hit) valueHit = hit.name;
          }
        }
        if (keyHit || valueHit) {
          navigateTo(record?.path || path, valueHit);
          return true;
        }
      }
      return false;
    }

    // ------------------------------------------------------- import/export
    async function importFile() {
      const files = ctx.world.files
        .items()
        .filter((file) => file.kind === "registry")
        .sort((a, b) => a.name.localeCompare(b.name, "en-GB", { sensitivity: "base" }));
      if (!files.length) {
        await ctx.ui.alert(
          "Registry Editor",
          "There are no .reg files on this PC.\n\nExport a key first, and it will appear in the mock file system.",
        );
        return;
      }

      const fileId = await openModal(
        `<h2>Import Registry File</h2>
        <p>Choose a registry file from this PC. This is a mock file system; the real registry is not touched.</p>
        <select data-file size="6" style="${SELECT_STYLE}">
          ${files
            .map(
              (file) =>
                `<option value="${ctx.ui.esc(file.id)}">${ctx.ui.esc(file.name)} — ${ctx.ui.esc(file.path)}</option>`,
            )
            .join("")}
        </select>
        <div class="muted tiny" style="margin-top:8px" data-file-note></div>
        <div class="row">
          <button class="btn" data-cancel>Cancel</button>
          <button class="btn primary" data-ok>Open</button>
        </div>`,
        (card, finish) => {
          const select = card.querySelector("[data-file]");
          const note = card.querySelector("[data-file-note]");
          const describe = () => {
            const file = files.find((entry) => entry.id === select.value);
            note.textContent = file ? `${file.path}/${file.name} · ${file.size}` : "";
          };
          select.addEventListener("change", describe);
          describe();
          select.focus();
          card.querySelector("[data-ok]").addEventListener("click", () => finish(select.value));
          card.querySelector("[data-cancel]").addEventListener("click", () => finish(null));
        },
      );
      if (!fileId) return;
      const file = files.find((entry) => entry.id === fileId);
      if (!file) return;

      const proceed = await warningDialog(
        "Registry Editor",
        `Adding information can unintentionally change or delete values and cause components to stop working correctly. If you do not trust the source of this file, do not add the information to the registry.\n\n${file.path}/${file.name}`,
        "Yes",
        "No",
      );
      if (!proceed) return;

      const parsed = parseReg(ctx.world.files.read(file.id));
      if (!parsed.sectionPaths.length && !parsed.entries.length) {
        await ctx.ui.alert("Registry Editor", "This file does not contain any registry data.");
        return;
      }

      const state = uiState();
      const result = applyImport(state.keys, parsed);
      if (!result.firstPath && !result.imported) {
        await ctx.ui.alert("Registry Editor", "Nothing in this file could be applied to the mock registry.");
        return;
      }
      pendingTreeFocus = true;
      commit({
        keys: result.keys,
        selected: result.firstPath || state.selected,
        selectedValue: null,
        expanded: result.firstPath ? expandPaths(state, result.firstPath) : state.expanded,
      });
      ctx.ui.toast(
        "Registry Editor",
        `${result.imported} value${result.imported === 1 ? "" : "s"} imported from ${file.name}.`,
        "regedit",
      );
    }

    async function exportKey() {
      const state = uiState();
      if (state.selected === ROOT) return;
      const suggested = `${leafName(state.selected).replace(/[\\/:*?"<>|]/g, "-")}.reg`;
      const nameRaw = await openModal(
        `<h2>Export Registry File</h2>
        <p>Export range: <b>Selected branch</b></p>
        <div class="muted tiny" style="margin:-4px 0 12px">${ctx.ui.esc(state.selected)}</div>
        <label style="${LABEL_STYLE}">File name:</label>
        <input data-name value="${ctx.ui.esc(suggested)}" style="${INPUT_STYLE}">
        <div class="muted tiny" style="margin-top:8px">Folder: ${ctx.ui.esc(EXPORT_FOLDER)}</div>
        <div class="row">
          <button class="btn" data-cancel>Cancel</button>
          <button class="btn primary" data-ok>Save</button>
        </div>`,
        (card, finish) => {
          const input = card.querySelector("[data-name]");
          input.focus();
          input.select();
          const ok = () => {
            if (!input.value.trim()) {
              input.focus();
              return;
            }
            finish(input.value);
          };
          card.querySelector("[data-ok]").addEventListener("click", ok);
          card.querySelector("[data-cancel]").addEventListener("click", () => finish(null));
          input.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              ok();
            }
          });
        },
      );
      if (nameRaw === null) return;

      let name = nameRaw.trim();
      if (!name) return;
      if (!/\.reg$/i.test(name)) name += ".reg";
      if (/[\\/:*?"<>|]/.test(name)) {
        await ctx.ui.alert("Registry Editor", "The file name contains characters that are not allowed.");
        return;
      }

      if (ctx.world.files.byName(EXPORT_FOLDER, name)) {
        const replace = await warningDialog(
          "Confirm Save As",
          `${name} already exists.\n\nDo you want to replace it?`,
          "Yes",
          "No",
        );
        if (!replace) return;
      }

      const latest = uiState();
      const contents = exportReg(latest.keys, latest.selected);
      const saved = ctx.actions.saveFile({ path: EXPORT_FOLDER, name, contents, kind: "registry" });
      if (!saved.ok) {
        await ctx.ui.alert("Registry Editor", `Export failed: ${saved.reason}.`);
        return;
      }
      ctx.ui.toast("Registry Editor", `${name} exported to ${EXPORT_FOLDER}.`, "regedit");
    }

    // --------------------------------------------------------------- misc
    function expandAll() {
      const state = uiState();
      commit({ expanded: [...HIVES, ...state.keys.map((key) => key.path)] });
    }

    function collapseAll() {
      commit({ expanded: [] });
    }

    function showAbout() {
      ctx.ui.alert(
        "About Registry Editor",
        "Registry Editor\nVersion 10.0 (Build 22621)\n\nA faithful mock of regedit.exe. Every hive, key and value here is pretend: nothing in this window can read or change the real registry on your PC.\n\nEdits live in this shift only. Export writes a .reg file into the mock file system; import reads it back.",
      );
    }

    // --------------------------------------------------------------- start
    ctx.events.on("ui:changed", paint);
    ctx.events.on("world:reset", () => {
      ensureState();
      paint();
    });
    paint();
  },
};

const css = `
.app-regedit { height: 100%; }
.app-regedit .rg { display: flex; flex-direction: column; height: 100%; overflow: hidden; background: #f0f0f0; color: #1a1a1a; font: 12px/1.35 "Segoe UI", "Segoe UI Variable", system-ui, sans-serif; }
.app-regedit .rg-menu { display: flex; gap: 1px; padding: 1px 4px; background: #f5f5f5; border-bottom: 1px solid #d7d7d7; flex: none; }
.app-regedit .rg-menu button { padding: 4px 9px; border-radius: 2px; color: #222; font-size: 12px; }
.app-regedit .rg-menu button:hover { background: #e5f1fb; box-shadow: inset 0 0 0 1px #cce4f7; }
.app-regedit .rg-addr { display: flex; align-items: center; gap: 2px; padding: 3px 7px; min-height: 27px; background: #f7f7f7; border-bottom: 1px solid #dcdcdc; overflow: hidden; flex: none; }
.app-regedit .rg-pc { display: flex; flex: none; margin-right: 2px; }
.app-regedit .rg-pc svg { width: 16px; height: 16px; }
.app-regedit .rg-crumb { padding: 2px 6px; border-radius: 2px; color: #1a1a1a; font-size: 12px; max-width: 250px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; flex: none; }
.app-regedit .rg-crumb:hover { background: #e5f1fb; }
.app-regedit .rg-chev { color: #666; font-size: 10px; flex: none; }
.app-regedit .rg-body { flex: 1; min-height: 0; display: flex; background: #fff; }
.app-regedit .rg-tree-wrap { width: 300px; min-width: 180px; max-width: 60%; overflow: auto; background: #f7f7f7; flex: none; }
.app-regedit .rg-tree { padding: 3px 0 14px; min-height: 100%; outline: 0; }
.app-regedit .rg-tree:focus-visible { box-shadow: inset 0 0 0 1px #9ccdf3; }
.app-regedit .rg-row { display: flex; align-items: center; gap: 4px; height: 21px; padding-right: 8px; color: #1a1a1a; white-space: nowrap; cursor: default; }
.app-regedit .rg-row:hover { background: #eaf4fd; }
.app-regedit .rg-row.sel { background: #cce8ff; outline: 1px solid #99d1ff; outline-offset: -1px; }
.app-regedit .rg-twist { width: 13px; flex: none; text-align: center; font-size: 9px; color: #444; line-height: 1; }
.app-regedit .rg-twist:hover { color: #000; }
.app-regedit .rg-pcico { display: flex; width: 15px; height: 15px; flex: none; }
.app-regedit .rg-pcico svg { width: 15px; height: 15px; }
.app-regedit .rg-keyico { width: 15px; height: 15px; flex: none; position: relative; }
.app-regedit .rg-keyico::before { content: ""; position: absolute; left: 1px; top: 3px; width: 7px; height: 7px; border: 2px solid #c9a227; border-radius: 50%; box-sizing: border-box; }
.app-regedit .rg-keyico::after { content: ""; position: absolute; left: 8px; top: 8px; width: 6px; height: 2px; background: #c9a227; box-shadow: 3px 2px 0 -0.5px #c9a227; transform: rotate(45deg); transform-origin: left center; }
.app-regedit .rg-label { overflow: hidden; text-overflow: ellipsis; }
.app-regedit .rg-split { width: 3px; margin-left: -1px; margin-right: -1px; background: transparent; cursor: col-resize; flex: none; position: relative; z-index: 1; }
.app-regedit .rg-split::after { content: ""; position: absolute; inset: 0 1px; background: #dcdcdc; }
.app-regedit .rg-split:hover::after { background: #7fbde8; }
.app-regedit .rg-values { flex: 1; min-width: 0; display: flex; flex-direction: column; background: #fff; }
.app-regedit .rg-vhead, .app-regedit .rg-vrow { display: grid; grid-template-columns: minmax(150px, 1fr) 118px minmax(180px, 1.6fr); align-items: center; gap: 6px; }
.app-regedit .rg-vhead { padding: 4px 10px; background: #f0f0f0; border-bottom: 1px solid #d7d7d7; color: #333; font-size: 11.5px; flex: none; }
.app-regedit .rg-vlist { flex: 1; overflow: auto; padding: 2px 0 14px; outline: 0; }
.app-regedit .rg-vrow { width: 100%; text-align: left; padding: 3px 10px; border: 0; background: transparent; color: #1a1a1a; font-size: 12px; }
.app-regedit .rg-vrow:hover { background: #eaf4fd; }
.app-regedit .rg-vrow.sel { background: #cce8ff; outline: 1px solid #99d1ff; outline-offset: -1px; }
.app-regedit .rg-vrow span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.app-regedit .rg-vtype { color: #444; }
.app-regedit .rg-vdata { color: #222; }
.app-regedit .rg-empty { padding: 18px 12px; color: #777; font-size: 12px; }
.app-regedit .rg-status { display: flex; justify-content: space-between; gap: 12px; padding: 3px 10px; border-top: 1px solid #d7d7d7; background: #f0f0f0; color: #333; font-size: 11.5px; flex: none; }
.app-regedit .rg-status span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
`;
