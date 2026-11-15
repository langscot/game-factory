// Windows Terminal, as far as this desktop is concerned: two shells, two
// scrollbacks, one prompt. Every command is a mock handler in commands.js and
// every path is the fake C: drive in filesystem.js. Tabs, history, drafts and
// scrollback live in session.ui.terminal so they survive a re-render or a
// minimised window.

import { HOME, createFileSystem } from "./filesystem.js";
import { CMD_COMMANDS, PS_COMMANDS, execute } from "./commands.js";

const MAX_LINES = 900;
const MAX_HISTORY = 120;
const instances = new WeakMap();

const PS_ICON = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect x="2" y="3" width="20" height="18" rx="2.6" fill="#012456"/>
  <path d="M6.4 8.4L10 12l-3.6 3.6" fill="none" stroke="#f2f2f2" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M11.6 15.6h6" stroke="#f2f2f2" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;

const out = (text = "") => ({ k: "out", t: text });

const displayPath = (path) => (path === "C:" ? "C:\\" : String(path ?? "").replace(/\//g, "\\"));
const promptFor = (shell, cwd) => `${shell === "ps" ? "PS " : ""}${displayPath(cwd)}>`;

const banner = (shell) => {
  if (shell === "ps") {
    return [
      out("Windows PowerShell"),
      out("Copyright (C) Microsoft Corporation. All rights reserved."),
      out(""),
      out("Try the new cross-platform PowerShell https://aka.ms/pscore6"),
      out(""),
    ];
  }
  return [
    out("Microsoft Windows [Version 10.0.22621.4317]"),
    out("(c) Microsoft Corporation. All rights reserved."),
    out(""),
  ];
};

const emptyTab = (shell) => ({ cwd: HOME, lines: banner(shell), history: [], draft: "" });

/**
 * Read the saved terminal state. Missing lines mean "never opened before", so
 * the banner is shown; an empty array means the player typed cls and stays
 * empty. The two cases must not be confused.
 */
function readState(ctx) {
  const saved = ctx.world.session.ui("terminal") || {};
  const tab = (shell) => {
    const raw = saved.tabs?.[shell] || {};
    return {
      cwd: typeof raw.cwd === "string" ? raw.cwd : HOME,
      lines: Array.isArray(raw.lines)
        ? raw.lines
            .filter((line) => line && typeof line.t === "string")
            .slice(-MAX_LINES)
            .map((line) => ({ k: typeof line.k === "string" ? line.k : "out", t: line.t }))
        : null,
      history: Array.isArray(raw.history) ? raw.history.filter((item) => typeof item === "string").slice(-MAX_HISTORY) : [],
      draft: typeof raw.draft === "string" ? raw.draft : "",
    };
  };

  const tabs = { cmd: tab("cmd"), ps: tab("ps") };
  for (const shell of ["cmd", "ps"]) {
    if (!tabs[shell].lines) tabs[shell].lines = emptyTab(shell).lines;
  }
  return { active: saved.active === "ps" ? "ps" : "cmd", tabs };
}

function tokenStart(value, caret) {
  const before = value.slice(0, caret);
  const quotes = (before.match(/"/g) || []).length;
  if (quotes % 2 === 1) return before.lastIndexOf('"');
  let start = caret;
  while (start > 0 && !/\s/.test(value[start - 1])) start -= 1;
  return start;
}

export default {
  id: "terminal",
  title: "Terminal",
  icon: "terminal",
  size: [780, 540],
  desktop: true,
  pinned: true,
  order: 4,
  position: [250, 60],

  mount(container, ctx) {
    ctx.ui.styles("terminal", css);

    const saved = readState(ctx);
    const tabs = saved.tabs;
    let active = saved.active;
    let alive = true;
    let historyIndex = null;
    let completion = null;
    const timers = new Set();

    const session = ctx.world.session.current();
    const person = session.technician;
    const machine = person ? ctx.world.machines.byOwner(person.id) : null;
    const readFs = () => createFileSystem(ctx.world.files.items());

    container.innerHTML = "";
    const root = ctx.ui.el(`
      <div class="term" data-term>
        <div class="term-tabs" role="tablist" aria-label="Terminal tabs" data-tabs></div>
        <div class="term-body">
          <div class="term-scroll" data-scroll><div data-lines></div><div class="term-line term-inputline" data-inputline></div></div>
        </div>
        <input class="term-ghost" data-input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Terminal input">
      </div>`);
    container.append(root);

    const tabsEl = root.querySelector("[data-tabs]");
    const linesEl = root.querySelector("[data-lines]");
    const inputLine = root.querySelector("[data-inputline]");
    const scroll = root.querySelector("[data-scroll]");
    const input = root.querySelector("[data-input]");

    const activeTab = () => tabs[active];
    const scrollToEnd = () => {
      scroll.scrollTop = scroll.scrollHeight;
    };

    function persist() {
      if (!alive) return;
      tabs[active].draft = input.value;
      ctx.actions.setUi("terminal", {
        active,
        tabs: {
          cmd: { ...tabs.cmd, lines: tabs.cmd.lines.slice(-MAX_LINES) },
          ps: { ...tabs.ps, lines: tabs.ps.lines.slice(-MAX_LINES) },
        },
      });
    }

    function renderTabs() {
      tabsEl.innerHTML = `
        <button class="term-tab${active === "cmd" ? " sel" : ""}" role="tab" data-shell="cmd" aria-selected="${active === "cmd"}">
          <span class="ico">${ctx.ui.icon("terminal")}</span><span class="label">Command Prompt</span>
        </button>
        <button class="term-tab${active === "ps" ? " sel" : ""}" role="tab" data-shell="ps" aria-selected="${active === "ps"}">
          <span class="ico">${PS_ICON}</span><span class="label">Windows PowerShell</span>
        </button>
        <button class="term-new" data-new title="New tab" aria-label="New tab">+</button>
        <button class="term-chev" data-chev title="New tab menu" aria-label="New tab menu" tabindex="-1">⌄</button>`;

      for (const button of tabsEl.querySelectorAll("[data-shell]")) {
        button.addEventListener("click", () => switchTab(button.dataset.shell));
      }
      const noMore = () => {
        ctx.ui.toast("Terminal", "No additional shells are installed on this machine.", "terminal");
        focusInput();
      };
      tabsEl.querySelector("[data-new]").addEventListener("click", noMore);
      tabsEl.querySelector("[data-chev]").addEventListener("click", noMore);
    }

    function renderLines() {
      const tab = activeTab();
      linesEl.innerHTML = "";
      const fragment = document.createDocumentFragment();
      for (const line of tab.lines) {
        const node = document.createElement("div");
        // cmd.exe writes errors in the normal console colour; only PowerShell
        // renders them red. The wording does the work in Command Prompt.
        const kind = line.k === "err" && active === "cmd" ? "out" : line.k || "out";
        node.className = `term-line ${kind}`;
        node.textContent = line.t;
        fragment.append(node);
      }
      linesEl.append(fragment);
      scrollToEnd();
    }

    function renderInputLine() {
      const prompt = promptFor(active, activeTab().cwd);
      const value = input.value;
      const caret = Math.max(0, Math.min(value.length, input.selectionStart ?? value.length));
      const underCaret = value[caret] ?? " ";
      inputLine.innerHTML =
        `<span class="term-prompt">${ctx.ui.esc(prompt)}</span>` +
        `${ctx.ui.esc(value.slice(0, caret))}` +
        `<span class="term-caret">${ctx.ui.esc(underCaret)}</span>` +
        `${ctx.ui.esc(value.slice(caret + 1))}`;
      scrollToEnd();
    }

    function focusInput() {
      input.focus({ preventScroll: true });
    }

    function setInput(value) {
      input.value = value;
      input.selectionStart = input.selectionEnd = value.length;
      activeTab().draft = value;
      completion = null;
      renderInputLine();
    }

    function appendLines(tab, lines) {
      if (!lines?.length) return;
      tab.lines.push(...lines);
      if (tab.lines.length > MAX_LINES) tab.lines.splice(0, tab.lines.length - MAX_LINES);
    }

    function scheduleJob(tab, job) {
      const cancel = ctx.clock.schedule(job.at, () => {
        timers.delete(cancel);
        if (!alive) return;
        appendLines(tab, job.lines);
        persist();
        if (tab === activeTab()) renderLines();
      });
      timers.add(cancel);
    }

    function submit() {
      const tab = activeTab();
      const line = input.value;
      appendLines(tab, [{ k: "cmd", t: promptFor(active, tab.cwd) + line }]);

      if (line.trim()) {
        tab.history.push(line);
        if (tab.history.length > MAX_HISTORY) tab.history.splice(0, tab.history.length - MAX_HISTORY);
      }
      historyIndex = null;
      input.value = "";
      tab.draft = "";
      completion = null;

      const result = execute({
        shell: active,
        line,
        cwd: tab.cwd,
        fs: readFs(),
        world: ctx.world,
        machine,
        person,
      });

      if (result.clear) tab.lines = [];
      else appendLines(tab, result.lines || []);
      if (result.cwd) tab.cwd = result.cwd;
      for (const job of result.jobs || []) scheduleJob(tab, job);

      persist();
      renderLines();
      renderInputLine();
      scrollToEnd();

      if (result.close) ctx.window.close();
    }

    function navigateHistory(direction) {
      const tab = activeTab();
      if (!tab.history.length) return;
      if (direction > 0) {
        if (historyIndex === null) return;
        historyIndex += 1;
        if (historyIndex >= tab.history.length) {
          historyIndex = null;
          setInput("");
          return;
        }
      } else {
        historyIndex = historyIndex === null ? tab.history.length - 1 : Math.max(0, historyIndex - 1);
      }
      setInput(tab.history[historyIndex] ?? "");
    }

    function applyCompletion(state, candidate) {
      const value = input.value;
      input.value = value.slice(0, state.start) + candidate + value.slice(state.end);
      const caret = state.start + candidate.length;
      input.selectionStart = input.selectionEnd = caret;
      activeTab().draft = input.value;
      state.value = input.value;
      state.caret = caret;
      state.end = caret;
      renderInputLine();
    }

    function complete() {
      const value = input.value;
      const caret = input.selectionStart ?? value.length;
      if (completion && completion.value === value && completion.caret === caret) {
        completion.index = (completion.index + 1) % completion.matches.length;
        applyCompletion(completion, completion.matches[completion.index]);
        return;
      }

      const start = tokenStart(value, caret);
      const token = value.slice(start, caret);
      const leading = value.slice(0, start);
      const firstToken = !leading.trim();
      let matches;

      if (firstToken && !/[\\/]/.test(token)) {
        const commands = active === "cmd" ? CMD_COMMANDS : PS_COMMANDS;
        matches = commands
          .filter((command) => command.toLowerCase().startsWith(token.toLowerCase()))
          .map((command) => `${command} `);
      } else {
        matches = readFs().complete(activeTab().cwd, token);
      }

      matches = [...new Set(matches)];
      if (!matches.length) return;
      completion = { value, caret, start, end: caret, matches, index: 0 };
      applyCompletion(completion, matches[0]);
    }

    function cancelLine() {
      const tab = activeTab();
      appendLines(tab, [{ k: "cmd", t: `${promptFor(active, tab.cwd)}${input.value}^C` }]);
      historyIndex = null;
      input.value = "";
      tab.draft = "";
      completion = null;
      persist();
      renderLines();
      renderInputLine();
    }

    function switchTab(shell) {
      if (shell !== "cmd" && shell !== "ps") return;
      if (shell === active) {
        focusInput();
        return;
      }
      tabs[active].draft = input.value;
      active = shell;
      historyIndex = null;
      completion = null;
      input.value = tabs[active].draft;
      input.selectionStart = input.selectionEnd = input.value.length;
      persist();
      renderTabs();
      renderLines();
      renderInputLine();
      focusInput();
    }

    function onKeyDown(event) {
      if (event.isComposing) return;

      if (event.key === "Enter") {
        event.preventDefault();
        submit();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        navigateHistory(-1);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        navigateHistory(1);
      } else if (event.key === "Tab") {
        event.preventDefault();
        complete();
      } else if (event.key === "Escape" && input.value) {
        event.preventDefault();
        setInput("");
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "l") {
        event.preventDefault();
        activeTab().lines = [];
        completion = null;
        persist();
        renderLines();
        renderInputLine();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
        if (String(window.getSelection() || "").length) return;
        event.preventDefault();
        cancelLine();
      }
    }

    input.addEventListener("keydown", onKeyDown);
    input.addEventListener("input", () => {
      activeTab().draft = input.value;
      completion = null;
      renderInputLine();
    });
    input.addEventListener("keyup", (event) => {
      if (["ArrowLeft", "ArrowRight", "Home", "End", "Backspace", "Delete"].includes(event.key)) renderInputLine();
    });
    input.addEventListener("focus", () => root.classList.add("is-focused"));
    input.addEventListener("blur", () => {
      root.classList.remove("is-focused");
      persist();
    });

    root.addEventListener("pointerdown", (event) => {
      if (event.target.closest("button")) return;
      if (event.detail > 1) return;
      focusInput();
    });

    instances.set(container, {
      stop: () => {
        alive = false;
        for (const cancel of timers) cancel();
        timers.clear();
      },
    });

    input.value = tabs[active].draft;
    input.selectionStart = input.selectionEnd = input.value.length;
    renderTabs();
    renderLines();
    renderInputLine();
    root.classList.add("is-focused");
    focusInput();
  },

  unmount(container) {
    instances.get(container)?.stop?.();
    instances.delete(container);
  },
};

const css = `
.app-terminal { background: #0c0c0c; }
.app-terminal .term {
  position: relative;
  display: flex; flex-direction: column; height: 100%; min-height: 0;
  background: #0c0c0c; color: #cccccc; cursor: text;
  font-family: "Cascadia Mono", "Consolas", "Lucida Console", monospace;
  font-size: 13px; line-height: 1.35;
}
.app-terminal .term-tabs {
  display: flex; align-items: flex-end; gap: 2px; flex: none;
  min-height: 37px; padding: 5px 6px 0; background: #202020;
  border-bottom: 1px solid #191919;
}
.app-terminal .term-tab {
  display: flex; align-items: center; gap: 8px; min-width: 178px; max-width: 240px;
  padding: 7px 10px 8px 12px; border-radius: 7px 7px 0 0;
  color: #b9b9b9; font-family: var(--font); font-size: 12px; line-height: 1;
  text-align: left; overflow: hidden;
}
.app-terminal .term-tab:hover { background: #2b2b2b; color: #e8e8e8; }
.app-terminal .term-tab.sel { background: #0c0c0c; color: #ffffff; box-shadow: inset 0 1px 0 rgba(255,255,255,.08); }
.app-terminal .term-tab .ico { display: grid; place-items: center; width: 16px; height: 16px; flex: none; }
.app-terminal .term-tab .ico svg { width: 16px; height: 16px; }
.app-terminal .term-tab .label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.app-terminal .term-new, .app-terminal .term-chev {
  display: grid; place-items: center; width: 27px; height: 26px; margin-bottom: 4px;
  border-radius: 4px; color: #a6a6a6; font-size: 15px; line-height: 1;
}
.app-terminal .term-new:hover, .app-terminal .term-chev:hover { background: #2b2b2b; color: #ffffff; }
.app-terminal .term-chev { width: 20px; font-size: 13px; }
.app-terminal .term-body { display: flex; flex: 1; min-height: 0; }
.app-terminal .term-scroll {
  flex: 1; min-height: 0; overflow-y: auto; overflow-x: hidden;
  padding: 6px 12px 10px; white-space: pre-wrap; overflow-wrap: anywhere;
  user-select: text; cursor: text; scrollbar-color: #4a4a4a #0c0c0c;
}
.app-terminal .term-scroll::-webkit-scrollbar { width: 10px; }
.app-terminal .term-scroll::-webkit-scrollbar-thumb { background: #4a4a4a; border: 2px solid #0c0c0c; border-radius: 6px; }
.app-terminal .term-scroll::-webkit-scrollbar-track { background: #0c0c0c; }
.app-terminal .term-line { min-height: 1.35em; }
.app-terminal .term-line.out { color: #cccccc; }
.app-terminal .term-line.cmd { color: #cccccc; }
.app-terminal .term-line.dim { color: #8c8c8c; }
.app-terminal .term-line.err { color: #e74856; }
.app-terminal .term-inputline { color: #cccccc; }
.app-terminal .term-prompt { color: #cccccc; }
.app-terminal .term-caret { background: #cccccc; color: #0c0c0c; }
.app-terminal .term.is-focused .term-caret { animation: term-blink 1.05s steps(1, end) infinite; }
.app-terminal .term:not(.is-focused) .term-caret {
  background: transparent; color: #cccccc; outline: 1px solid #cccccc; animation: none;
}
.app-terminal .term-ghost {
  position: absolute; left: 6px; bottom: 4px; width: 1px; height: 1px;
  padding: 0; margin: 0; border: 0; opacity: 0; pointer-events: none;
  background: transparent; color: transparent;
}
@keyframes term-blink { 0%, 49% { background: #cccccc; color: #0c0c0c; } 50%, 100% { background: transparent; color: #cccccc; } }
`;
