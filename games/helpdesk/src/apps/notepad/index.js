// Typo. A faithful Doors 11 shell over the shared mock file system:
// tabs, menus, a find bar and a status bar. The document text is ephemeral
// window state; saved text lives in the world store, so File Exploder sees the
// same bytes this app wrote. Keyboard shortcuts and dialogs are all wired here.

import {
  DEFAULT_EOL,
  DOCUMENTS,
  EOL_LABEL,
  NEW_NAME,
  ZOOM_STEP,
  clampZoom,
  detectEol,
  findAll,
  normalizePath,
  pathTail,
  toEditorText,
  toFileText,
} from "./text.js";
import { css } from "./styles.js";
import { createDialogs } from "./dialogs.js";

const instances = new WeakMap();

export default {
  id: "notepad",
  title: "Typo",
  icon: "notepad",
  size: [700, 540],
  desktop: true,
  pinned: true,
  multi: true,
  order: 6,
  position: [300, 70],
  titleFor: (options) => `${options?.name || options?.file || NEW_NAME} - Typo`,

  mount(container, ctx) {
    ctx.ui.styles("notepad", css);

    const stored = ctx.world.session.ui("notepad") || {};
    let wrap = stored.wrap !== false;
    let zoom = clampZoom(stored.zoom ?? 100);
    let appearance = ["system", "light", "dark"].includes(stored.appearance) ? stored.appearance : "system";
    let showStatus = stored.showStatus !== false;
    let docSeq = 0;
    let activeId = null;
    let findIndex = -1;
    let caseSensitive = false;
    let closing = false;
    let allowClose = false;
    let lastTitle = "";
    let lastChromeKey = "";
    let cleaned = false;

    const docs = [];
    const makeDoc = ({ name, path, text = "", eol = DEFAULT_EOL }) => ({
      id: `doc-${++docSeq}`,
      name,
      path: path ? normalizePath(path) : null,
      text: toEditorText(text),
      savedText: toEditorText(text),
      eol,
      caret: 0,
      caretEnd: 0,
      scrollTop: 0,
    });

    const activeDoc = () => docs.find((doc) => doc.id === activeId) || null;
    const isDirty = (doc) => Boolean(doc) && doc.text !== doc.savedText;

    container.innerHTML = "";
    const root = ctx.ui.el(`
      <div class="notepad">
        <div class="np-tabbar">
          <div class="np-tabs" data-tabs role="tablist" aria-label="Open documents"></div>
          <button class="np-newtab" data-newtab type="button" title="New tab (Ctrl+N)" aria-label="New tab">+</button>
        </div>
        <div class="np-menubar" role="menubar" aria-label="Typo menu">
          <button type="button" role="menuitem" data-menu="file" aria-haspopup="true">File</button>
          <button type="button" role="menuitem" data-menu="edit" aria-haspopup="true">Edit</button>
          <button type="button" role="menuitem" data-menu="view" aria-haspopup="true">View</button>
        </div>
        <div class="np-find" data-find hidden>
          <input type="text" data-find-input placeholder="Find" aria-label="Find text" spellcheck="false" autocomplete="off">
          <span class="np-find-count" data-find-count aria-live="polite">0 matches</span>
          <button class="np-tool" data-find-prev type="button" title="Find previous (Shift+F3)" aria-label="Find previous">↑</button>
          <button class="np-tool" data-find-next type="button" title="Find next (F3)" aria-label="Find next">↓</button>
          <button class="np-tool np-case" data-case type="button" title="Match case" aria-pressed="false">Aa</button>
          <span class="np-find-spacer"></span>
          <button class="np-tool" data-find-close type="button" title="Close find bar" aria-label="Close find bar">✕</button>
        </div>
        <div class="np-editor" data-editor>
          <textarea spellcheck="false" wrap="soft" aria-label="Document text"></textarea>
        </div>
        <div class="np-status" data-status>
          <span class="np-pos" data-pos>Ln 1, Col 1</span>
          <span class="np-select" data-select></span>
          <span class="np-status-spacer"></span>
          <span data-eol>Doors (CRLF)</span>
          <i class="np-sep" aria-hidden="true"></i>
          <span>UTF-8</span>
          <i class="np-sep" aria-hidden="true"></i>
          <button class="np-zoom" data-zoom type="button" title="Change zoom level">100%</button>
        </div>
      </div>`);
    container.append(root);

    const tabsEl = root.querySelector("[data-tabs]");
    const editorEl = root.querySelector("[data-editor]");
    const area = root.querySelector("textarea");
    const findBar = root.querySelector("[data-find]");
    const findInput = root.querySelector("[data-find-input]");
    const findCount = root.querySelector("[data-find-count]");
    const caseButton = root.querySelector("[data-case]");
    const statusEl = root.querySelector("[data-status]");
    const posEl = root.querySelector("[data-pos]");
    const selectEl = root.querySelector("[data-select]");
    const eolEl = root.querySelector("[data-eol]");
    const zoomEl = root.querySelector("[data-zoom]");

    // -----------------------------------------------------------------------
    // initial document + theme
    // -----------------------------------------------------------------------

    const options = ctx.options || {};
    const wantedName = options.name || options.file || null;
    let initial = null;
    if (wantedName || options.path) {
      let path = options.path ? normalizePath(options.path) : null;
      if (path && wantedName && path.endsWith(`/${wantedName}`)) {
        path = path.slice(0, -(wantedName.length + 1));
      }
      let file = path && wantedName ? ctx.world.files.byName(path, wantedName) : null;
      if (!file && wantedName) {
        file = ctx.world.files.items().find((item) => item.name === wantedName && item.kind === "text") || null;
      }
      if (file) path = file.path;
      initial = makeDoc({
        name: wantedName || file?.name || pathTail(path) || NEW_NAME,
        path: path || DOCUMENTS,
        text: file?.contents ?? "",
        eol: detectEol(file?.contents),
      });
    }
    if (!initial) initial = makeDoc({ name: NEW_NAME, path: null });
    docs.push(initial);

    function platformTheme() {
      const pref = ctx.ui.prefs?.get?.().theme;
      if (pref === "light" || pref === "dark") return pref;
      const screen = document.querySelector("#screen");
      const explicit =
        document.documentElement.dataset.theme ||
        document.body?.dataset.theme ||
        screen?.dataset.theme ||
        "";
      if (explicit === "light" || explicit === "dark") return explicit;
      if (document.documentElement.classList.contains("light")) return "light";
      if (document.body?.classList.contains("light")) return "light";
      if (screen?.classList.contains("light")) return "light";
      return "dark";
    }

    const isLight = () =>
      appearance === "light" || (appearance === "system" && platformTheme() === "light");

    const dialogs = createDialogs({ ctx, isLight, getActiveDoc: activeDoc });
    const { fileDialog, closePrompt } = dialogs;

    function applyAppearance() {
      container.classList.toggle("np-light", isLight());
    }

    const themeObserver = new MutationObserver(applyAppearance);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });
    if (document.body) {
      themeObserver.observe(document.body, { attributes: true, attributeFilter: ["class", "data-theme"] });
    }
    const screen = document.querySelector("#screen");
    if (screen) themeObserver.observe(screen, { attributes: true, attributeFilter: ["class", "data-theme"] });

    // -----------------------------------------------------------------------
    // chrome
    // -----------------------------------------------------------------------

    function renderTabs() {
      tabsEl.innerHTML = docs
        .map(
          (doc) => `
          <div class="np-tab${doc.id === activeId ? " active" : ""}" role="tab" tabindex="${doc.id === activeId ? "0" : "-1"}"
            aria-selected="${doc.id === activeId}" data-doc="${doc.id}" title="${ctx.ui.esc(doc.name)}">
            ${isDirty(doc) ? '<span class="np-dot" title="Unsaved changes">•</span>' : ""}
            ${ctx.ui.icon("notepad")}
            <span class="np-tab-name">${ctx.ui.esc(doc.name)}</span>
            <button class="np-tab-x" type="button" tabindex="-1" data-close="${doc.id}"
              title="Close tab" aria-label="Close ${ctx.ui.esc(doc.name)}">✕</button>
          </div>`,
        )
        .join("");

      for (const tab of tabsEl.querySelectorAll(".np-tab")) {
        const id = tab.dataset.doc;
        tab.addEventListener("click", (event) => {
          if (event.target.closest(".np-tab-x")) return;
          activate(id);
        });
        tab.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            activate(id);
          } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            const list = [...tabsEl.querySelectorAll(".np-tab")];
            const at = list.indexOf(tab);
            list[(at + (event.key === "ArrowRight" ? 1 : -1) + list.length) % list.length]?.focus();
          }
        });
        tab.querySelector(".np-tab-x")?.addEventListener("click", (event) => {
          event.stopPropagation();
          void closeTab(id);
        });
      }
    }

    function renderTitle() {
      const doc = activeDoc();
      const title = doc ? `${isDirty(doc) ? "• " : ""}${doc.name} - Typo` : "Typo";
      if (title === lastTitle) return;
      lastTitle = title;
      ctx.window.setTitle(title);
    }

    function renderStatus() {
      const doc = activeDoc();
      if (!doc) return;
      const start = area.selectionStart;
      const end = area.selectionEnd;
      const upto = area.value.slice(0, start);
      const line = upto.split("\n").length;
      const col = start - upto.lastIndexOf("\n");
      posEl.textContent = `Ln ${line}, Col ${col}`;
      selectEl.textContent = end > start ? `Sel ${end - start}` : "";
      eolEl.textContent = EOL_LABEL[doc.eol] || EOL_LABEL.CRLF;
      zoomEl.textContent = `${zoom}%`;
    }

    function chromeKey() {
      return `${activeId}|${docs.map((doc) => `${doc.id}:${doc.name}:${isDirty(doc)}`).join(",")}`;
    }

    function syncChrome() {
      const key = chromeKey();
      if (key !== lastChromeKey) {
        lastChromeKey = key;
        renderTabs();
      }
      renderTitle();
      renderStatus();
      refreshFind();
    }

    function persist(patch) {
      ctx.actions.setUi("notepad", patch);
    }

    function applyWrap() {
      area.wrap = wrap ? "soft" : "off";
      editorEl.classList.toggle("wrap", wrap);
      persist({ wrap });
    }

    function applyZoom(save = true) {
      container.style.setProperty("--np-zoom", String(zoom / 100));
      renderStatus();
      if (save) persist({ zoom });
    }

    function setZoom(next) {
      const value = clampZoom(next);
      if (value === zoom) return;
      zoom = value;
      applyZoom();
    }

    function setAppearance(next) {
      appearance = next;
      persist({ appearance });
      applyAppearance();
    }

    function applyStatusVisibility() {
      statusEl.hidden = !showStatus;
      persist({ showStatus });
    }

    function toggleWrap() {
      wrap = !wrap;
      applyWrap();
    }

    // -----------------------------------------------------------------------
    // documents
    // -----------------------------------------------------------------------

    function activate(id, focus = true) {
      const doc = docs.find((entry) => entry.id === id);
      if (!doc) return;
      const previous = activeDoc();
      if (previous && previous.id !== id) {
        previous.caret = area.selectionStart;
        previous.caretEnd = area.selectionEnd;
        previous.scrollTop = area.scrollTop;
      }
      activeId = id;
      area.value = doc.text;
      const start = Math.min(doc.caret ?? 0, doc.text.length);
      const end = Math.min(doc.caretEnd ?? start, doc.text.length);
      area.setSelectionRange(start, end);
      area.scrollTop = doc.scrollTop || 0;
      findIndex = -1;
      syncChrome();
      if (focus) area.focus({ preventScroll: true });
    }

    function newTab() {
      const doc = makeDoc({ name: NEW_NAME, path: null });
      docs.push(doc);
      activate(doc.id);
    }

    function openInTab(path, name) {
      const file = ctx.world.files.byName(path, name);
      if (!file) {
        ctx.ui.toast("Typo", `Could not open ${name}.`, "notepad");
        return;
      }
      if (file.kind !== "text") {
        ctx.ui.toast("Typo", `Typo cannot open ${name}.`, "notepad");
        return;
      }
      const existing = docs.find((doc) => doc.path === file.path && doc.name === file.name);
      if (existing) {
        activate(existing.id);
        return;
      }
      const doc = makeDoc({
        name: file.name,
        path: file.path,
        text: file.contents,
        eol: detectEol(file.contents),
      });
      docs.push(doc);
      activate(doc.id);
    }

    async function saveDoc(doc, { as = false } = {}) {
      let target = { path: doc.path, name: doc.name };
      if (!target.path || as) {
        const picked = await fileDialog({
          mode: "save",
          startPath: target.path || DOCUMENTS,
          startName: target.name === NEW_NAME ? `${NEW_NAME}.txt` : target.name,
        });
        if (!picked) return false;
        target = picked;
      }

      const result = ctx.actions.saveFile({
        path: target.path,
        name: target.name,
        contents: toFileText(doc.text, doc.eol),
      });
      if (!result.ok) {
        ctx.ui.toast("Typo", `Could not save: ${result.reason}.`, "notepad");
        return false;
      }

      doc.path = target.path;
      doc.name = target.name;
      doc.fileId = result.file?.id;
      doc.savedText = doc.text;
      syncChrome();
      return true;
    }

    function saveActive({ as = false } = {}) {
      const doc = activeDoc();
      if (!doc) return Promise.resolve(false);
      return saveDoc(doc, { as });
    }

    function onTextInput() {
      const doc = activeDoc();
      if (!doc) return;
      doc.text = area.value;
      findIndex = -1;
      syncChrome();
    }

    async function closeTab(id) {
      const doc = docs.find((entry) => entry.id === id);
      if (!doc) return;
      if (isDirty(doc)) {
        activate(id, false);
        const choice = await closePrompt(doc);
        if (!choice || choice === "cancel") return;
        if (choice === "save") {
          const saved = await saveDoc(doc);
          if (!saved) return;
        }
      }

      const index = docs.findIndex((entry) => entry.id === id);
      if (index === -1) return;
      docs.splice(index, 1);
      if (!docs.length) {
        allowClose = true;
        ctx.window.close();
        return;
      }
      if (activeId === id) {
        activeId = null;
        activate(docs[Math.max(0, index - 1)].id);
      } else {
        syncChrome();
      }
    }

    async function closeActiveTab() {
      if (activeDoc()) await closeTab(activeDoc().id);
    }

    async function requestWindowClose() {
      if (closing) return;
      closing = true;
      try {
        for (const doc of [...docs]) {
          if (!isDirty(doc)) continue;
          activate(doc.id, false);
          const choice = await closePrompt(doc);
          if (!choice || choice === "cancel") return;
          if (choice === "save") {
            const saved = await saveDoc(doc);
            if (!saved) return;
          }
        }
        allowClose = true;
        ctx.window.close();
      } finally {
        closing = false;
      }
    }

    // -----------------------------------------------------------------------
    // find
    // -----------------------------------------------------------------------

    function refreshFind() {
      const query = findInput.value;
      if (!query) {
        findIndex = -1;
        findCount.textContent = "0 matches";
        return;
      }
      const matches = findAll(area.value, query, caseSensitive);
      if (!matches.length) {
        findIndex = -1;
        findCount.textContent = "No results";
        return;
      }
      if (findIndex >= matches.length) findIndex = matches.length - 1;
      findCount.textContent =
        findIndex >= 0 ? `${findIndex + 1} of ${matches.length}` : `${matches.length} ${matches.length === 1 ? "match" : "matches"}`;
    }

    function selectMatch(matches, index) {
      findIndex = index;
      const at = matches[index];
      area.focus({ preventScroll: true });
      area.setSelectionRange(at, at + findInput.value.length);
      findInput.focus({ preventScroll: true });
      findCount.textContent = `${index + 1} of ${matches.length}`;
      renderStatus();
    }

    function findNext(direction) {
      if (findBar.hidden) showFind(true);
      const query = findInput.value;
      if (!query) {
        refreshFind();
        findInput.focus();
        return;
      }
      const matches = findAll(area.value, query, caseSensitive);
      if (!matches.length) {
        findIndex = -1;
        findCount.textContent = "No results";
        return;
      }

      let next;
      if (findIndex >= 0 && findIndex < matches.length) {
        next = (findIndex + direction + matches.length) % matches.length;
      } else if (direction > 0) {
        next = matches.findIndex((at) => at >= area.selectionStart);
        if (next === -1) next = 0;
      } else {
        next = -1;
        for (let index = matches.length - 1; index >= 0; index -= 1) {
          if (matches[index] < area.selectionStart) {
            next = index;
            break;
          }
        }
        if (next === -1) next = matches.length - 1;
      }
      selectMatch(matches, next);
    }

    function showFind(focus = true) {
      if (findBar.hidden) {
        findBar.hidden = false;
        if (!findInput.value) {
          const selected = area.value.slice(area.selectionStart, area.selectionEnd);
          if (selected && !selected.includes("\n")) findInput.value = selected;
        }
      }
      findIndex = -1;
      refreshFind();
      if (focus) {
        findInput.focus();
        findInput.select();
      }
    }

    function closeFind() {
      findBar.hidden = true;
      findIndex = -1;
      area.focus({ preventScroll: true });
    }

    // -----------------------------------------------------------------------
    // menus
    // -----------------------------------------------------------------------

    function editorCommand(command) {
      area.focus({ preventScroll: true });
      document.execCommand(command);
      onTextInput();
    }

    async function pasteFromClipboard() {
      area.focus({ preventScroll: true });
      try {
        const text = await navigator.clipboard.readText();
        area.setRangeText(text, area.selectionStart, area.selectionEnd, "end");
        onTextInput();
      } catch {
        ctx.ui.toast("Typo", "Clipboard access was blocked. Use Ctrl+V instead.", "notepad");
      }
    }

    function insertDate() {
      const now = new Date();
      const time = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
      const date = now.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
      area.focus({ preventScroll: true });
      area.setRangeText(`${time} ${date}`, area.selectionStart, area.selectionEnd, "end");
      onTextInput();
    }

    function menuItems(name) {
      if (name === "file") {
        return [
          { label: "New tab", shortcut: "Ctrl+N", onClick: newTab },
          { label: "New window", shortcut: "Ctrl+Shift+N", onClick: () => ctx.open("notepad") },
          { separator: true },
          {
            label: "Open…",
            shortcut: "Ctrl+O",
            onClick: () =>
              void fileDialog({ mode: "open", startPath: activeDoc()?.path || DOCUMENTS, startName: "" }).then((picked) => {
                if (picked) openInTab(picked.path, picked.name);
              }),
          },
          { label: "Save", shortcut: "Ctrl+S", onClick: () => void saveActive() },
          { label: "Save as…", shortcut: "Ctrl+Shift+S", onClick: () => void saveActive({ as: true }) },
          { separator: true },
          { label: "Page setup…", disabled: true },
          { label: "Print…", shortcut: "Ctrl+P", disabled: true },
          { separator: true },
          { label: "Close tab", shortcut: "Ctrl+W", onClick: () => void closeActiveTab() },
          { label: "Exit", shortcut: "Alt+F4", onClick: () => void requestWindowClose() },
        ];
      }
      if (name === "edit") {
        return [
          { label: "Undo", shortcut: "Ctrl+Z", onClick: () => editorCommand("undo") },
          { label: "Redo", shortcut: "Ctrl+Y", onClick: () => editorCommand("redo") },
          { separator: true },
          { label: "Cut", shortcut: "Ctrl+X", onClick: () => editorCommand("cut") },
          { label: "Copy", shortcut: "Ctrl+C", onClick: () => editorCommand("copy") },
          { label: "Paste", shortcut: "Ctrl+V", onClick: () => void pasteFromClipboard() },
          { label: "Delete", shortcut: "Del", onClick: () => editorCommand("delete") },
          { separator: true },
          { label: "Find…", shortcut: "Ctrl+F", onClick: () => showFind(true) },
          { label: "Find next", shortcut: "F3", onClick: () => findNext(1) },
          { label: "Find previous", shortcut: "Shift+F3", onClick: () => findNext(-1) },
          { separator: true },
          { label: "Select all", shortcut: "Ctrl+A", onClick: () => area.select() },
          { label: "Time/Date", shortcut: "F5", onClick: insertDate },
        ];
      }
      return [
        { label: "Zoom in", shortcut: "Ctrl++", onClick: () => setZoom(zoom + ZOOM_STEP) },
        { label: "Zoom out", shortcut: "Ctrl+-", onClick: () => setZoom(zoom - ZOOM_STEP) },
        { label: "Restore default zoom", shortcut: "Ctrl+0", onClick: () => setZoom(100) },
        {
          label: "App theme",
          submenu: [
            { label: "Use system setting", checked: appearance === "system", onClick: () => setAppearance("system") },
            { label: "Light", checked: appearance === "light", onClick: () => setAppearance("light") },
            { label: "Dark", checked: appearance === "dark", onClick: () => setAppearance("dark") },
          ],
        },
        { separator: true },
        { label: "Word wrap", checked: wrap, onClick: toggleWrap },
        {
          label: "Status bar",
          checked: showStatus,
          onClick: () => {
            showStatus = !showStatus;
            applyStatusVisibility();
          },
        },
      ];
    }

    function openMenu(name, button) {
      const rect = button.getBoundingClientRect();
      ctx.ui.menu(rect.left, rect.bottom + 2, menuItems(name));
    }

    // -----------------------------------------------------------------------
    // wiring
    // -----------------------------------------------------------------------

    root.querySelector("[data-newtab]").addEventListener("click", newTab);
    for (const button of root.querySelectorAll("[data-menu]")) {
      button.addEventListener("click", () => openMenu(button.dataset.menu, button));
    }

    findInput.addEventListener("input", () => {
      findIndex = -1;
      refreshFind();
    });
    findInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        findNext(event.shiftKey ? -1 : 1);
      } else if (event.key === "Escape") {
        event.preventDefault();
        closeFind();
      }
    });
    root.querySelector("[data-find-next]").addEventListener("click", () => findNext(1));
    root.querySelector("[data-find-prev]").addEventListener("click", () => findNext(-1));
    root.querySelector("[data-find-close]").addEventListener("click", closeFind);
    caseButton.addEventListener("click", () => {
      caseSensitive = !caseSensitive;
      caseButton.classList.toggle("on", caseSensitive);
      caseButton.setAttribute("aria-pressed", String(caseSensitive));
      findIndex = -1;
      refreshFind();
      findInput.focus();
    });

    area.addEventListener("input", onTextInput);
    area.addEventListener("keyup", renderStatus);
    area.addEventListener("click", renderStatus);
    area.addEventListener("select", renderStatus);
    area.addEventListener("pointerdown", () => {
      findIndex = -1;
    });
    area.addEventListener("keydown", (event) => {
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(event.key)) {
        findIndex = -1;
      }
    });
    area.addEventListener(
      "wheel",
      (event) => {
        if (!event.ctrlKey) return;
        event.preventDefault();
        setZoom(zoom + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
      },
      { passive: false },
    );

    zoomEl.addEventListener("click", () => {
      const rect = zoomEl.getBoundingClientRect();
      ctx.ui.menu(rect.left - 100, rect.top - 120, [
        { label: "Zoom in", shortcut: "Ctrl++", onClick: () => setZoom(zoom + ZOOM_STEP) },
        { label: "Zoom out", shortcut: "Ctrl+-", onClick: () => setZoom(zoom - ZOOM_STEP) },
        { label: "Restore default zoom", shortcut: "Ctrl+0", onClick: () => setZoom(100) },
      ]);
    });

    root.addEventListener("keydown", (event) => {
      if (event.altKey && event.key === "F4") {
        event.preventDefault();
        void requestWindowClose();
        return;
      }

      const mod = event.ctrlKey || event.metaKey;
      if (mod) {
        const key = event.key.toLowerCase();
        if (key === "n" && event.shiftKey) {
          event.preventDefault();
          ctx.open("notepad");
        } else if (key === "n") {
          event.preventDefault();
          newTab();
        } else if (key === "o") {
          event.preventDefault();
          void fileDialog({ mode: "open", startPath: activeDoc()?.path || DOCUMENTS, startName: "" }).then((picked) => {
            if (picked) openInTab(picked.path, picked.name);
          });
        } else if (key === "s" && event.shiftKey) {
          event.preventDefault();
          void saveActive({ as: true });
        } else if (key === "s") {
          event.preventDefault();
          void saveActive();
        } else if (key === "f") {
          event.preventDefault();
          showFind(true);
        } else if (key === "w") {
          event.preventDefault();
          void closeActiveTab();
        } else if (key === "0") {
          event.preventDefault();
          setZoom(100);
        } else if (key === "+" || key === "=") {
          event.preventDefault();
          setZoom(zoom + ZOOM_STEP);
        } else if (key === "-" || key === "_") {
          event.preventDefault();
          setZoom(zoom - ZOOM_STEP);
        } else if (key === "p") {
          event.preventDefault();
          ctx.ui.toast("Typo", "Printing is not connected to this PC.", "notepad");
        }
        return;
      }

      if (event.key === "F3") {
        event.preventDefault();
        findNext(event.shiftKey ? -1 : 1);
      } else if (event.key === "F5") {
        event.preventDefault();
        insertDate();
      } else if (event.key === "Escape" && !findBar.hidden) {
        event.preventDefault();
        closeFind();
      }
    });

    // Closing the window from the title bar has to ask about unsaved tabs. The
    // window manager closes directly, so intercept its caption button in the
    // capture phase before that handler runs.
    const winEl = container.closest(".win");
    const titlebarClose = winEl?.querySelector('.win-caption [data-act="close"]') || null;
    const onTitlebarClose = (event) => {
      if (allowClose || closing) return;
      if (!docs.some(isDirty)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      void requestWindowClose();
    };
    titlebarClose?.addEventListener("click", onTitlebarClose, true);

    applyAppearance();
    applyZoom(false);
    editorEl.classList.toggle("wrap", wrap);
    area.wrap = wrap ? "soft" : "off";
    statusEl.hidden = !showStatus;
    activate(initial.id, false);
    area.focus({ preventScroll: true });

    const teardown = () => {
      if (cleaned) return;
      cleaned = true;
      themeObserver.disconnect();
      titlebarClose?.removeEventListener("click", onTitlebarClose, true);
      dialogs.closeActive();
    };
    instances.set(container, teardown);
    ctx.onDispose(teardown);
  },

  unmount(container) {
    instances.get(container)?.();
    instances.delete(container);
  },
};
