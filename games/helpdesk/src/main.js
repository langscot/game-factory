// IT Helpdesk — the game shell. Owns the clock, the day loop and the desktop,
// then hands state to the apps. Read this top to bottom and you have the game.

import { DAYS, COMPANY } from "./data.js";
import { initWindows, openWindow, closeAllWindows, windowList, focusWindow } from "./wm.js";
import { buildHelpdesk, buildDirectory, buildHandbook, buildMail, shiftClock } from "./apps.js";

const TRUST_START = 100;
const TRUST_HIT = 12; // cost of a wrong answer
const MAX_FRAME = 0.25; // seconds; stops the clock jumping when the tab wakes up

const state = {
  trust: TRUST_START,
  dayIndex: 0,
  day: DAYS[0],
  shiftStarted: false,
  shiftRunning: false,
  timeLeft: DAYS[0].seconds,
  resolved: [],
  selected: null,
  ended: false,
  week: { correct: 0, answered: 0 },
};

const els = {
  desktop: document.getElementById("desktop"),
  windows: document.getElementById("windows"),
  icons: document.getElementById("icons"),
  running: document.getElementById("tb-running"),
  start: document.getElementById("start"),
  startGrid: document.getElementById("start-grid"),
  startBtn: document.getElementById("startbtn"),
  tray: document.getElementById("tray"),
  clock: document.getElementById("clock"),
  boot: document.getElementById("boot"),
  signin: document.getElementById("signin"),
  modal: document.getElementById("modal"),
  modalCard: document.getElementById("modal-card"),
};

let helpdeskRefresh = () => {};
let helpdeskTick = () => {};

// ---------------------------------------------------------------------------
// Apps
// ---------------------------------------------------------------------------

const APPS = {
  mail: {
    title: "Mail",
    icon: "✉",
    size: [520, 470],
    pos: [724, 30],
    build: (body) => buildMail(body, appApi()),
  },
  helpdesk: {
    title: "Ticket Desk",
    icon: "🎫",
    size: [600, 545],
    pos: [112, 30],
    build: (body) =>
      buildHelpdesk(body, {
        ...appApi(),
        register: (fn) => (helpdeskRefresh = fn),
        setTick: (fn) => (helpdeskTick = fn),
      }),
  },
  handbook: {
    title: "Policy Handbook",
    icon: "📕",
    size: [540, 500],
    pos: [724, 30],
    build: (body) => buildHandbook(body, appApi()),
  },
  directory: {
    title: "Staff Directory",
    icon: "👥",
    size: [552, 500],
    pos: [724, 30],
    build: (body) => buildDirectory(body, appApi()),
  },
  bin: {
    title: "Recycle Bin",
    icon: "🗑",
    size: [420, 300],
    pos: [330, 130],
    build: (body) => {
      body.innerHTML = `
        <div class="pad">
          <h3 style="margin:0 0 8px;font-size:15px">Recycle Bin</h3>
          <p class="muted tiny">4,102 items. 3.9 GB. Do not ask what is in here.</p>
          <p class="muted tiny">Highlights: <i>final_FINAL_v7.docx</i>, <i>Old VPN tokens (do not open)</i>,
          <i>someone's holiday photos</i>, <i>the 2019 backup we were told to keep</i>.</p>
          <p class="muted tiny">Emptying this is a ticket in itself. A big one.</p>
        </div>`;
    },
  },
};

function appApi() {
  return { state, actions };
}

function openApp(key) {
  const app = APPS[key];
  if (!app) return;
  openWindow({
    id: key,
    title: app.title,
    icon: app.icon,
    width: app.size[0],
    height: app.size[1],
    x: app.pos[0],
    y: app.pos[1],
    build: app.build,
  });
  closeStart();
  renderRunning();
}

// ---------------------------------------------------------------------------
// Actions the apps call
// ---------------------------------------------------------------------------

const actions = {
  startShift() {
    if (state.shiftStarted) return;
    state.shiftStarted = true;
    state.shiftRunning = true;
    state.selected = state.day.tickets[0].id;
    helpdeskRefresh();
    renderRunning();
  },

  select(id) {
    state.selected = id;
    helpdeskRefresh();
  },

  answer(id, choice) {
    if (!state.shiftRunning) return;
    const ticket = state.day.tickets.find((t) => t.id === id);
    if (!ticket || state.resolved.some((r) => r.id === id)) return;
    const correct = choice === ticket.answer;
    state.resolved.push({ id, choice, correct });
    state.week.answered += 1;
    if (correct) state.week.correct += 1;
    else {
      state.trust = Math.max(0, state.trust - TRUST_HIT);
      renderTray();
    }
    state.selected = id;
    helpdeskRefresh();
    renderRunning();
  },

  next() {
    const pending = state.day.tickets.find(
      (t) => !state.resolved.some((r) => r.id === t.id),
    );
    state.selected = pending ? pending.id : null;
    helpdeskRefresh();
  },

  endShift() {
    endDay(state.resolved.length < state.day.tickets.length ? "open" : "done");
  },
};

// ---------------------------------------------------------------------------
// Day loop
// ---------------------------------------------------------------------------

function startDay(index) {
  state.dayIndex = index;
  state.day = DAYS[index];
  state.timeLeft = state.day.seconds;
  state.resolved = [];
  state.selected = null;
  state.shiftStarted = false;
  state.shiftRunning = false;
  state.ended = false;
  if (index === 0) state.week = { correct: 0, answered: 0 };

  closeAllWindows();
  renderTray();
  renderRunning();
  openApp("mail");
  openApp("helpdesk");
  updateClock();
}

function endDay(reason) {
  if (state.ended) return;
  state.ended = true;
  state.shiftRunning = false;

  const total = state.day.tickets.length;
  const answered = state.resolved.length;
  const correct = state.resolved.filter((r) => r.correct).length;
  const missed = total - answered;
  const reset = reason === "time";

  if (state.trust <= 0) {
    showModal(firedModal(correct, answered));
    return;
  }
  if (state.dayIndex >= DAYS.length - 1) {
    showModal(finalModal());
    return;
  }
  showModal(dayModal({ correct, answered, missed, reset }));
}

function dayModal({ correct, answered, missed, reset }) {
  const next = DAYS[state.dayIndex + 1];
  const quotes = {
    1: "“Not bad for a first shift. The queue does not stop for anyone, and neither do we.”",
    2: "“Better. Two more like that and I might learn your name.”",
  };
  const body = `
    <h2>Shift over${reset ? " — clock ran out" : ""}</h2>
    <div class="sub">Day ${state.day.n} · ${COMPANY} IT Service Desk</div>
    ${reset && missed ? `<p>${missed} ticket${missed === 1 ? "" : "s"} left in the queue. They will be waiting tomorrow, with opinions.</p>` : ""}
    <div class="stats">
      <div class="stat"><b>${correct}/${answered}</b><span>correct</span></div>
      <div class="stat"><b>${state.trust}</b><span>trust</span></div>
      <div class="stat"><b>${answered - correct}</b><span>mistakes</span></div>
      <div class="stat"><b>${missed}</b><span>left open</span></div>
    </div>
    <div class="quote">${quotes[state.day.n] || "“See you tomorrow.”"}</div>
    <p class="muted tiny">Day ${next.n} adds a new memo and ${next.tickets.length} more tickets.</p>
    <div class="row"><button class="btn primary" id="modal-next">Start day ${next.n}</button></div>`;
  return {
    html: body,
    wire: (card) => {
      card.querySelector("#modal-next").addEventListener("click", () => {
        hideModal();
        startDay(state.dayIndex + 1);
      });
    },
  };
}

function firedModal(correct, answered) {
  return {
    html: `
      <h2>Escorted out</h2>
      <div class="sub">Trust reached zero · Day ${state.day.n}</div>
      <p>Security is waiting by the lift with a cardboard box and an unmarked envelope. Your badge stops working at 17:01.</p>
      <div class="stats">
        <div class="stat"><b>${correct}/${answered}</b><span>correct</span></div>
        <div class="stat"><b>0</b><span>trust</span></div>
      </div>
      <p class="muted tiny">The handbook was right there the whole time.</p>
      <div class="row"><button class="btn primary" id="modal-restart">Try again</button></div>`,
    wire: (card) => {
      card.querySelector("#modal-restart").addEventListener("click", () => {
        hideModal();
        state.trust = TRUST_START;
        startDay(0);
      });
    },
  };
}

function finalModal() {
  const trust = state.trust;
  const weekCorrect = state.week.correct;
  const weekAnswered = state.week.answered;
  let title = "Performance review";
  let quote = "";
  if (trust >= 88) {
    title = "You keep the chair";
    quote = "“Twenty minutes in and you already know the handbook better than I do. Don't let it go to your head.”";
  } else if (trust >= 64) {
    title = "Permanent probation";
    quote = "“Adequate. I have written 'adequate' on the form. It is the nicest thing I have written all year.”";
  } else {
    title = "Kept on. Barely.";
    quote = "“We are short-staffed, you are still breathing, and the queue is not going to answer itself.”";
  }
  return {
    html: `
      <h2>${title}</h2>
      <div class="sub">End of week · ${COMPANY} IT Service Desk</div>
      <div class="stats">
        <div class="stat"><b>${weekCorrect}/${weekAnswered}</b><span>correct, all week</span></div>
        <div class="stat"><b>${trust}</b><span>trust</span></div>
      </div>
      <div class="quote">${quote}</div>
      <p class="muted tiny">Thanks for playing. The wiki password is the same as last quarter's.</p>
      <div class="row"><button class="btn primary" id="modal-restart">Play again</button></div>`,
    wire: (card) => {
      card.querySelector("#modal-restart").addEventListener("click", () => {
        hideModal();
        state.trust = TRUST_START;
        startDay(0);
      });
    },
  };
}

// ---------------------------------------------------------------------------
// Chrome: icons, taskbar, clock
// ---------------------------------------------------------------------------

function renderDesktop() {
  els.icons.innerHTML = "";
  for (const key of ["helpdesk", "mail", "handbook", "directory", "bin"]) {
    const app = APPS[key];
    const b = document.createElement("button");
    b.className = "icon";
    b.innerHTML = `<i>${app.icon}</i><b>${app.title}</b>`;
    b.addEventListener("click", () => openApp(key));
    els.icons.append(b);
  }

  els.startGrid.innerHTML = "";
  for (const key of ["helpdesk", "mail", "handbook", "directory"]) {
    const app = APPS[key];
    const b = document.createElement("button");
    b.className = "start-app";
    b.innerHTML = `<i>${app.icon}</i>${app.title}`;
    b.addEventListener("click", () => openApp(key));
    els.startGrid.append(b);
  }
}

function renderRunning() {
  els.running.innerHTML = "";
  for (const win of windowList()) {
    const b = document.createElement("button");
    b.className = `tb-task${win.el.classList.contains("is-focused") && !win.minimized ? " is-active" : ""}`;
    b.innerHTML = `${win.icon}<span>${win.title}</span>`;
    b.addEventListener("click", () => focusWindow(win.id));
    els.running.append(b);
  }
}

function renderTray() {
  els.tray.innerHTML = `<span>Trust</span> <b>${state.trust}</b>`;
  els.tray.classList.toggle("low", state.trust <= 40);
}

function updateClock() {
  const running = state.shiftStarted && !state.ended;
  const fraction = running ? state.timeLeft / state.day.seconds : 1;
  els.clock.textContent = running ? shiftClock(fraction) : "09:00";
}

function toggleStart(force) {
  const open = force ?? els.start.hidden;
  els.start.hidden = !open;
  els.startBtn.classList.toggle("is-active", open);
  els.startBtn.setAttribute("aria-expanded", String(open));
  if (open) {
    const closer = (ev) => {
      if (!els.start.contains(ev.target) && !els.startBtn.contains(ev.target)) {
        closeStart();
        document.removeEventListener("pointerdown", closer, true);
      }
    };
    setTimeout(() => document.addEventListener("pointerdown", closer, true), 0);
  }
}

function closeStart() {
  els.start.hidden = true;
  els.startBtn.classList.remove("is-active");
  els.startBtn.setAttribute("aria-expanded", "false");
}

function showModal(spec) {
  els.modalCard.innerHTML = spec.html;
  els.modal.hidden = false;
  if (spec.wire) spec.wire(els.modalCard);
}

function hideModal() {
  els.modal.hidden = true;
  els.modalCard.innerHTML = "";
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

function boot() {
  initWindows({ stage: els.windows, onChange: renderRunning });
  renderDesktop();
  renderTray();
  renderRunning();

  els.startBtn.addEventListener("click", () => toggleStart());
  els.signin.addEventListener("click", begin);
  window.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && !els.boot.classList.contains("gone")) begin();
    if (ev.key === "Escape") closeStart();
  });

  let last = 0;
  const frame = (ts) => {
    if (!last) last = ts;
    const dt = Math.min((ts - last) / 1000, MAX_FRAME);
    last = ts;
    if (state.shiftRunning && !state.ended && !document.hidden) {
      state.timeLeft = Math.max(0, state.timeLeft - dt);
      helpdeskTick();
      updateClock();
      if (state.timeLeft <= 0) endDay("time");
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  document.addEventListener("visibilitychange", () => {
    last = 0;
  });
}

function begin() {
  if (els.boot.classList.contains("gone")) return;
  els.boot.classList.add("gone");
  setTimeout(() => els.boot.remove(), 400);
  startDay(0);
}

boot();

// `?debug` exposes state for poking at the console; the answer key is in there,
// so it stays off by default.
if (location.search.includes("debug")) window.helpdesk = { state, DAYS };


