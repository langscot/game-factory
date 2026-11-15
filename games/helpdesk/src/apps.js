// Every app on the machine. Each one is a function that fills a window body;
// the shell never needs to know what is inside.

import {
  EMPLOYEES,
  findEmployee,
  policiesForDay,
  FLAVOUR_MAIL,
  NOTES,
  DOCS,
  DOWNLOADS,
  PICTURES,
} from "./data.js";
import { icon } from "./icons.js";
import { openMenu } from "./menu.js";
import { closeWindow, windowList } from "./wm.js";
import { ACCENTS, WALLPAPERS, getPrefs, savePrefs } from "./prefs.js";

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export const formatClock = (seconds) => {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** Fake wall clock: the shift is 09:00 → 17:00. */
export function shiftClock(fractionLeft) {
  const total = 8 * 60;
  const minutes = Math.round(9 * 60 + total * (1 - Math.max(0, Math.min(1, fractionLeft))));
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const el = (html) => {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};

// ---------------------------------------------------------------------------
// Ticket Desk
// ---------------------------------------------------------------------------

function buildHelpdesk(body, api) {
  body.classList.add("fixed");
  const paint = () => paintDesk(body, api);
  const tick = () => paintDeskHead(body, api);
  api.setRefresh(paint);
  api.setTick(tick);
  paint();
}

function paintDesk(body, api) {
  const { state } = api;
  const day = state.day;
  body.innerHTML = "";
  const root = el(`
    <div class="hd">
      <div class="hd-head">
        <span>Day <b>${day.n}</b></span>
        <span data-hd="time">${formatClock(state.timeLeft)}</span>
        <div class="hd-bar" data-hd="bar"><i data-hd="fill"></i></div>
        <span data-hd="count"></span>
      </div>
      <div class="hd-main" data-hd="main"></div>
    </div>`);
  body.append(root);
  const main = root.querySelector('[data-hd="main"]');

  if (!state.shiftStarted) {
    main.append(introCard(api));
  } else {
    const pending = day.tickets.filter((t) => !state.resolved.some((r) => r.id === t.id));
    const showingVerdict = state.selected && state.resolved.some((r) => r.id === state.selected);
    if (!pending.length && !showingVerdict) {
      main.append(completeCard(api));
    } else {
      main.append(queueList(api));
      const detail = document.createElement("div");
      detail.className = "hd-detail";
      detail.append(state.selected ? ticketView(api, state.selected) : el(`<div class="app-empty"><p class="muted">Pick a ticket on the left.</p></div>`));
      main.append(detail);
    }
  }
  paintDeskHead(body, api);
}

function paintDeskHead(body, api) {
  const { state } = api;
  const fill = body.querySelector('[data-hd="fill"]');
  if (!fill) return;
  fill.style.width = `${(state.timeLeft / state.day.seconds) * 100}%`;
  body.querySelector('[data-hd="bar"]').classList.toggle("low", state.timeLeft / state.day.seconds < 0.25);
  body.querySelector('[data-hd="time"]').textContent = formatClock(state.timeLeft);
  body.querySelector('[data-hd="count"]').textContent = `${state.resolved.length}/${state.day.tickets.length}`;
}

function introCard(api) {
  const box = el(`
    <div class="app-empty">
      <div>
        <div style="width:46px;height:46px;margin:0 auto 10px">${icon("ticket")}</div>
        <h3>Day ${api.state.day.n} — ${api.state.day.tickets.length} open tickets</h3>
        <p>Read the briefing in Mail, keep the Policy Handbook open, and check the Staff Directory before you answer.</p>
        <button class="btn primary" data-act="start">Start shift</button>
      </div>
    </div>`);
  box.querySelector('[data-act="start"]').addEventListener("click", () => api.actions.startShift());
  return box;
}

function completeCard(api) {
  const { state } = api;
  const left = state.day.tickets.length - state.resolved.length;
  const box = el(`
    <div class="app-empty">
      <div>
        <div style="width:46px;height:46px;margin:0 auto 10px">${icon("ticket")}</div>
        <h3>${state.timeLeft > 0 ? "Queue empty" : "That's the clock"}</h3>
        <p>${
          left
            ? `${left} ticket${left === 1 ? "" : "s"} still open. They roll over to tomorrow, and somebody will be annoyed about it.`
            : "Every ticket answered. Marge will want a word."
        }</p>
        <button class="btn primary" data-act="end">End shift</button>
      </div>
    </div>`);
  box.querySelector('[data-act="end"]').addEventListener("click", () => api.actions.endShift());
  return box;
}

function queueList(api) {
  const { state } = api;
  const wrap = document.createElement("div");
  wrap.className = "hd-queue";
  for (const t of state.day.tickets) {
    const rec = state.resolved.find((r) => r.id === t.id);
    const b = el(`<button class="qitem${state.selected === t.id ? " sel" : ""}">
      <span class="st ${rec ? (rec.correct ? "ok" : "bad") : ""}">${rec ? (rec.correct ? "✓" : "✗") : "•"}</span>
      <span class="who">${esc(t.from)}</span></button>`);
    b.addEventListener("click", () => api.actions.select(t.id));
    wrap.append(b);
  }
  return wrap;
}

function ticketView(api, id) {
  const { state } = api;
  const t = state.day.tickets.find((x) => x.id === id);
  const person = findEmployee(t.from);
  const email = t.email || person?.email || "unknown";
  const outcome = state.resolved.find((r) => r.id === id);
  const outside = !/@halcyon\.co$/i.test(email);

  const view = el(`<div class="ticket">
    <div class="meta">
      <div>From: <b>${esc(t.from)}</b> &lt;${esc(email)}&gt;</div>
      <div>Ticket #${t.id} · priority normal</div>
    </div>
    <h3>${esc(t.subject)}</h3>
    <div class="body${outside ? " warn" : ""}">${esc(t.body)}</div>
  </div>`);

  if (!outcome) {
    const row = document.createElement("div");
    row.className = "actions";
    for (const [label, choice, cls] of [
      ["Approve", "approve", "ok"],
      ["Deny", "deny", "no"],
      ["Escalate", "escalate", "esc"],
    ]) {
      const b = el(`<button class="btn ${cls}">${label}</button>`);
      b.addEventListener("click", () => api.actions.answer(id, choice));
      row.append(b);
    }
    view.append(row);
    return view;
  }

  const picked = { approve: "Approved", deny: "Denied", escalate: "Escalated" }[outcome.choice];
  const right = { approve: "Approve", deny: "Deny", escalate: "Escalate" }[t.answer];
  const verdict = el(`<div class="verdict ${outcome.correct ? "good" : "bad"}">
    <b>${outcome.correct ? `✔ Correct — ${picked.toLowerCase()}` : `✘ Not quite — you ${picked.toLowerCase()}`}</b>
    ${esc(t.why)}
    ${outcome.correct ? "" : `<br><span class="muted tiny">The right call was <b>${right}</b>. Trust −12.</span>`}
  </div>`);
  view.append(verdict);

  const row = document.createElement("div");
  row.className = "actions";
  const remaining = state.day.tickets.filter((x) => !state.resolved.some((r) => r.id === x.id));
  const next = el(`<button class="btn primary">${remaining.length ? "Next ticket →" : "Finish shift"}</button>`);
  next.addEventListener("click", () => (remaining.length ? api.actions.next() : api.actions.endShift()));
  row.append(next);
  view.append(row);
  return view;
}

// ---------------------------------------------------------------------------
// Mail
// ---------------------------------------------------------------------------

function buildMail(body, api) {
  let selected = 0;
  const paint = () => {
    const state = api.state;
    const memo = state.day.memo;
    const mails = [
      { from: memo.from, role: memo.role, subject: memo.subject, lines: memo.lines, briefing: true },
      ...FLAVOUR_MAIL.map((m) => ({ ...m, role: "Company-wide", briefing: false })),
    ];
    if (selected >= mails.length) selected = 0;
    const m = mails[selected];

    body.innerHTML = "";
    const root = el(`<div class="mail"><div class="mail-list"></div><div class="mail-read"></div></div>`);
    const list = root.querySelector(".mail-list");
    mails.forEach((mail, i) => {
      const b = el(`<button class="${i === selected ? "sel" : ""}"><b>${esc(mail.from)}</b>${esc(mail.subject)}</button>`);
      b.addEventListener("click", () => {
        selected = i;
        paint();
      });
      list.append(b);
    });
    root.querySelector(".mail-read").innerHTML = `
      <h3>${esc(m.subject)}</h3>
      <div class="from">${esc(m.from)} · ${esc(m.role)} · to you</div>
      ${m.lines.map((l) => `<p>${esc(l)}</p>`).join("")}
      ${m.briefing && state.day.n > 1 ? `<div class="newrule"><b>Policy update:</b> Policy ${state.day.n + 4} is now in the handbook. It applies from today.</div>` : ""}`;
    body.append(root);
  };
  paint();
}

// ---------------------------------------------------------------------------
// Handbook
// ---------------------------------------------------------------------------

function buildHandbook(body, api) {
  let selected = null;
  const paint = () => {
    const state = api.state;
    const policies = policiesForDay(state.day.n);
    if (!policies.some((p) => p.id === selected)) selected = policies[0].id;
    const current = policies.find((p) => p.id === selected);

    body.innerHTML = "";
    const root = el(`<div class="book"><nav></nav><article></article></div>`);
    const nav = root.querySelector("nav");
    for (const p of policies) {
      const b = el(`<button class="${p.id === selected ? "sel" : ""}">${p.id}. ${esc(p.title)}</button>`);
      b.addEventListener("click", () => {
        selected = p.id;
        paint();
      });
      nav.append(b);
    }
    root.querySelector("article").innerHTML = `
      <div class="pnum">IT Policy Handbook · rev ${state.day.n}.0${
        current.day === state.day.n && state.day.n > 1 ? '<span class="new">new today</span>' : ""
      }</div>
      <h3>${current.id}. ${esc(current.title)}</h3>
      <ul>${current.lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
      <p class="muted tiny" style="margin-top:16px">If a ticket is not covered by a rule, escalate it. Policy 0, section 1, paragraph "use your judgment".</p>`;
    body.append(root);
  };
  paint();
}

// ---------------------------------------------------------------------------
// Directory
// ---------------------------------------------------------------------------

function buildDirectory(body) {
  let query = "";
  const paint = () => {
    body.innerHTML = "";
    const root = el(`
      <div class="dir">
        <div class="dir-top"><input placeholder="Search staff, department, employment type…" value="${esc(query)}"></div>
        <div class="dir-scroll">
          <table class="staff">
            <thead><tr><th>Name</th><th>Department</th><th>Type</th><th>Email</th><th>Remote</th></tr></thead>
            <tbody></tbody>
          </table>
        </div>
      </div>`);
    body.append(root);

    const term = query.trim().toLowerCase();
    const rows = EMPLOYEES.filter((e) => `${e.name} ${e.dept} ${e.type} ${e.email}`.toLowerCase().includes(term));
    const tagCls = { "Full-time": "ft", Contractor: "ct", Intern: "in" };
    root.querySelector("tbody").innerHTML =
      rows
        .map(
          (e) => `<tr>
            <td>${esc(e.name)}</td>
            <td class="muted">${esc(e.dept)}</td>
            <td><span class="tag ${tagCls[e.type] || ""}">${esc(e.type)}</span></td>
            <td class="muted tiny">${esc(e.email)}</td>
            <td class="${e.remote ? "yes" : "no"}">${e.remote ? "Yes" : "No"}</td>
          </tr>`,
        )
        .join("") || `<tr><td colspan="5" class="muted" style="padding:14px">Nobody matches that.</td></tr>`;

    const input = root.querySelector("input");
    input.addEventListener("input", (ev) => {
      query = ev.target.value;
      paint();
      const again = body.querySelector("input");
      again.focus();
      again.setSelectionRange(query.length, query.length);
    });
  };
  paint();
}

// ---------------------------------------------------------------------------
// Notepad
// ---------------------------------------------------------------------------

function buildNotepad(body, api, opts = {}) {
  const file = opts.file || "notes.txt";
  const storageKey = `helpdesk.note.${file}`;
  let text = localStorage.getItem(storageKey);
  if (text === null) text = NOTES[file] ?? "";
  let wrap = true;
  let saveTimer = 0;

  body.innerHTML = "";
  const root = el(`
    <div class="notepad">
      <div class="np-tabs"><div class="np-tab">${icon("notepad")}<span>${esc(file)}</span></div></div>
      <div class="np-menu">
        <button data-menu="file">File</button>
        <button data-menu="edit">Edit</button>
        <button data-menu="view">View</button>
        <button data-menu="help">Help</button>
      </div>
      <div class="np-area"><textarea spellcheck="false"></textarea></div>
      <div class="np-status">
        <span data-np="pos">Ln 1, Col 1</span><span>100%</span><span>Windows (CRLF)</span><span>UTF-8</span>
      </div>
    </div>`);
  body.append(root);

  const area = root.querySelector("textarea");
  const pos = root.querySelector('[data-np="pos"]');
  area.value = text;

  const setPos = () => {
    const upto = area.value.slice(0, area.selectionStart);
    const line = upto.split("\n").length;
    const col = upto.length - upto.lastIndexOf("\n");
    pos.textContent = `Ln ${line}, Col ${col}`;
  };

  const save = (announce) => {
    try {
      localStorage.setItem(storageKey, area.value);
    } catch {}
    if (announce) api.toast("Notepad", `${file} saved to your desktop.`, "notepad");
  };

  area.addEventListener("input", () => {
    setPos();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => save(false), 500);
  });
  area.addEventListener("keyup", setPos);
  area.addEventListener("click", setPos);
  setPos();

  const menuFor = (name, rect) => {
    if (name === "file") {
      openMenu(rect.left, rect.bottom + 2, [
        { label: "New", shortcut: "Ctrl+N", onClick: () => {
          area.value = "";
          area.focus();
          save(false);
        } },
        { label: "Open…", shortcut: "Ctrl+O", onClick: () => api.open("explorer", { path: "Documents" }) },
        { label: "Save", shortcut: "Ctrl+S", icon: "save", onClick: () => save(true) },
        { label: "Save as…", disabled: true },
        { separator: true },
        { label: "Exit", onClick: () => api.close() },
      ]);
    } else if (name === "edit") {
      openMenu(rect.left, rect.bottom + 2, [
        { label: "Undo", shortcut: "Ctrl+Z", onClick: () => document.execCommand("undo") },
        { separator: true },
        { label: "Cut", shortcut: "Ctrl+X", icon: "cut", onClick: () => document.execCommand("cut") },
        { label: "Copy", shortcut: "Ctrl+C", icon: "copy", onClick: () => document.execCommand("copy") },
        { label: "Paste", shortcut: "Ctrl+V", icon: "paste", onClick: () => document.execCommand("paste") },
        { separator: true },
        { label: "Select all", shortcut: "Ctrl+A", onClick: () => area.select() },
      ]);
    } else if (name === "view") {
      openMenu(rect.left, rect.bottom + 2, [
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
      openMenu(rect.left, rect.bottom + 2, [
        {
          label: "About Notepad",
          onClick: () =>
            api.alert(
              "Notepad",
              "A text editor. It has been in Windows since 1985 and it has not changed much, because it works.\n\nThis copy remembers what you type, which is more than the real one ever did.",
            ),
        },
      ]);
    }
  };

  for (const btn of root.querySelectorAll(".np-menu button")) {
    btn.addEventListener("click", () => {
      for (const other of root.querySelectorAll(".np-menu button")) other.classList.remove("open");
      btn.classList.add("open");
      menuFor(btn.dataset.menu, btn.getBoundingClientRect());
    });
  }

  area.focus();
  area.setSelectionRange(0, 0);
  area.scrollTop = 0;
  setPos();
}

// ---------------------------------------------------------------------------
// Calculator
// ---------------------------------------------------------------------------

function buildCalculator(body) {
  const state = { cur: "0", prev: null, op: null, fresh: true, expr: "", memory: null };

  const fmt = (n) => {
    if (!isFinite(n)) return "Cannot divide by zero";
    const [int, dec] = String(n).split(".");
    const grouped = Number(int).toLocaleString("en-GB");
    return dec ? `${grouped}.${dec}` : grouped;
  };

  const compute = (a, b, op) => {
    switch (op) {
      case "+": return a + b;
      case "−": return a - b;
      case "×": return a * b;
      case "÷": return b === 0 ? Infinity : a / b;
      default: return b;
    }
  };

  body.innerHTML = "";
  const root = el(`
    <div class="calc">
      <div class="calc-mode">Standard</div>
      <div class="calc-screen">
        <div class="calc-expr" data-calc="expr"></div>
        <div class="calc-value" data-calc="value">0</div>
      </div>
      <div class="calc-mem">
        <button data-mem="MC">MC</button><button data-mem="MR">MR</button>
        <button data-mem="M+">M+</button><button data-mem="M-">M−</button><button data-mem="MS">MS</button>
      </div>
      <div class="calc-grid">
        <button class="fn" data-k="%">%</button><button class="fn" data-k="CE">CE</button>
        <button class="fn" data-k="C">C</button><button class="fn" data-k="back">⌫</button>
        <button class="fn" data-k="inv">¹⁄ₓ</button><button class="fn" data-k="sqr">x²</button>
        <button class="fn" data-k="sqrt">√x</button><button class="op" data-k="÷">÷</button>
        <button data-k="7">7</button><button data-k="8">8</button><button data-k="9">9</button>
        <button class="op" data-k="×">×</button>
        <button data-k="4">4</button><button data-k="5">5</button><button data-k="6">6</button>
        <button class="op" data-k="−">−</button>
        <button data-k="1">1</button><button data-k="2">2</button><button data-k="3">3</button>
        <button class="op" data-k="+">+</button>
        <button data-k="±">±</button><button data-k="0">0</button><button data-k=".">.</button>
        <button class="eq" data-k="=">=</button>
      </div>
    </div>`);
  body.append(root);

  const valueEl = root.querySelector('[data-calc="value"]');
  const exprEl = root.querySelector('[data-calc="expr"]');
  const num = () => Number(state.cur.replace(/,/g, "").replace("Cannot divide by zero", "0")) || 0;
  const paint = () => {
    valueEl.textContent = state.cur;
    exprEl.textContent = state.expr;
  };

  const press = (k) => {
    if (/^[0-9]$/.test(k)) {
      state.cur = state.fresh || state.cur === "0" ? k : state.cur + k;
      state.fresh = false;
    } else if (k === ".") {
      if (state.fresh) {
        state.cur = "0.";
        state.fresh = false;
      } else if (!state.cur.includes(".") && !state.cur.startsWith("Cannot")) {
        state.cur += ".";
      }
    } else if (["+", "−", "×", "÷"].includes(k)) {
      const n = num();
      if (state.op && !state.fresh) {
        state.prev = compute(state.prev ?? 0, n, state.op);
        state.cur = fmt(state.prev);
      } else {
        state.prev = n;
      }
      state.op = k;
      state.fresh = true;
      state.expr = `${fmt(state.prev)} ${k}`;
    } else if (k === "=") {
      if (state.op) {
        const n = num();
        const result = compute(state.prev ?? 0, n, state.op);
        state.expr = `${fmt(state.prev ?? 0)} ${state.op} ${fmt(n)} =`;
        state.cur = fmt(result);
        state.prev = result;
        state.op = null;
        state.fresh = true;
      }
    } else if (k === "C") {
      state.cur = "0";
      state.prev = null;
      state.op = null;
      state.expr = "";
      state.fresh = true;
    } else if (k === "CE") {
      state.cur = "0";
      state.fresh = true;
    } else if (k === "back") {
      if (state.cur.length > 1 && !state.cur.startsWith("Cannot")) state.cur = state.cur.slice(0, -1);
      else state.cur = "0";
    } else if (k === "±") {
      state.cur = state.cur.startsWith("-") ? state.cur.slice(1) : `-${state.cur}`;
    } else if (k === "%") {
      state.cur = fmt(num() / 100);
      state.fresh = true;
    } else if (k === "inv") {
      state.cur = fmt(1 / num());
      state.fresh = true;
    } else if (k === "sqr") {
      state.cur = fmt(num() * num());
      state.fresh = true;
    } else if (k === "sqrt") {
      state.cur = fmt(Math.sqrt(num()));
      state.fresh = true;
    }
    paint();
  };

  for (const b of root.querySelectorAll("[data-k]")) {
    b.addEventListener("click", () => press(b.dataset.k));
  }
  for (const b of root.querySelectorAll("[data-mem]")) {
    b.addEventListener("click", () => {
      const n = num();
      if (b.dataset.mem === "MS") state.memory = n;
      if (b.dataset.mem === "MC") state.memory = null;
      if (b.dataset.mem === "MR" && state.memory !== null) {
        state.cur = fmt(state.memory);
        state.fresh = true;
      }
      if (b.dataset.mem === "M+") state.memory = (state.memory ?? 0) + n;
      if (b.dataset.mem === "M-") state.memory = (state.memory ?? 0) - n;
      paint();
    });
  }
  paint();
}

// ---------------------------------------------------------------------------
// File Explorer
// ---------------------------------------------------------------------------

const FILE_ICON = { text: "notepad", exe: "terminal", pdf: "book", image: "image", office: "doc", folder: "folder" };

function buildExplorer(body, api, opts = {}) {
  let path = opts.path || "Home";
  let selection = null;

  const folders = [
    { name: "Desktop", icon: "monitor" },
    { name: "Documents", icon: "folder" },
    { name: "Downloads", icon: "folder" },
    { name: "Pictures", icon: "image" },
  ];

  const listFor = (p) => {
    if (p === "Documents") return DOCS.map((d) => ({ ...d }));
    if (p === "Downloads") return DOWNLOADS.map((d) => ({ ...d }));
    if (p === "Pictures") return PICTURES.map((d) => ({ ...d }));
    if (p === "Desktop") return DOCS.filter((d) => d.kind === "text").map((d) => ({ ...d }));
    return folders.map((f) => ({ name: f.name, kind: "folder", size: "", date: "15/11/2026 09:00" }));
  };

  const render = () => {
    body.innerHTML = "";
    const root = el(`
      <div class="exp">
        <div class="exp-nav">
          <div class="nav-head">Quick access</div>
          <div data-nav></div>
          <div class="nav-head">This PC</div>
          <button data-nav-home>${icon("monitor")}This PC</button>
        </div>
        <div class="exp-main">
          <div class="exp-bar">
            <button class="nav-btn" data-back title="Back">${icon("$arrowLeft")}</button>
            <button class="nav-btn" data-fwd title="Forward" disabled>${icon("$arrowRight")}</button>
            <button class="nav-btn" data-up title="Up">${icon("$up")}</button>
            <div class="exp-path" data-path></div>
          </div>
          <div class="exp-files">
            <div class="exp-row head"><span>Name</span><span>Size</span><span>Date modified</span></div>
            <div data-rows></div>
          </div>
          <div class="exp-status" data-status></div>
        </div>
      </div>`);
    body.append(root);

    const navWrap = root.querySelector("[data-nav]");
    for (const f of folders) {
      const b = el(`<button class="${path === f.name ? "sel" : ""}">${icon(f.icon === "monitor" ? "monitor" : "folder")}${f.name}</button>`);
      b.addEventListener("click", () => {
        path = f.name;
        selection = null;
        render();
      });
      navWrap.append(b);
    }
    root.querySelector("[data-nav-home]").addEventListener("click", () => {
      path = "Home";
      selection = null;
      render();
    });
    root.querySelector('[data-path]').textContent = path === "Home" ? "This PC" : `This PC › ${path}`;
    root.querySelector("[data-back]").addEventListener("click", () => {
      path = "Home";
      selection = null;
      render();
    });
    root.querySelector("[data-fwd]").disabled = true;
    root.querySelector("[data-up]").addEventListener("click", () => {
      path = "Home";
      selection = null;
      render();
    });

    const rows = listFor(path);
    const rowWrap = root.querySelector("[data-rows]");
    rows.forEach((file) => {
      const row = el(`<button class="exp-row${selection === file.name ? " sel" : ""}">
        <span class="nm">${icon(file.kind === "folder" ? "folder" : FILE_ICON[file.kind] || "notepad")}<span>${esc(file.name)}</span></span>
        <span class="muted">${file.size}</span><span class="muted">${file.date}</span>
      </button>`);
      row.addEventListener("click", () => {
        selection = file.name;
        root.querySelectorAll(".exp-row").forEach((r) => r.classList.remove("sel"));
        row.classList.add("sel");
        root.querySelector("[data-status]").textContent = `${rows.length} items · ${file.name} selected`;
      });
      row.addEventListener("dblclick", () => {
        if (file.kind === "folder") {
          path = file.name;
          selection = null;
          render();
          return;
        }
        if (file.kind === "text") {
          api.open("notepad", { file: file.name });
          return;
        }
        if (file.kind === "exe") {
          api.toast("Windows protected your PC", `${file.name} was blocked by IT policy. Nice try.`, "terminal");
          return;
        }
        api.toast("File Explorer", `Nothing on this PC opens ${file.name}.`, "folder");
      });
      rowWrap.append(row);
    });

    if (!rows.length) {
      rowWrap.append(el(`<div class="muted tiny" style="padding:16px">This folder is empty.</div>`));
    }
    root.querySelector("[data-status]").textContent = `${rows.length} items`;
  };

  render();
}

// ---------------------------------------------------------------------------
// Task Manager
// ---------------------------------------------------------------------------

function buildTaskManager(body, api) {
  let selected = null;
  const system = [
    { name: "Windows Explorer", icon: "folder", base: [0.4, 118] },
    { name: "Antimalware Service Executable", icon: "taskmgr", base: [3.1, 214] },
    { name: "Search", icon: "$search", base: [0.2, 42] },
    { name: "Desktop Window Manager", icon: "monitor", base: [1.4, 96] },
    { name: "IT Helpdesk Policy Agent", icon: "taskmgr", base: [0.1, 18] },
  ];

  const rows = () => {
    const list = system.map((s) => ({
      name: s.name,
      icon: s.icon,
      cpu: (s.base[0] + Math.random() * 0.9).toFixed(1),
      mem: Math.round(s.base[1] + Math.random() * 12),
      windowId: null,
    }));
    for (const win of windowList()) {
      list.push({
        name: win.title,
        icon: win.icon,
        cpu: (0.3 + Math.random() * 1.4).toFixed(1),
        mem: Math.round(48 + Math.random() * 90),
        windowId: win.id,
      });
    }
    return list;
  };

  const render = () => {
    const list = rows();
    body.innerHTML = "";
    const root = el(`
      <div class="tm">
        <div class="tm-tabs"><button class="tm-tab sel">Processes</button><button class="tm-tab">Performance</button></div>
        <div class="tm-body">
          <div class="tm-head"><span>Name</span><span>CPU</span><span>Memory</span></div>
          <div class="tm-rows" data-rows></div>
          <div class="tm-bar"><i style="width:${18 + Math.random() * 12}%"></i></div>
          <div class="tm-foot"><button class="btn" data-end disabled>End task</button></div>
        </div>
      </div>`);
    body.append(root);

    const rowWrap = root.querySelector("[data-rows]");
    for (const p of list) {
      const row = el(`<button class="tm-row"><span class="nm">${icon(p.icon)}<span>${esc(p.name)}</span></span>
        <span>${p.cpu}%</span><span>${p.mem} MB</span></button>`);
      row.addEventListener("click", () => {
        selected = p;
        rowWrap.querySelectorAll(".tm-row").forEach((r) => r.classList.remove("sel"));
        row.classList.add("sel");
        root.querySelector("[data-end]").disabled = false;
      });
      rowWrap.append(row);
    }

    root.querySelector("[data-end]").addEventListener("click", () => {
      if (!selected) return;
      if (selected.windowId) {
        closeWindow(selected.windowId);
        api.toast("Task Manager", `${selected.name} has been ended.`, "taskmgr");
      } else {
        api.toast("Task Manager", "Access denied. That one is holding the machine together.", "taskmgr");
      }
      selected = null;
      render();
    });
  };

  render();
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

function buildSettings(body, api) {
  let page = "system";
  let prefs = getPrefs();

  const render = () => {
    prefs = getPrefs();
    body.innerHTML = "";
    const root = el(`
      <div class="set">
        <div class="set-nav">
          <button data-page="system">${icon("monitor")}System</button>
          <button data-page="personal">${icon("$brush")}Personalisation</button>
          <button data-page="about">${icon("$info")}About</button>
        </div>
        <div class="set-main" data-main></div>
      </div>`);
    body.append(root);
    root.querySelectorAll("[data-page]").forEach((b) => {
      b.classList.toggle("sel", b.dataset.page === page);
      b.addEventListener("click", () => {
        page = b.dataset.page;
        render();
      });
    });

    const main = root.querySelector("[data-main]");
    if (page === "system") {
      main.innerHTML = `
        <h3>System</h3>
        <div class="sub">DESKTOP-8H2K9L · Halcyon Dynamics IT</div>
        <div class="set-card">
          <h4>Device specifications</h4>
          <div class="set-row">Processor <b>Intel Core i5-10400 @ 2.90GHz</b></div>
          <div class="set-row">Installed RAM <b>16.0 GB (15.8 GB usable)</b></div>
          <div class="set-row">Device ID <b>8C4F-2210-77AB</b></div>
          <div class="set-row">System type <b>64-bit, x64-based processor</b></div>
          <div class="set-row">Pen and touch <b>Touch input available</b></div>
        </div>
        <div class="set-card">
          <h4>Windows specifications</h4>
          <div class="set-row">Edition <b>Windows 11 Pro</b></div>
          <div class="set-row">Version <b>22H2</b></div>
          <div class="set-row">OS build <b>22621.4317</b></div>
          <div class="set-row">Activation <b style="color:#fbbf24">Not activated</b></div>
        </div>`;
    } else if (page === "personal") {
      main.innerHTML = `
        <h3>Personalisation</h3>
        <div class="sub">Background, colour and the rest of it.</div>
        <div class="set-card">
          <h4>Background</h4>
          <div class="walls" data-walls></div>
        </div>
        <div class="set-card">
          <h4>Accent colour</h4>
          <div class="swatches" data-swatches></div>
        </div>`;
      const walls = main.querySelector("[data-walls]");
      for (const w of WALLPAPERS) {
        const b = el(`<button class="wall-thumb${prefs.wallpaper === w.id ? " sel" : ""}" title="${w.name}">
          <i class="wallpaper ${w.id}" style="position:absolute;inset:0"></i></button>`);
        b.addEventListener("click", () => {
          savePrefs({ wallpaper: w.id });
          render();
        });
        walls.append(b);
      }
      const sw = main.querySelector("[data-swatches]");
      for (const a of ACCENTS) {
        const b = el(`<button class="swatch${prefs.accent === a.id ? " sel" : ""}" style="background:${a.color}" title="${a.id}"></button>`);
        b.addEventListener("click", () => {
          savePrefs({ accent: a.id });
          render();
        });
        sw.append(b);
      }
    } else {
      main.innerHTML = `
        <h3>About</h3>
        <div class="sub">Halcyon Dynamics · IT Service Desk build</div>
        <div class="set-card">
          <div class="set-row">Machine name <b>DESKTOP-8H2K9L</b></div>
          <div class="set-row">Assigned to <b>m.hayes (IT, terminal 04)</b></div>
          <div class="set-row">Support queue <b>tickets.halcyon.co</b></div>
          <div class="set-row">Uptime <b>since Monday, probably</b></div>
        </div>
        <p class="muted tiny">This PC is managed by Halcyon Dynamics IT. Changing anything in here is a ticket in itself.</p>`;
    }
    void api;
  };
  render();
}

// ---------------------------------------------------------------------------
// Recycle Bin
// ---------------------------------------------------------------------------

function buildBin(body) {
  body.innerHTML = `
    <div class="bin-list">
      <p><b>4,102 items</b> · 3.9 GB</p>
      <p><i>final_FINAL_v7.docx</i><br>
      <i>old VPN tokens (do not open)</i><br>
      <i>someone's holiday photos</i><br>
      <i>the 2019 backup we were told to keep</i><br>
      <i>ticket 0770, again</i></p>
      <p class="muted tiny">Emptying this is a ticket in itself. A big one. Facilities will not help.</p>
    </div>`;
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const APPS = {
  helpdesk: { title: "Ticket Desk", icon: "ticket", width: 580, height: 560, build: buildHelpdesk, pos: [104, 16] },
  mail: { title: "Mail", icon: "mail", width: 580, height: 520, build: buildMail, right: true },
  handbook: { title: "Policy Handbook", icon: "book", width: 580, height: 540, build: buildHandbook, right: true },
  directory: { title: "Staff Directory", icon: "people", width: 580, height: 520, build: buildDirectory, right: true },
  notepad: {
    title: "Notepad",
    icon: "notepad",
    width: 640,
    height: 540,
    build: buildNotepad,
    multi: true,
    pos: [300, 70],
    titleFor: (opts) => `${opts?.file || "notes.txt"} - Notepad`,
  },
  calc: { title: "Calculator", icon: "calculator", width: 360, height: 560, build: buildCalculator, pos: [830, 110] },
  explorer: { title: "File Explorer", icon: "folder", width: 780, height: 520, build: buildExplorer, pos: [180, 90] },
  taskmgr: { title: "Task Manager", icon: "taskmgr", width: 620, height: 520, build: buildTaskManager, pos: [330, 80] },
  settings: { title: "Settings", icon: "settings", width: 800, height: 560, build: buildSettings, pos: [220, 60] },
  bin: { title: "Recycle Bin", icon: "bin", width: 520, height: 400, build: buildBin, pos: [360, 140] },
};
