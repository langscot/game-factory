// One clock for the whole desktop. The platform owns the animation frame; apps
// subscribe. Nothing ticks while the tab is hidden, and delayed operations
// (installs, restarts) are scheduled here rather than with setTimeout.

import { createRng } from "./rng.js";

const MAX_FRAME = 0.25;
const SHIFT_START = 9 * 60;
const SHIFT_MINUTES = 8 * 60;

// How long a job takes, before the hardware tier scales it down.
const DELAYS = {
  passwordReset: 1.5,
  restartService: 3,
  installSoftware: 6,
  shareChange: 1,
};

export function createClock({ store, seed }) {
  let rng = createRng(seed);
  const tickHandlers = new Set();
  const timers = new Set();
  let raf = 0;
  let last = 0;
  let running = false;

  const shift = () => store.state.session.shift;

  /** Shift wall clock, 09:00 → 17:00, driven by the time left in the shift. */
  function timeText() {
    const { remaining, total } = shift();
    if (store.state.session.shift.state === "briefing") return "09:00";
    const fractionLeft = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;
    const minutes = Math.round(SHIFT_START + SHIFT_MINUTES * (1 - fractionLeft));
    const h = Math.floor(minutes / 60) % 24;
    const m = minutes % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  const stamp = () => timeText();

  function onTick(handler) {
    tickHandlers.add(handler);
    return () => tickHandlers.delete(handler);
  }

  /** Run `fn` after `seconds` of visible clock time. Cancelled by unmount. */
  function schedule(seconds, fn) {
    const timer = { left: Math.max(0.05, seconds), fn };
    timers.add(timer);
    return () => timers.delete(timer);
  }

  /** Scheduled work is slower on old hardware. Tier 1 is the slowest. */
  function delayFor(kind) {
    const base = DELAYS[kind] ?? 1;
    const tier = store.state.session.hardwareTier || 1;
    return Number((base * (1.6 - tier * 0.2)).toFixed(2));
  }

  function advance(dt) {
    for (const timer of [...timers]) {
      timer.left -= dt;
      if (timer.left <= 0) {
        timers.delete(timer);
        timer.fn();
      }
    }
    for (const handler of [...tickHandlers]) handler(dt);
  }

  function frame(ts) {
    if (!last) last = ts;
    const dt = Math.min((ts - last) / 1000, MAX_FRAME);
    last = ts;
    if (!document.hidden) advance(dt);
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      last = 0;
    });
  }
  return {
    start,
    stop,
    onTick,
    schedule,
    delayFor,
    timeText,
    stamp,
    random: rng.next,
    float: rng.float,
    int: rng.int,
    pick: rng.pick,
    reseed(value) {
      rng = createRng(value);
    },
    seed: () => store.state.session.seed,
    isRunning: () => shift().state === "running",
  };
}
