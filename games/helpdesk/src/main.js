// Game shell glue: builds the shared world, registers the apps, starts the one
// clock and owns the day loop. Everything else lives in the world or an app.

import { createWorld } from "./world/index.js";
import { registerBuiltinApps } from "./apps/index.js";
import { initShell, openApp, closeAllApps, toast } from "./shell.js";
import { showDialog, hideDialog } from "./ui/dialog.js";
import { COMPANY } from "./content/company.js";

const world = createWorld();
registerBuiltinApps();

const platform = {
  world: world.world,
  actions: world.actions,
  events: world.events,
  clock: world.clock,
  session: world.session,
  toast,
  onSignIn: () => startDay(world.world.session.day()),
};

initShell(platform);
world.clock.start();

world.events.on("session:shift-ended", (event) => showShiftEnd(event.data));
world.clock.onTick((dt) => {
  world.session.tick(dt);
});

// ---------------------------------------------------------------------------
// day loop
// ---------------------------------------------------------------------------

function startDay(day) {
  closeAllApps();
  openApp("mail");
  openApp("ticketdesk");
  const overview = world.world.session.overview();
  const briefing = world.world.mail.inbox(day).find((message) => message.briefing);
  toast(
    "Ticket Desk",
    `Day ${day}: ${overview.total} tickets waiting, 1 new message from ${briefing?.from || "Marge Delacroix"}.`,
    "ticket",
  );
}

function showShiftEnd(summary) {
  if (!summary) return;
  if (summary.trust <= 0) {
    showFired(summary);
    return;
  }
  if (summary.day >= world.world.session.maxDay()) {
    showFinal(summary);
    return;
  }
  showDaySummary(summary);
}

function showDaySummary(summary) {
  const nextDay = summary.day + 1;
  const quotes = {
    1: "“Not bad for a first shift. The queue does not stop for anyone, and neither do we.”",
    2: "“Better. Two more like that and I might learn your name.”",
  };
  showDialog({
    html: `
      <h2>Shift over${summary.reason === "time" ? " — clock ran out" : ""}</h2>
      <div class="sub">Day ${summary.day} · ${COMPANY} IT Service Desk</div>
      ${
        summary.missed
          ? `<p>${summary.missed} ticket${summary.missed === 1 ? "" : "s"} left in the queue. They will be waiting tomorrow, with opinions.</p>`
          : ""
      }
      <div class="stats">
        <div class="stat"><b>${summary.correct}/${summary.answered}</b><span>correct</span></div>
        <div class="stat"><b>${summary.trust}</b><span>trust</span></div>
        <div class="stat"><b>${summary.answered - summary.correct}</b><span>mistakes</span></div>
        <div class="stat"><b>${summary.missed}</b><span>left open</span></div>
      </div>
      <div class="quote">${quotes[summary.day] || "“See you tomorrow.”"}</div>
      <p class="muted tiny">Anything left open rolls over to tomorrow.</p>
      <div class="row"><button class="btn primary" id="modal-next">Start day ${nextDay}</button></div>`,
    wire: (card) =>
      card.querySelector("#modal-next").addEventListener("click", () => {
        hideAnd();
        const result = world.actions.nextDay();
        if (result.ok) startDay(result.day);
      }),
  });
}

function showFired(summary) {
  showDialog({
    html: `
      <h2>Escorted out</h2>
      <div class="sub">Trust reached zero · Day ${summary.day}</div>
      <p>Security is waiting by the lift with a cardboard box and an unmarked envelope. Your badge stops working at 17:01.</p>
      <div class="stats">
        <div class="stat"><b>${summary.correct}/${summary.answered}</b><span>correct</span></div>
        <div class="stat"><b>0</b><span>trust</span></div>
      </div>
      <p class="muted tiny">The handbook was right there the whole time.</p>
      <div class="row"><button class="btn primary" id="modal-restart">Try again</button></div>`,
    wire: (card) =>
      card.querySelector("#modal-restart").addEventListener("click", () => {
        hideAnd();
        world.actions.resetWorld();
        startDay(1);
      }),
  });
}

function showFinal(summary) {
  const week = world.world.session.week();
  const trust = summary.trust;
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
  showDialog({
    html: `
      <h2>${title}</h2>
      <div class="sub">End of week · ${COMPANY} IT Service Desk</div>
      <div class="stats">
        <div class="stat"><b>${week.correct}/${week.answered}</b><span>correct, all week</span></div>
        <div class="stat"><b>${trust}</b><span>trust</span></div>
      </div>
      <div class="quote">${quote}</div>
      <p class="muted tiny">Another week survived. The wiki password is the same as last quarter's.</p>
      <div class="row"><button class="btn primary" id="modal-restart">Start over</button></div>`,
    wire: (card) =>
      card.querySelector("#modal-restart").addEventListener("click", () => {
        hideAnd();
        world.actions.resetWorld();
        startDay(1);
      }),
  });
}

function hideAnd() {
  hideDialog();
}

// `?debug` exposes the world for poking at the console; it holds the answer
// key, so it stays off unless asked for.
if (location.search.includes("debug")) {
  window.helpdesk = { world, createWorld, platform };
}
