// Game shell glue: owns the shift clock, the day loop and the prompts, and
// wires the game's actions into the desktop apps.

import { DAYS, COMPANY } from "./data.js";
import { initShell, openApp, closeAllApps, toast, signIn } from "./shell.js";
import { shiftClock } from "./apps.js";

const TRUST_START = 100;
const TRUST_HIT = 12;
const MAX_FRAME = 0.25;

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

let helpdeskRefresh = () => {};
let helpdeskTick = () => {};

const els = {
  modal: document.getElementById("modal"),
  modalCard: document.getElementById("modalCard"),
};

// ---------------------------------------------------------------------------
// actions
// ---------------------------------------------------------------------------

const actions = {
  startShift() {
    if (state.shiftStarted) return;
    state.shiftStarted = true;
    state.shiftRunning = true;
    state.selected = state.day.tickets[0].id;
    helpdeskRefresh();
    toast("Ticket Desk", `Shift started. ${state.day.tickets.length} tickets in the queue.`, "ticket");
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
    else state.trust = Math.max(0, state.trust - TRUST_HIT);
    state.selected = id;
    helpdeskRefresh();
    syncTrust();
  },

  next() {
    const pending = state.day.tickets.find((t) => !state.resolved.some((r) => r.id === t.id));
    state.selected = pending ? pending.id : null;
    helpdeskRefresh();
  },

  endShift() {
    endDay(state.resolved.length < state.day.tickets.length ? "open" : "done");
  },
};

const api = {
  state,
  actions,
  open: openApp,
  toast,
  setRefresh: (fn) => (helpdeskRefresh = fn),
  setTick: (fn) => (helpdeskTick = fn),
  alert: (title, text) => showAlert(title, text),
  clockText: () => {
    if (!state.shiftStarted || state.ended) return "09:00";
    return shiftClock(state.timeLeft / state.day.seconds);
  },
  onSignIn: () => startDay(0),
};

// ---------------------------------------------------------------------------
// day loop
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

  closeAllApps();
  syncTrust();
  openApp("mail");
  openApp("helpdesk");
  toast("Mail", `1 new message from ${state.day.memo.from}.`, "mail");
  toast("Ticket Desk", `${state.day.tickets.length} tickets waiting. Day ${state.day.n}.`, "ticket");
}

function endDay(reason) {
  if (state.ended) return;
  state.ended = true;
  state.shiftRunning = false;

  const total = state.day.tickets.length;
  const answered = state.resolved.length;
  const correct = state.resolved.filter((r) => r.correct).length;
  const missed = total - answered;

  if (state.trust <= 0) {
    showModal(firedModal(correct, answered));
    return;
  }
  if (state.dayIndex >= DAYS.length - 1) {
    showModal(finalModal());
    return;
  }
  showModal(dayModal({ correct, answered, missed, reset: reason === "time" }));
}

function dayModal({ correct, answered, missed, reset }) {
  const next = DAYS[state.dayIndex + 1];
  const quotes = {
    1: "“Not bad for a first shift. The queue does not stop for anyone, and neither do we.”",
    2: "“Better. Two more like that and I might learn your name.”",
  };
  return {
    html: `
      <h2>Shift over${reset ? " — clock ran out" : ""}</h2>
      <div class="sub">Day ${state.day.n} · ${COMPANY} IT Service Desk</div>
      ${
        reset && missed
          ? `<p>${missed} ticket${missed === 1 ? "" : "s"} left in the queue. They will be waiting tomorrow, with opinions.</p>`
          : ""
      }
      <div class="stats">
        <div class="stat"><b>${correct}/${answered}</b><span>correct</span></div>
        <div class="stat"><b>${state.trust}</b><span>trust</span></div>
        <div class="stat"><b>${answered - correct}</b><span>mistakes</span></div>
        <div class="stat"><b>${missed}</b><span>left open</span></div>
      </div>
      <div class="quote">${quotes[state.day.n] || "“See you tomorrow.”"}</div>
      <p class="muted tiny">Day ${next.n} adds a new memo and ${next.tickets.length} more tickets.</p>
      <div class="row"><button class="btn primary" id="modal-next">Start day ${next.n}</button></div>`,
    wire: (card) =>
      card.querySelector("#modal-next").addEventListener("click", () => {
        hideModal();
        startDay(state.dayIndex + 1);
      }),
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
    wire: (card) =>
      card.querySelector("#modal-restart").addEventListener("click", () => {
        hideModal();
        state.trust = TRUST_START;
        startDay(0);
      }),
  };
}

function finalModal() {
  const trust = state.trust;
  let title = "Performance review";
  let quote = "";
  if (trust >= 88) {
    title = "You keep the chair";
    quote = "“Three days in and you know the handbook better than I do. Don't let it go to your head.”";
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
        <div class="stat"><b>${state.week.correct}/${state.week.answered}</b><span>correct, all week</span></div>
        <div class="stat"><b>${trust}</b><span>trust</span></div>
      </div>
      <div class="quote">${quote}</div>
      <p class="muted tiny">Thanks for playing. The wiki password is the same as last quarter's.</p>
      <div class="row"><button class="btn primary" id="modal-restart">Play again</button></div>`,
    wire: (card) =>
      card.querySelector("#modal-restart").addEventListener("click", () => {
        hideModal();
        state.trust = TRUST_START;
        startDay(0);
      }),
  };
}

function showAlert(title, text) {
  showModal({
    html: `<h2>${title}</h2><p>${String(text).split("\n").map((l) => l || "&nbsp;").join("<br>")}</p>
      <div class="row"><button class="btn primary" id="modal-ok">OK</button></div>`,
    wire: (card) => card.querySelector("#modal-ok").addEventListener("click", hideModal),
  });
}

function showModal({ html, wire }) {
  els.modalCard.innerHTML = html;
  els.modal.hidden = false;
  wire?.(els.modalCard);
}

function hideModal() {
  els.modal.hidden = true;
  els.modalCard.innerHTML = "";
}

function syncTrust() {
  document.getElementById("trustValue").textContent = String(state.trust);
  document.getElementById("trustBtn").classList.toggle("low", state.trust <= 40);
}

// ---------------------------------------------------------------------------

function boot() {
  initShell(api);

  let last = 0;
  const frame = (ts) => {
    if (!last) last = ts;
    const dt = Math.min((ts - last) / 1000, MAX_FRAME);
    last = ts;
    if (state.shiftRunning && !state.ended && !document.hidden) {
      state.timeLeft = Math.max(0, state.timeLeft - dt);
      helpdeskTick();
      if (state.timeLeft <= 0) endDay("time");
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  document.addEventListener("visibilitychange", () => {
    last = 0;
  });

  // `?debug` exposes state for poking at the console; it holds the answer key,
  // so it stays off unless asked for.
  if (location.search.includes("debug")) window.helpdesk = { state, DAYS, signIn, api };
}

boot();
