// Game shell glue: builds the shared world, registers the apps, starts the one
// clock and owns the day loop. Everything else lives in the world or an app.

import { createWorld } from "./world/index.js";
import { registerBuiltinApps } from "./apps/index.js";
import { initShell, openApp, closeAllApps, toast } from "./shell.js";
import { showDialog, hideDialog } from "./ui/dialog.js";
import { COMPANY } from "./content/company.js";
import { freshStart, getPrefs, savePrefs } from "./prefs.js";

// `?fresh` throws the profile away before anything reads it. The shell shows
// the out-of-box experience when there is no account, so this is the whole
// first-run test switch.
freshStart();

const world = createWorld();
// Tier, bonus and purchases live in prefs so a reload keeps the machine you
// paid for. The session is still the source of truth while the game runs.
world.session.hydrateCareer(getPrefs().career);
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

// The store calls these like any other action. They live here because the
// economy methods belong to the session, not to an app.
Object.assign(platform.actions, {
  buyHardware: (tier) => world.session.buyHardware(tier),
  buyCosmetic: (itemId) => world.session.buyCosmetic(itemId),
});

initShell(platform);
world.clock.start();

function persistCareer() {
  savePrefs({ career: world.session.careerSnapshot() });
}

world.events.on("session:career-changed", persistCareer);
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
  openApp("browser", { url: "http://servicedesk.halcyon.co/" });
  const overview = world.world.session.overview();
  const briefing = world.world.mail.inbox(day).find((message) => message.briefing);
  toast(
    "Service Desk",
    `Day ${day}: ${overview.total} tickets waiting, 1 new message from ${briefing?.from || "Marge Delacroix"}.`,
    "browser",
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
      ${payslipMarkup(summary.payslip)}
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
        restoreCareer();
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
      ${payslipMarkup(summary.payslip)}
      <div class="quote">${quote}</div>
      <p class="muted tiny">Another week survived. The wiki password is the same as last quarter's.</p>
      <div class="row"><button class="btn primary" id="modal-restart">Start over</button></div>`,
    wire: (card) =>
      card.querySelector("#modal-restart").addEventListener("click", () => {
        hideAnd();
        world.actions.resetWorld();
        restoreCareer();
        startDay(1);
      }),
  });
}

function hideAnd() {
  hideDialog();
}

function money(value) {
  const amount = Math.abs(Number(value) || 0);
  return `${Number(value) < 0 ? "−" : ""}£${amount.toFixed(2).replace(/\.00$/, "")}`;
}

function payslipMarkup(slip) {
  if (!slip) return "";
  return `
    <div class="payslip">
      <div class="payslip-head"><span>Performance bonus · Day ${slip.day}</span><span>Halcyon Dynamics</span></div>
      ${slip.lines.map((line) => `<div class="payslip-line"><span>${line.label}</span><b>${money(line.amount)}</b></div>`).join("")}
      <div class="payslip-line muted"><span>Salary (flavour, not spendable)</span><b>${money(slip.salary)}</b></div>
      <div class="payslip-total"><span>Added to the bonus balance</span><b>${money(slip.bonus)}</b></div>
      <div class="payslip-balance">Balance ${money(slip.balance)} · spend it in The IT Cupboard</div>
    </div>`;
}

function restoreCareer() {
  world.session.hydrateCareer(getPrefs().career);
}

// `?debug` exposes the world for poking at the console; it holds the answer
// key, so it stays off unless asked for.
if (location.search.includes("debug")) {
  window.helpdesk = { world, createWorld, platform };
}
