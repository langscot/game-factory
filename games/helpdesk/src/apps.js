// The four apps on the desktop. Each builder is handed a container and a small
// api object; nothing here touches timers or the window manager directly.

import { EMPLOYEES, findEmployee, policiesForDay, FLAVOUR_MAIL } from "./data.js";

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

// ---------------------------------------------------------------------------
// Ticket Desk
// ---------------------------------------------------------------------------

export function buildHelpdesk(body, app) {
  const refresh = () => paintDesk(body, app);
  const tick = () => paintDeskHead(body, app);
  app.register(refresh);
  app.setTick(tick);
  refresh();
}

function paintDesk(body, app) {
  const { state } = app;
  const day = state.day;
  body.innerHTML = "";

  const root = document.createElement("div");
  root.className = "hd";
  root.innerHTML = `
    <div class="hd-head">
      <span>Day <b>${day.n}</b></span>
      <span id="hd-time">${formatClock(state.timeLeft)}</span>
      <div class="hd-bar" id="hd-bar"><i id="hd-fill"></i></div>
      <span id="hd-count"></span>
    </div>
    <div class="hd-main" id="hd-main"></div>`;
  body.append(root);

  const main = root.querySelector("#hd-main");

  if (!state.shiftStarted) {
    main.append(introCard(app));
  } else {
    const pending = day.tickets.filter((t) => !state.resolved.some((r) => r.id === t.id));
    const showingVerdict = state.selected && state.resolved.some((r) => r.id === state.selected);
    if (!pending.length && !showingVerdict) {
      main.append(completeCard(app));
    } else {
      main.append(queueList(app));
      const detail = document.createElement("div");
      detail.className = "hd-detail";
      detail.append(state.selected ? ticketView(app, state.selected) : queueEmpty());
      main.append(detail);
    }
  }

  paintDeskHead(body, app);
}

function paintDeskHead(body, app) {
  const { state } = app;
  const day = state.day;
  const fill = body.querySelector("#hd-fill");
  if (!fill) return;
  fill.style.width = `${(state.timeLeft / day.seconds) * 100}%`;
  const bar = body.querySelector("#hd-bar");
  bar.classList.toggle("low", state.timeLeft / day.seconds < 0.25);
  body.querySelector("#hd-time").textContent = formatClock(state.timeLeft);
  const done = state.resolved.length;
  body.querySelector("#hd-count").textContent = `${done}/${day.tickets.length}`;
}

function introCard(app) {
  const { state, actions } = app;
  const el = document.createElement("div");
  el.className = "empty";
  el.innerHTML = `
    <div>
      <div style="font-size:30px">🎫</div>
      <h3>Day ${state.day.n} — ${state.day.tickets.length} open tickets</h3>
      <p>Read the briefing in Mail, keep the Policy Handbook open, and check the Directory before you answer.</p>
      <button class="btn primary" id="start-shift">Start shift</button>
    </div>`;
  el.querySelector("#start-shift").addEventListener("click", () => actions.startShift());
  return el;
}

function completeCard(app) {
  const { state, actions } = app;
  const el = document.createElement("div");
  el.className = "empty";
  const left = state.day.tickets.length - state.resolved.length;
  el.innerHTML = `
    <div>
      <div style="font-size:30px">${state.timeLeft > 0 ? "📭" : "⏰"}</div>
      <h3>${state.timeLeft > 0 ? "Queue empty" : "That's the clock"}</h3>
      <p>${
        left
          ? `${left} ticket${left === 1 ? "" : "s"} still open. They will roll over to tomorrow, and somebody will be annoyed about it.`
          : "Every ticket answered. Marge will want a word."
      }</p>
      <button class="btn primary" id="end-shift">End shift</button>
    </div>`;
  el.querySelector("#end-shift").addEventListener("click", () => actions.endShift());
  return el;
}

function queueList(app) {
  const { state, actions } = app;
  const wrap = document.createElement("div");
  wrap.className = "hd-queue";
  for (const t of state.day.tickets) {
    const rec = state.resolved.find((r) => r.id === t.id);
    const b = document.createElement("button");
    b.className = `qitem${state.selected === t.id ? " sel" : ""}`;
    b.innerHTML = `<span class="st ${rec ? (rec.correct ? "ok" : "bad") : ""}">${
      rec ? (rec.correct ? "✓" : "✗") : "•"
    }</span><span class="who">${esc(t.from)}</span>`;
    b.addEventListener("click", () => actions.select(t.id));
    wrap.append(b);
  }
  return wrap;
}

function queueEmpty() {
  const el = document.createElement("div");
  el.className = "empty";
  el.innerHTML = `<p class="muted">Pick a ticket on the left.</p>`;
  return el;
}

function ticketView(app, id) {
  const { state, actions } = app;
  const t = state.day.tickets.find((x) => x.id === id);
  const person = findEmployee(t.from);
  const email = t.email || person?.email || "unknown";
  const outcome = state.resolved.find((r) => r.id === id);
  const el = document.createElement("div");
  el.className = "ticket";

  const outside = !/@halcyon\.co$/i.test(email);
  el.innerHTML = `
    <div class="meta">
      <div>From: <b>${esc(t.from)}</b> &lt;${esc(email)}&gt;</div>
      <div>Ticket #${t.id} · <span class="muted">priority normal</span></div>
    </div>
    <h3>${esc(t.subject)}</h3>
    <div class="body${outside ? " warn-mail" : ""}">${esc(t.body)}</div>`;

  if (!outcome) {
    const actionsRow = document.createElement("div");
    actionsRow.className = "actions";
    const make = (label, choice, cls) => {
      const b = document.createElement("button");
      b.className = `btn ${cls}`;
      b.textContent = label;
      b.addEventListener("click", () => actions.answer(id, choice));
      return b;
    };
    actionsRow.append(
      make("Approve", "approve", "ok"),
      make("Deny", "deny", "no"),
      make("Escalate", "escalate", "esc"),
    );
    el.append(actionsRow);
  } else {
    const v = document.createElement("div");
    v.className = `verdict ${outcome.correct ? "good" : "bad"}`;
    const picked = { approve: "Approved", deny: "Denied", escalate: "Escalated" }[outcome.choice];
    const right = { approve: "Approve", deny: "Deny", escalate: "Escalate" }[t.answer];
    v.innerHTML = outcome.correct
      ? `<b>✔ Correct — ${picked.toLowerCase()}</b>${esc(t.why)}`
      : `<b>✘ Not quite — you ${picked.toLowerCase()}</b>${esc(t.why)}<br><span class="muted tiny">The right call was <b>${right}</b>. Trust −12.</span>`;
    el.append(v);

    const next = document.createElement("div");
    next.className = "actions";
    const b = document.createElement("button");
    b.className = "btn primary";
    const remaining = state.day.tickets.filter((x) => !state.resolved.some((r) => r.id === x.id));
    b.textContent = remaining.length ? "Next ticket →" : "Finish shift";
    b.addEventListener("click", () => (remaining.length ? actions.next() : actions.endShift()));
    next.append(b);
    el.append(next);
  }
  return el;
}

// ---------------------------------------------------------------------------
// Directory
// ---------------------------------------------------------------------------

export function buildDirectory(body, app) {
  let query = "";
  const paint = () => {
    body.innerHTML = "";
    const root = document.createElement("div");
    root.className = "dir";
    root.innerHTML = `
      <div class="dir-top">
        <input id="staff-q" placeholder="Search staff, department, employment type…" value="${esc(query)}">
      </div>
      <div style="flex:1;overflow:auto">
        <table class="staff">
          <thead><tr><th>Name</th><th>Department</th><th>Type</th><th>Email</th><th>Remote</th></tr></thead>
          <tbody id="staff-rows"></tbody>
        </table>
      </div>`;
    body.append(root);

    const term = query.trim().toLowerCase();
    const rows = EMPLOYEES.filter((e) =>
      `${e.name} ${e.dept} ${e.type} ${e.email}`.toLowerCase().includes(term),
    );
    const tagCls = { "Full-time": "ft", Contractor: "ct", Intern: "in" };
    root.querySelector("#staff-rows").innerHTML = rows
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

    const input = root.querySelector("#staff-q");
    input.addEventListener("input", (ev) => {
      query = ev.target.value;
      paint();
      const again = body.querySelector("#staff-q");
      again.focus();
      again.setSelectionRange(query.length, query.length);
    });
  };
  paint();
}

// ---------------------------------------------------------------------------
// Handbook
// ---------------------------------------------------------------------------

export function buildHandbook(body, app) {
  let selected = null;
  const paint = () => {
    const { state } = app;
    const policies = policiesForDay(state.day.n);
    if (!policies.some((p) => p.id === selected)) selected = policies[0].id;
    const current = policies.find((p) => p.id === selected);
    body.innerHTML = "";
    const root = document.createElement("div");
    root.className = "book";
    const nav = document.createElement("nav");
    for (const p of policies) {
      const b = document.createElement("button");
      b.className = p.id === selected ? "sel" : "";
      b.textContent = `${p.id}. ${p.title}`;
      b.addEventListener("click", () => {
        selected = p.id;
        paint();
      });
      nav.append(b);
    }
    const art = document.createElement("article");
    art.innerHTML = `
      <div class="pnum">IT Policy Handbook · rev ${state.day.n}.0${
        current.day === state.day.n && state.day.n > 1 ? '<span class="new">new today</span>' : ""
      }</div>
      <h3>${current.id}. ${esc(current.title)}</h3>
      <ul>${current.lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
      <p class="muted tiny" style="margin-top:16px">If a ticket is not covered by a rule, escalate it. Policy 0, section 1, paragraph "use your judgment".</p>`;
    root.append(nav, art);
    body.append(root);
  };
  paint();
}

// ---------------------------------------------------------------------------
// Mail
// ---------------------------------------------------------------------------

export function buildMail(body, app) {
  let selected = 0;
  const paint = () => {
    const { state } = app;
    const memo = state.day.memo;
    const mails = [
      { from: memo.from, role: memo.role, subject: memo.subject, lines: memo.lines, briefing: true },
      ...FLAVOUR_MAIL.map((m) => ({ ...m, role: "Company-wide", briefing: false })),
    ];
    if (selected >= mails.length) selected = 0;
    const m = mails[selected];

    body.innerHTML = "";
    const root = document.createElement("div");
    root.className = "mail";

    const list = document.createElement("div");
    list.className = "mail-list";
    mails.forEach((mail, i) => {
      const b = document.createElement("button");
      b.className = i === selected ? "sel" : "";
      b.innerHTML = `<b>${esc(mail.from)}</b>${esc(mail.subject)}`;
      b.addEventListener("click", () => {
        selected = i;
        paint();
      });
      list.append(b);
    });

    const read = document.createElement("div");
    read.className = "mail-read";
    read.innerHTML = `
      <h3>${esc(m.subject)}</h3>
      <div class="from">${esc(m.from)} · ${esc(m.role)} · to you</div>
      ${m.lines.map((l) => `<p>${esc(l)}</p>`).join("")}
      ${
        m.briefing && state.day.n > 1
          ? `<div class="newrule"><b>Policy update:</b> Policy ${state.day.n + 4} is now in the handbook. It applies from today.</div>`
          : ""
      }`;
    root.append(list, read);
    body.append(root);
  };
  paint();
}
